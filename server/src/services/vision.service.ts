import { config } from '../config/index.js'

export interface VisionResult {
  text: string
  structured?: Record<string, unknown>
}

export interface DrugInfo {
  name: string
  genericName?: string
  manufacturer?: string
  approvalNumber?: string
  specification?: string
  ingredients?: string[]
  indications?: string
  contraindications?: string
  sideEffects?: string
  usage?: string
  storage?: string
}

export interface ReportItem {
  name: string
  value: string
  unit?: string
  referenceRange?: string
  isAbnormal?: boolean
  note?: string
}

export interface ReportInfo {
  patientName?: string
  reportDate?: string
  reportType?: string
  items: ReportItem[]
  abnormalItems: ReportItem[]
  summary?: string
}

export class VisionService {
  private apiKey: string | undefined
  private baseUrl: string
  private visionModel: string
  private ocrModel: string

  constructor() {
    this.apiKey = config.qwen.apiKey
    this.baseUrl = config.qwen.baseUrl
    this.visionModel = config.qwen.models.vision
    this.ocrModel = config.qwen.models.ocr
  }

  private hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.length > 0
  }

  async recognizeDrug(imageBase64: string): Promise<DrugInfo> {
    if (!this.hasApiKey()) {
      throw new Error('QWEN_API_KEY is not configured')
    }

    const prompt = `请识别这张药盒图片，提取以下信息并以JSON格式返回：
{
  "name": "药品名称",
  "genericName": "通用名（如有）",
  "manufacturer": "生产厂家",
  "approvalNumber": "批准文号",
  "specification": "规格",
  "ingredients": ["成分1", "成分2"],
  "indications": "适应症",
  "contraindications": "禁忌症",
  "sideEffects": "副作用",
  "usage": "用法用量",
  "storage": "储存条件"
}

请仔细识别药盒上的所有文字信息，如果某项信息无法识别，请填null。只返回JSON，不要其他说明文字。`

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.visionModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Vision API failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as DrugInfo
        }
      } catch {
        console.error('Failed to parse drug info JSON')
      }

      return {
        name: content,
        ingredients: [],
      }
    } catch (error) {
      console.error('Drug recognition error:', error)
      throw error
    }
  }

  async extractReportText(imageBase64: string): Promise<string> {
    if (!this.hasApiKey()) {
      throw new Error('QWEN_API_KEY is not configured')
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.ocrModel,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: '请识别这张体检报告图片中的所有文字内容，保持原有的格式和结构。' },
                { type: 'image_url', image_url: { url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4096,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OCR API failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    } catch (error) {
      console.error('Report OCR error:', error)
      throw error
    }
  }

  async parseReportItems(reportText: string): Promise<ReportInfo> {
    if (!this.hasApiKey()) {
      throw new Error('QWEN_API_KEY is not configured')
    }

    const prompt = `请解析以下体检报告文本，提取所有检验指标并以JSON格式返回：
报告文本：
${reportText}

返回格式：
{
  "patientName": "患者姓名",
  "reportDate": "报告日期",
  "reportType": "报告类型",
  "items": [
    {
      "name": "指标名称",
      "value": "检测值",
      "unit": "单位",
      "referenceRange": "参考范围",
      "isAbnormal": true/false,
      "note": "备注"
    }
  ],
  "abnormalItems": [异常指标数组],
  "summary": "报告摘要"
}

只返回JSON，不要其他说明文字。`

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: config.qwen.models.complex,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 2048,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Parse API failed: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ReportInfo
        }
      } catch {
        console.error('Failed to parse report JSON')
      }

      return {
        items: [],
        abnormalItems: [],
        summary: content,
      }
    } catch (error) {
      console.error('Report parsing error:', error)
      throw error
    }
  }

  async analyzeReport(imageBase64: string): Promise<ReportInfo> {
    const reportText = await this.extractReportText(imageBase64)
    return await this.parseReportItems(reportText)
  }

  async analyzeImage(imageBase64: string, type: 'drug' | 'report'): Promise<DrugInfo | ReportInfo> {
    if (type === 'drug') {
      return await this.recognizeDrug(imageBase64)
    } else {
      return await this.analyzeReport(imageBase64)
    }
  }
}
