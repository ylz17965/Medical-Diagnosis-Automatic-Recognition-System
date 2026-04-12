interface LungNodule {
  id: string
  patientId: string
  size: number
  location: string
  type: 'solid' | 'subsolid' | 'ground_glass' | 'calcified'
  malignancyRisk: number
  management: string
  followUpInterval: string
  createdAt: string
}

interface TNMStaging {
  tnmStage: string
  clinicalStage: string
  description: string
  prognosis: {
    fiveYearSurvival: number
    medianSurvival: string
  }
  treatmentOptions: string[]
}

interface ScreeningPlan {
  patientId: string
  riskLevel: 'low' | 'moderate' | 'high'
  recommendation: string
  screeningMethod: string
  interval: string
  nextScreeningDate: string
  riskFactors: string[]
}

interface TreatmentRecommendation {
  mutation: string
  firstLine: string[]
  secondLine: string[]
  clinicalTrials: string[]
  evidenceLevel: string
  guidelines: string[]
}

interface NoduleAnalysis {
  noduleId: string
  malignancyRisk: number
  riskCategory: 'very_low' | 'low' | 'moderate' | 'high'
  management: {
    recommendation: string
    followUp: string
    biopsy: boolean
    biopsyMethod?: string
  }
  fleischnerGuideline: string
}

const LUNG_CANCER_GUIDELINES = {
  fleischner2025: {
    solid: [
      { sizeMax: 6, risk: 'very_low', followUp: 'no_follow_up', recommendation: '无需随访' },
      { sizeMax: 8, risk: 'low', followUp: '12_months', recommendation: '12个月后CT复查' },
      { sizeMax: 15, risk: 'moderate', followUp: '6_months', recommendation: '6个月后CT复查' },
      { sizeMax: Infinity, risk: 'high', followUp: '3_months', recommendation: '3个月后CT复查或活检' }
    ],
    subsolid: [
      { sizeMax: 6, risk: 'very_low', followUp: 'no_follow_up', recommendation: '无需随访' },
      { sizeMax: 10, risk: 'low', followUp: '12_months', recommendation: '12个月后CT复查' },
      { sizeMax: 20, risk: 'moderate', followUp: '6_months', recommendation: '6个月后CT复查' },
      { sizeMax: Infinity, risk: 'high', followUp: '3_months', recommendation: '3个月后CT复查或活检' }
    ],
    ground_glass: [
      { sizeMax: 10, risk: 'low', followUp: '12_months', recommendation: '12个月后CT复查' },
      { sizeMax: 20, risk: 'moderate', followUp: '6_months', recommendation: '6个月后CT复查' },
      { sizeMax: Infinity, risk: 'high', followUp: '3_months', recommendation: '3个月后CT复查或活检' }
    ],
    calcified: [
      { sizeMax: Infinity, risk: 'very_low', followUp: 'no_follow_up', recommendation: '钙化结节通常为良性，无需随访' }
    ]
  },
  nccn2025: {
    screening: {
      ageMin: 50,
      smokingPackYearsMin: 20,
      currentOrFormerSmoker: true,
      screeningMethod: 'LDCT',
      interval: 'annual'
    }
  }
}

const TNM_STAGING_TABLE: Record<string, TNMStaging> = {
  'T1N0M0': {
    tnmStage: 'T1N0M0',
    clinicalStage: 'IA',
    description: '肿瘤最大径≤3cm，无淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.92, medianSurvival: '10年以上' },
    treatmentOptions: ['手术切除', '立体定向放疗(SBRT)', '密切随访']
  },
  'T2N0M0': {
    tnmStage: 'T2N0M0',
    clinicalStage: 'IB',
    description: '肿瘤最大径>3cm且≤5cm，无淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.78, medianSurvival: '8年以上' },
    treatmentOptions: ['手术切除', '辅助化疗', '立体定向放疗(SBRT)']
  },
  'T1N1M0': {
    tnmStage: 'T1N1M0',
    clinicalStage: 'IIA',
    description: '肿瘤最大径≤3cm，同侧肺门淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.65, medianSurvival: '5年以上' },
    treatmentOptions: ['手术切除', '辅助化疗', '放疗']
  },
  'T2N1M0': {
    tnmStage: 'T2N1M0',
    clinicalStage: 'IIB',
    description: '肿瘤最大径>3cm且≤5cm，同侧肺门淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.56, medianSurvival: '4年以上' },
    treatmentOptions: ['手术切除', '辅助化疗', '放疗', '免疫治疗']
  },
  'T3N0M0': {
    tnmStage: 'T3N0M0',
    clinicalStage: 'IIB',
    description: '肿瘤最大径>5cm且≤7cm，无淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.48, medianSurvival: '3年以上' },
    treatmentOptions: ['手术切除', '新辅助化疗', '辅助化疗', '放疗']
  },
  'T3N1M0': {
    tnmStage: 'T3N1M0',
    clinicalStage: 'IIIA',
    description: '肿瘤最大径>5cm且≤7cm，同侧肺门淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.36, medianSurvival: '2年以上' },
    treatmentOptions: ['新辅助化疗+手术', '同步放化疗', '免疫治疗']
  },
  'T4N0M0': {
    tnmStage: 'T4N0M0',
    clinicalStage: 'IIIA',
    description: '肿瘤最大径>7cm或侵犯周围结构，无淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.30, medianSurvival: '18个月' },
    treatmentOptions: ['同步放化疗', '免疫治疗', '姑息手术']
  },
  'T4N2M0': {
    tnmStage: 'T4N2M0',
    clinicalStage: 'IIIB',
    description: '肿瘤最大径>7cm，对侧纵隔淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.20, medianSurvival: '14个月' },
    treatmentOptions: ['同步放化疗', '免疫治疗', '靶向治疗(如有突变)']
  },
  'TXN3M0': {
    tnmStage: 'TXN3M0',
    clinicalStage: 'IIIC',
    description: '任何大小肿瘤，锁骨上淋巴结转移，无远处转移',
    prognosis: { fiveYearSurvival: 0.12, medianSurvival: '10个月' },
    treatmentOptions: ['同步放化疗', '免疫治疗', '靶向治疗', '临床试验']
  },
  'TXNXM1': {
    tnmStage: 'TXNXM1',
    clinicalStage: 'IV',
    description: '任何大小肿瘤，任何淋巴结状态，有远处转移',
    prognosis: { fiveYearSurvival: 0.05, medianSurvival: '6个月' },
    treatmentOptions: ['系统治疗', '免疫治疗', '靶向治疗', '姑息放疗', '临床试验']
  }
}

const PRECISION_MEDICINE_DATA: Record<string, TreatmentRecommendation> = {
  'EGFR_exon19del': {
    mutation: 'EGFR 19外显子缺失',
    firstLine: ['奥希替尼(首选)', '吉非替尼', '厄洛替尼', '阿法替尼'],
    secondLine: ['奥希替尼(T790M阳性)', '化疗'],
    clinicalTrials: ['LAURA', 'FLAURA2'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'CSCO 2025', 'ESMO 2024']
  },
  'EGFR_L858R': {
    mutation: 'EGFR L858R突变',
    firstLine: ['奥希替尼(首选)', '吉非替尼', '厄洛替尼', '阿法替尼'],
    secondLine: ['奥希替尼(T790M阳性)', '化疗'],
    clinicalTrials: ['LAURA', 'FLAURA2'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'CSCO 2025', 'ESMO 2024']
  },
  'ALK_fusion': {
    mutation: 'ALK融合',
    firstLine: ['阿来替尼(首选)', '布格替尼', '洛拉替尼', '克唑替尼'],
    secondLine: ['洛拉替尼', '化疗'],
    clinicalTrials: ['ALEX', 'ALTA-1L'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'CSCO 2025']
  },
  'ROS1_fusion': {
    mutation: 'ROS1融合',
    firstLine: ['恩曲替尼(首选)', '克唑替尼', '洛拉替尼'],
    secondLine: ['化疗'],
    clinicalTrials: ['STARTRK', 'PROFILE 1014'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'CSCO 2025']
  },
  'KRAS_G12C': {
    mutation: 'KRAS G12C突变',
    firstLine: ['索托拉西布', '阿达格拉西布', '化疗+免疫治疗'],
    secondLine: ['索托拉西布', '阿达格拉西布'],
    clinicalTrials: ['CodeBreaK 100', 'KRYSTAL-1'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'FDA批准']
  },
  'MET_exon14': {
    mutation: 'MET 14外显子跳跃突变',
    firstLine: ['特泊替尼', '卡马替尼'],
    secondLine: ['化疗'],
    clinicalTrials: ['VISION', 'GEOMETRY mono-1'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'FDA批准']
  },
  'RET_fusion': {
    mutation: 'RET融合',
    firstLine: ['塞尔帕替尼', '普拉替尼'],
    secondLine: ['化疗'],
    clinicalTrials: ['LIBRETTO-001', 'ARROW'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'FDA批准']
  },
  'BRAF_V600E': {
    mutation: 'BRAF V600E突变',
    firstLine: ['达拉非尼+曲美替尼', '化疗+免疫治疗'],
    secondLine: ['达拉非尼+曲美替尼'],
    clinicalTrials: ['COMBI-v', 'COMBI-d'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'FDA批准']
  },
  'NTRK_fusion': {
    mutation: 'NTRK融合',
    firstLine: ['拉罗替尼', '恩曲替尼'],
    secondLine: ['化疗'],
    clinicalTrials: ['LOXO-TRK-14001', 'STARTRK-2'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'FDA批准']
  },
  'PD_L1_high': {
    mutation: 'PD-L1高表达(≥50%)',
    firstLine: ['帕博利珠单抗单药', '化疗+帕博利珠单抗'],
    secondLine: ['多西他赛', '临床试验'],
    clinicalTrials: ['KEYNOTE-024', 'KEYNOTE-042'],
    evidenceLevel: '1A',
    guidelines: ['NCCN 2025', 'KEYNOTE系列']
  }
}

class LungCancerService {
  private nodules: Map<string, LungNodule> = new Map()
  private statistics = {
    totalNodulesAnalyzed: 0,
    totalStagings: 0,
    totalScreeningPlans: 0,
    highRiskCases: 0
  }

  getServiceInfo() {
    return {
      name: '肺癌早筛专科推理引擎',
      version: '1.0.0',
      guidelines: ['Fleischner 2025', 'NCCN 2025', 'CSCO 2025'],
      capabilities: [
        '肺结节恶性风险评估',
        'TNM分期判定',
        '筛查计划生成',
        '精准医疗推荐',
        '随访管理建议'
      ]
    }
  }

  analyzeNodule(
    patientId: string,
    noduleData: AnalyzeNoduleRequest['noduleData'],
    patientHistory: AnalyzeNoduleRequest['patientHistory']
  ): NoduleAnalysis {
    const noduleId = `NODULE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    let baseRisk = this.calculateBaseRisk(noduleData, patientHistory)

    if (noduleData.spiculation) {
      baseRisk *= 1.5
    }
    if (noduleData.margin && noduleData.margin > 3) {
      baseRisk *= 1.2
    }

    const riskCategory = this.categorizeRisk(baseRisk)
    const management = this.determineManagement(noduleData, riskCategory)

    const nodule: LungNodule = {
      id: noduleId,
      patientId,
      size: noduleData.size,
      location: noduleData.location,
      type: noduleData.type,
      malignancyRisk: Math.min(baseRisk, 0.99),
      management: management.recommendation,
      followUpInterval: management.followUp,
      createdAt: new Date().toISOString()
    }

    this.nodules.set(noduleId, nodule)
    this.statistics.totalNodulesAnalyzed++
    if (baseRisk > 0.65) {
      this.statistics.highRiskCases++
    }

    return {
      noduleId,
      malignancyRisk: nodule.malignancyRisk,
      riskCategory,
      management: {
        recommendation: management.recommendation,
        followUp: management.followUp,
        biopsy: management.biopsy,
        biopsyMethod: management.biopsyMethod
      },
      fleischnerGuideline: management.fleischnerGuideline
    }
  }

  private calculateBaseRisk(
    noduleData: AnalyzeNoduleRequest['noduleData'],
    patientHistory: AnalyzeNoduleRequest['patientHistory']
  ): number {
    let risk = 0.05

    if (noduleData.size > 30) {
      risk += 0.50
    } else if (noduleData.size > 20) {
      risk += 0.30
    } else if (noduleData.size > 10) {
      risk += 0.15
    } else if (noduleData.size > 6) {
      risk += 0.05
    }

    if (noduleData.type === 'solid') {
      risk *= 1.3
    } else if (noduleData.type === 'subsolid') {
      risk *= 1.1
    } else if (noduleData.type === 'ground_glass') {
      risk *= 0.8
    } else if (noduleData.type === 'calcified') {
      risk *= 0.2
    }

    if (patientHistory.age > 70) {
      risk *= 1.4
    } else if (patientHistory.age > 60) {
      risk *= 1.2
    } else if (patientHistory.age > 50) {
      risk *= 1.1
    }

    if (patientHistory.smokingHistory === 'current') {
      risk *= 1.8
      if (patientHistory.packYears && patientHistory.packYears > 30) {
        risk *= 1.3
      }
    } else if (patientHistory.smokingHistory === 'former') {
      risk *= 1.3
    }

    if (patientHistory.familyHistory) {
      risk *= 1.4
    }
    if (patientHistory.copdHistory) {
      risk *= 1.2
    }

    return Math.min(risk, 0.95)
  }

  private categorizeRisk(risk: number): NoduleAnalysis['riskCategory'] {
    if (risk < 0.05) return 'very_low'
    if (risk < 0.15) return 'low'
    if (risk < 0.40) return 'moderate'
    return 'high'
  }

  private determineManagement(
    noduleData: AnalyzeNoduleRequest['noduleData'],
    riskCategory: NoduleAnalysis['riskCategory']
  ): {
    recommendation: string
    followUp: string
    biopsy: boolean
    biopsyMethod?: string
    fleischnerGuideline: string
  } {
    const guidelines = LUNG_CANCER_GUIDELINES.fleischner2025[noduleData.type]
    const matchedGuideline = guidelines.find((g: { sizeMax: number; risk: string; followUp: string; recommendation: string }) => noduleData.size <= g.sizeMax)

    if (riskCategory === 'high' && noduleData.size > 15) {
      return {
        recommendation: '建议进行活检或手术切除',
        followUp: '立即',
        biopsy: true,
        biopsyMethod: noduleData.location.includes('外周') ? 'CT引导下穿刺活检' : '支气管镜活检',
        fleischnerGuideline: matchedGuideline?.recommendation || '高风险结节，建议活检'
      }
    }

    if (riskCategory === 'moderate') {
      return {
        recommendation: matchedGuideline?.recommendation || '建议定期CT随访',
        followUp: matchedGuideline?.followUp || '6个月',
        biopsy: false,
        fleischnerGuideline: matchedGuideline?.recommendation || '中等风险结节，定期随访'
      }
    }

    return {
      recommendation: matchedGuideline?.recommendation || '低风险结节，可延长随访间隔',
      followUp: matchedGuideline?.followUp || '12个月',
      biopsy: false,
      fleischnerGuideline: matchedGuideline?.recommendation || '低风险结节，定期随访'
    }
  }

  determineTNMStaging(
    patientId: string,
    tumorSize: number,
    lymphNodeInvolvement: TNMStagingRequest['lymphNodeInvolvement'],
    metastasis: TNMStagingRequest['metastasis'],
    tumorLocation: TNMStagingRequest['tumorLocation']
  ): TNMStaging {
    this.statistics.totalStagings++

    if (metastasis === 'present') {
      return TNM_STAGING_TABLE['TXNXM1']
    }

    let tStage: string
    if (tumorSize <= 30) {
      tStage = 'T1'
    } else if (tumorSize <= 50) {
      tStage = 'T2'
    } else if (tumorSize <= 70) {
      tStage = 'T3'
    } else {
      tStage = 'T4'
    }

    let nStage: string
    if (lymphNodeInvolvement === 'none') {
      nStage = 'N0'
    } else if (lymphNodeInvolvement === 'hilar') {
      nStage = 'N1'
    } else {
      nStage = 'N2'
    }

    const tnmKey = `${tStage}${nStage}M0` as keyof typeof TNM_STAGING_TABLE

    return TNM_STAGING_TABLE[tnmKey] || TNM_STAGING_TABLE['T1N0M0']
  }

  generateScreeningPlan(
    patientId: string,
    riskFactors: GenerateScreeningPlanRequest['riskFactors']
  ): ScreeningPlan {
    this.statistics.totalScreeningPlans++

    let riskScore = 0
    const riskFactorList: string[] = []

    if (riskFactors.age >= 50 && riskFactors.age <= 80) {
      riskScore += 2
      riskFactorList.push(`年龄${riskFactors.age}岁`)
    }

    if (riskFactors.smokingHistory === 'current' || riskFactors.smokingHistory === 'former') {
      riskScore += 3
      riskFactorList.push('吸烟史')

      if (riskFactors.packYears && riskFactors.packYears >= 20) {
        riskScore += 2
        riskFactorList.push(`${riskFactors.packYears}包年`)
      }
    }

    if (riskFactors.familyHistory) {
      riskScore += 2
      riskFactorList.push('肺癌家族史')
    }

    if (riskFactors.copdHistory) {
      riskScore += 1
      riskFactorList.push('COPD病史')
    }

    if (riskFactors.exposureHistory) {
      riskScore += 1
      riskFactorList.push(`职业暴露(${riskFactors.exposureHistory})`)
    }

    let riskLevel: ScreeningPlan['riskLevel']
    let recommendation: string
    let screeningMethod: string
    let interval: string

    if (riskScore >= 6) {
      riskLevel = 'high'
      recommendation = '强烈建议进行年度LDCT筛查'
      screeningMethod = '低剂量CT (LDCT)'
      interval = '每年一次'
    } else if (riskScore >= 3) {
      riskLevel = 'moderate'
      recommendation = '建议进行LDCT筛查'
      screeningMethod = '低剂量CT (LDCT)'
      interval = '每年一次'
    } else {
      riskLevel = 'low'
      recommendation = '可考虑LDCT筛查，或根据个人情况决定'
      screeningMethod = '低剂量CT (LDCT)'
      interval = '每2年一次'
    }

    const nextDate = new Date()
    nextDate.setFullYear(nextDate.getFullYear() + (riskLevel === 'low' ? 2 : 1))

    return {
      patientId,
      riskLevel,
      recommendation,
      screeningMethod,
      interval,
      nextScreeningDate: nextDate.toISOString().split('T')[0],
      riskFactors: riskFactorList
    }
  }

  getDrugsForMutation(mutationId: string): TreatmentRecommendation | null {
    return PRECISION_MEDICINE_DATA[mutationId] || null
  }

  recommendPrecisionTreatment(patientId: string, mutation: string): TreatmentRecommendation & {
    patientId: string
    recommendation: string
  } {
    const treatment = PRECISION_MEDICINE_DATA[mutation]

    if (!treatment) {
      return {
        mutation,
        firstLine: ['化疗', '免疫治疗'],
        secondLine: ['临床试验'],
        clinicalTrials: [],
        evidenceLevel: '2A',
        guidelines: ['NCCN 2025'],
        patientId,
        recommendation: '未检测到可靶向突变，建议标准化疗或免疫治疗'
      }
    }

    return {
      ...treatment,
      patientId,
      recommendation: `检测到${treatment.mutation}，首选${treatment.firstLine[0]}`
    }
  }

  getGuidelines() {
    return {
      fleischner2025: {
        description: 'Fleischner学会肺结节管理指南2025版',
        source: 'Fleischner Society',
        year: 2025
      },
      nccn2025: {
        description: 'NCCN非小细胞肺癌临床实践指南',
        source: 'National Comprehensive Cancer Network',
        year: 2025
      },
      csco2025: {
        description: 'CSCO原发性肺癌诊疗指南',
        source: '中国临床肿瘤学会',
        year: 2025
      }
    }
  }

  getStatistics() {
    return { ...this.statistics }
  }
}

interface AnalyzeNoduleRequest {
  noduleData: {
    size: number
    location: string
    type: 'solid' | 'subsolid' | 'ground_glass' | 'calcified'
    spiculation?: boolean
    margin?: number
  }
  patientHistory: {
    age: number
    smokingHistory: 'never' | 'former' | 'current'
    packYears?: number
    familyHistory?: boolean
    copdHistory?: boolean
  }
}

interface TNMStagingRequest {
  tumorSize: number
  lymphNodeInvolvement: 'none' | 'hilar' | 'mediastinal'
  metastasis: 'none' | 'present'
  tumorLocation: 'central' | 'peripheral'
}

interface GenerateScreeningPlanRequest {
  riskFactors: {
    age: number
    smokingHistory: string
    packYears?: number
    familyHistory?: boolean
    copdHistory?: boolean
    exposureHistory?: string
  }
}

export const lungCancerService = new LungCancerService()
export type { LungNodule, TNMStaging, ScreeningPlan, TreatmentRecommendation, NoduleAnalysis }
