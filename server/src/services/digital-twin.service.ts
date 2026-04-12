interface OrganModel {
  id: string
  name: string
  nameEn: string
  status: 'normal' | 'warning' | 'critical'
  color: string
  opacity: number
  position: { x: number; y: number; z: number }
  scale: number
  relatedIndicators: string[]
  pathologies: string[]
  meshUrl: string
}

interface HealthIndicator {
  name: string
  value: number
  unit: string
  normalRange: [number, number]
  status: 'normal' | 'high' | 'low' | 'critical'
  relatedOrgan: string
  lastUpdated: string
}

interface RiskAssessment {
  overallRisk: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  organRisks: Array<{
    organId: string
    organName: string
    riskScore: number
    riskFactors: string[]
  }>
  recommendations: string[]
  urgencyLevel: 'routine' | 'attention' | 'urgent' | 'emergency'
}

interface PatientTwin {
  patientId: string
  organs: OrganModel[]
  indicators: HealthIndicator[]
  riskAssessment: RiskAssessment
  lastUpdated: string
  version: number
}

interface DiseaseOverlay {
  diseaseId: string
  diseaseName: string
  affectedOrgans: string[]
  pathologyHighlights: Array<{
    organId: string
    region: string
    color: string
    description: string
  }>
  recommendations: string[]
}

const ORGAN_DEFINITIONS: Array<Omit<OrganModel, 'status' | 'pathologies'>> = [
  {
    id: 'heart',
    name: '心脏',
    nameEn: 'Heart',
    color: '#e74c3c',
    opacity: 0.9,
    position: { x: 0, y: 0.3, z: 0 },
    scale: 1.0,
    relatedIndicators: ['心率', '血压', '肌钙蛋白', 'BNP', 'LDL-C', 'HDL-C'],
    meshUrl: '/models/heart.glb'
  },
  {
    id: 'lung_left',
    name: '左肺',
    nameEn: 'Left Lung',
    color: '#3498db',
    opacity: 0.85,
    position: { x: -0.3, y: 0.5, z: 0 },
    scale: 0.9,
    relatedIndicators: ['血氧饱和度', '呼吸频率', 'FEV1', 'FVC'],
    meshUrl: '/models/lung_left.glb'
  },
  {
    id: 'lung_right',
    name: '右肺',
    nameEn: 'Right Lung',
    color: '#3498db',
    opacity: 0.85,
    position: { x: 0.3, y: 0.5, z: 0 },
    scale: 1.0,
    relatedIndicators: ['血氧饱和度', '呼吸频率', 'FEV1', 'FVC'],
    meshUrl: '/models/lung_right.glb'
  },
  {
    id: 'liver',
    name: '肝脏',
    nameEn: 'Liver',
    color: '#8b4513',
    opacity: 0.9,
    position: { x: 0.2, y: -0.1, z: 0 },
    scale: 1.1,
    relatedIndicators: ['ALT', 'AST', '总胆红素', '白蛋白', 'GGT', 'ALP'],
    meshUrl: '/models/liver.glb'
  },
  {
    id: 'kidney_left',
    name: '左肾',
    nameEn: 'Left Kidney',
    color: '#9b59b6',
    opacity: 0.9,
    position: { x: -0.2, y: -0.3, z: 0 },
    scale: 0.8,
    relatedIndicators: ['肌酐', '尿素氮', 'eGFR', '尿蛋白'],
    meshUrl: '/models/kidney_left.glb'
  },
  {
    id: 'kidney_right',
    name: '右肾',
    nameEn: 'Right Kidney',
    color: '#9b59b6',
    opacity: 0.9,
    position: { x: 0.2, y: -0.3, z: 0 },
    scale: 0.8,
    relatedIndicators: ['肌酐', '尿素氮', 'eGFR', '尿蛋白'],
    meshUrl: '/models/kidney_right.glb'
  },
  {
    id: 'brain',
    name: '大脑',
    nameEn: 'Brain',
    color: '#f39c12',
    opacity: 0.9,
    position: { x: 0, y: 1.0, z: 0 },
    scale: 0.9,
    relatedIndicators: ['认知评分', '情绪评分', '睡眠质量'],
    meshUrl: '/models/brain.glb'
  },
  {
    id: 'stomach',
    name: '胃',
    nameEn: 'Stomach',
    color: '#e67e22',
    opacity: 0.85,
    position: { x: -0.1, y: 0, z: 0.1 },
    scale: 0.7,
    relatedIndicators: ['胃蛋白酶原', '幽门螺杆菌', '胃泌素'],
    meshUrl: '/models/stomach.glb'
  },
  {
    id: 'pancreas',
    name: '胰腺',
    nameEn: 'Pancreas',
    color: '#f1c40f',
    opacity: 0.85,
    position: { x: 0, y: -0.05, z: 0 },
    scale: 0.6,
    relatedIndicators: ['血糖', '胰岛素', 'C肽', '淀粉酶', '糖化血红蛋白'],
    meshUrl: '/models/pancreas.glb'
  },
  {
    id: 'thyroid',
    name: '甲状腺',
    nameEn: 'Thyroid',
    color: '#1abc9c',
    opacity: 0.9,
    position: { x: 0, y: 0.8, z: 0.05 },
    scale: 0.4,
    relatedIndicators: ['TSH', 'FT3', 'FT4', 'TPOAb', 'TgAb'],
    meshUrl: '/models/thyroid.glb'
  }
]

const INDICATOR_ORGAN_MAPPING: Record<string, string[]> = {
  '心率': ['heart'],
  '血压': ['heart', 'kidney_left', 'kidney_right'],
  '肌钙蛋白': ['heart'],
  'BNP': ['heart'],
  'LDL-C': ['heart'],
  'HDL-C': ['heart'],
  '血氧饱和度': ['lung_left', 'lung_right'],
  '呼吸频率': ['lung_left', 'lung_right'],
  'FEV1': ['lung_left', 'lung_right'],
  'FVC': ['lung_left', 'lung_right'],
  'ALT': ['liver'],
  'AST': ['liver'],
  '总胆红素': ['liver'],
  '白蛋白': ['liver'],
  'GGT': ['liver'],
  'ALP': ['liver'],
  '肌酐': ['kidney_left', 'kidney_right'],
  '尿素氮': ['kidney_left', 'kidney_right'],
  'eGFR': ['kidney_left', 'kidney_right'],
  '尿蛋白': ['kidney_left', 'kidney_right'],
  '血糖': ['pancreas'],
  '胰岛素': ['pancreas'],
  '糖化血红蛋白': ['pancreas'],
  'TSH': ['thyroid'],
  'FT3': ['thyroid'],
  'FT4': ['thyroid']
}

const DISEASE_ORGAN_MAPPING: Record<string, DiseaseOverlay> = {
  'coronary_heart_disease': {
    diseaseId: 'coronary_heart_disease',
    diseaseName: '冠心病',
    affectedOrgans: ['heart'],
    pathologyHighlights: [
      { organId: 'heart', region: 'coronary_arteries', color: '#ff0000', description: '冠状动脉狭窄' }
    ],
    recommendations: ['控制血脂', '规律运动', '戒烟限酒', '定期复查冠脉CT']
  },
  'hypertension': {
    diseaseId: 'hypertension',
    diseaseName: '高血压',
    affectedOrgans: ['heart', 'kidney_left', 'kidney_right', 'brain'],
    pathologyHighlights: [
      { organId: 'heart', region: 'left_ventricle', color: '#ff6600', description: '左心室肥厚' },
      { organId: 'kidney_left', region: 'arterioles', color: '#ff6600', description: '肾小动脉硬化' },
      { organId: 'kidney_right', region: 'arterioles', color: '#ff6600', description: '肾小动脉硬化' }
    ],
    recommendations: ['低盐饮食', '规律服药', '监测血压', '定期检查心肾功能']
  },
  'diabetes': {
    diseaseId: 'diabetes',
    diseaseName: '糖尿病',
    affectedOrgans: ['pancreas', 'kidney_left', 'kidney_right', 'heart', 'brain'],
    pathologyHighlights: [
      { organId: 'pancreas', region: 'islets', color: '#ff0000', description: '胰岛功能受损' },
      { organId: 'kidney_left', region: 'glomeruli', color: '#ff6600', description: '糖尿病肾病风险' },
      { organId: 'kidney_right', region: 'glomeruli', color: '#ff6600', description: '糖尿病肾病风险' }
    ],
    recommendations: ['控制血糖', '定期监测糖化血红蛋白', '眼底检查', '足部护理']
  },
  'chronic_kidney_disease': {
    diseaseId: 'chronic_kidney_disease',
    diseaseName: '慢性肾脏病',
    affectedOrgans: ['kidney_left', 'kidney_right'],
    pathologyHighlights: [
      { organId: 'kidney_left', region: 'cortex', color: '#ff0000', description: '肾功能下降' },
      { organId: 'kidney_right', region: 'cortex', color: '#ff0000', description: '肾功能下降' }
    ],
    recommendations: ['低蛋白饮食', '控制血压', '避免肾毒性药物', '定期监测肾功能']
  },
  'liver_disease': {
    diseaseId: 'liver_disease',
    diseaseName: '肝病',
    affectedOrgans: ['liver'],
    pathologyHighlights: [
      { organId: 'liver', region: 'parenchyma', color: '#ff6600', description: '肝实质病变' }
    ],
    recommendations: ['戒酒', '避免肝毒性药物', '定期检查肝功能', '肝脏超声']
  },
  'copd': {
    diseaseId: 'copd',
    diseaseName: '慢性阻塞性肺疾病',
    affectedOrgans: ['lung_left', 'lung_right'],
    pathologyHighlights: [
      { organId: 'lung_left', region: 'bronchi', color: '#ff6600', description: '气道阻塞' },
      { organId: 'lung_right', region: 'bronchi', color: '#ff6600', description: '气道阻塞' }
    ],
    recommendations: ['戒烟', '呼吸康复训练', '预防感染', '定期肺功能检查']
  }
}

class DigitalTwinService {
  private patientTwins: Map<string, PatientTwin> = new Map()
  private statistics = {
    totalGenerated: 0,
    activeTwins: 0,
    riskAssessments: 0
  }

  getAvailableOrgans(): OrganModel[] {
    return ORGAN_DEFINITIONS.map(organ => ({
      ...organ,
      status: 'normal' as const,
      pathologies: []
    }))
  }

  getOrganModel(organId: string): OrganModel | null {
    const definition = ORGAN_DEFINITIONS.find(o => o.id === organId)
    if (!definition) return null

    return {
      ...definition,
      status: 'normal',
      pathologies: []
    }
  }

  generateDigitalTwin(
    patientId: string,
    healthRecords: GenerateTwinRequest['healthRecords']
  ): PatientTwin {
    const organs: OrganModel[] = ORGAN_DEFINITIONS.map(organ => ({
      ...organ,
      status: 'normal' as const,
      pathologies: []
    }))

    const indicators: HealthIndicator[] = []

    if (healthRecords.labResults) {
      for (const result of healthRecords.labResults) {
        const status = this.evaluateIndicatorStatus(result.value, result.normalRange)
        const relatedOrgans = INDICATOR_ORGAN_MAPPING[result.name] || []

        indicators.push({
          name: result.name,
          value: result.value,
          unit: result.unit,
          normalRange: result.normalRange,
          status,
          relatedOrgan: relatedOrgans[0] || 'unknown',
          lastUpdated: new Date().toISOString()
        })

        for (const organId of relatedOrgans) {
          const organ = organs.find(o => o.id === organId)
          if (organ) {
            if (status === 'critical') {
              organ.status = 'critical'
              organ.color = '#ff0000'
            } else if (status === 'high' || status === 'low') {
              if (organ.status !== 'critical') {
                organ.status = 'warning'
                organ.color = '#ff9900'
              }
            }
          }
        }
      }
    }

    const riskAssessment = this.calculateRiskAssessment(organs, indicators, healthRecords.diagnoses || [])

    const twin: PatientTwin = {
      patientId,
      organs,
      indicators,
      riskAssessment,
      lastUpdated: new Date().toISOString(),
      version: 1
    }

    this.patientTwins.set(patientId, twin)
    this.statistics.totalGenerated++
    this.statistics.activeTwins = this.patientTwins.size

    return twin
  }

  private evaluateIndicatorStatus(
    value: number,
    normalRange: [number, number]
  ): 'normal' | 'high' | 'low' | 'critical' {
    const [min, max] = normalRange
    const range = max - min

    if (value < min - range * 0.5 || value > max + range * 0.5) {
      return 'critical'
    }
    if (value < min || value > max) {
      return value < min ? 'low' : 'high'
    }
    return 'normal'
  }

  private calculateRiskAssessment(
    organs: OrganModel[],
    indicators: HealthIndicator[],
    diagnoses: string[]
  ): RiskAssessment {
    let overallRisk = 0
    const organRisks: RiskAssessment['organRisks'] = []

    for (const organ of organs) {
      const organIndicators = indicators.filter(i => i.relatedOrgan === organ.id)
      let riskScore = 0
      const riskFactors: string[] = []

      if (organ.status === 'critical') {
        riskScore += 40
        riskFactors.push(`${organ.name}指标严重异常`)
      } else if (organ.status === 'warning') {
        riskScore += 20
        riskFactors.push(`${organ.name}指标异常`)
      }

      for (const indicator of organIndicators) {
        if (indicator.status === 'critical') {
          riskScore += 15
          riskFactors.push(`${indicator.name}严重异常`)
        } else if (indicator.status === 'high' || indicator.status === 'low') {
          riskScore += 5
          riskFactors.push(`${indicator.name}异常`)
        }
      }

      if (riskScore > 0) {
        organRisks.push({
          organId: organ.id,
          organName: organ.name,
          riskScore: Math.min(riskScore, 100),
          riskFactors
        })
      }

      overallRisk += riskScore
    }

    for (const diagnosis of diagnoses) {
      const diseaseOverlay = DISEASE_ORGAN_MAPPING[diagnosis]
      if (diseaseOverlay) {
        overallRisk += 30
        for (const organId of diseaseOverlay.affectedOrgans) {
          const existingRisk = organRisks.find(r => r.organId === organId)
          if (existingRisk) {
            existingRisk.riskScore = Math.min(existingRisk.riskScore + 20, 100)
            existingRisk.riskFactors.push(`诊断: ${diseaseOverlay.diseaseName}`)
          }
        }
      }
    }

    overallRisk = Math.min(overallRisk / organs.length, 100)

    const recommendations = this.generateRecommendations(organRisks, diagnoses)

    let riskLevel: RiskAssessment['riskLevel']
    let urgencyLevel: RiskAssessment['urgencyLevel']

    if (overallRisk >= 70) {
      riskLevel = 'critical'
      urgencyLevel = 'emergency'
    } else if (overallRisk >= 50) {
      riskLevel = 'high'
      urgencyLevel = 'urgent'
    } else if (overallRisk >= 25) {
      riskLevel = 'medium'
      urgencyLevel = 'attention'
    } else {
      riskLevel = 'low'
      urgencyLevel = 'routine'
    }

    this.statistics.riskAssessments++

    return {
      overallRisk: Math.round(overallRisk),
      riskLevel,
      organRisks,
      recommendations,
      urgencyLevel
    }
  }

  private generateRecommendations(
    organRisks: RiskAssessment['organRisks'],
    diagnoses: string[]
  ): string[] {
    const recommendations: string[] = []

    for (const diagnosis of diagnoses) {
      const diseaseOverlay = DISEASE_ORGAN_MAPPING[diagnosis]
      if (diseaseOverlay) {
        recommendations.push(...diseaseOverlay.recommendations)
      }
    }

    for (const risk of organRisks) {
      if (risk.riskScore >= 50) {
        recommendations.push(`建议尽快就诊，检查${risk.organName}相关指标`)
      } else if (risk.riskScore >= 25) {
        recommendations.push(`关注${risk.organName}健康，定期复查`)
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('保持健康生活方式', '定期体检')
    }

    return [...new Set(recommendations)].slice(0, 5)
  }

  getPatientTwin(patientId: string): PatientTwin | null {
    return this.patientTwins.get(patientId) || null
  }

  overlayDisease(patientId: string, diseaseId: string): DiseaseOverlay | null {
    const twin = this.patientTwins.get(patientId)
    if (!twin) return null

    const diseaseOverlay = DISEASE_ORGAN_MAPPING[diseaseId]
    if (!diseaseOverlay) return null

    for (const highlight of diseaseOverlay.pathologyHighlights) {
      const organ = twin.organs.find(o => o.id === highlight.organId)
      if (organ) {
        organ.status = 'critical'
        organ.color = highlight.color
        organ.pathologies.push(highlight.description)
      }
    }

    twin.lastUpdated = new Date().toISOString()
    twin.version++

    return diseaseOverlay
  }

  updateOrganStatus(
    patientId: string,
    organId: string,
    status: OrganModel['status'],
    indicators: string[]
  ): { success: boolean; twin: PatientTwin | null } {
    const twin = this.patientTwins.get(patientId)
    if (!twin) {
      return { success: false, twin: null }
    }

    const organ = twin.organs.find(o => o.id === organId)
    if (!organ) {
      return { success: false, twin: null }
    }

    organ.status = status
    organ.pathologies = indicators

    switch (status) {
      case 'critical':
        organ.color = '#ff0000'
        organ.opacity = 1.0
        break
      case 'warning':
        organ.color = '#ff9900'
        organ.opacity = 0.95
        break
      default:
        const definition = ORGAN_DEFINITIONS.find(o => o.id === organId)
        if (definition) {
          organ.color = definition.color
          organ.opacity = definition.opacity
        }
    }

    twin.lastUpdated = new Date().toISOString()
    twin.version++

    return { success: true, twin }
  }

  assessRisk(patientId: string): RiskAssessment | null {
    const twin = this.patientTwins.get(patientId)
    if (!twin) return null

    const assessment = this.calculateRiskAssessment(
      twin.organs,
      twin.indicators,
      twin.indicators
        .filter(i => i.status !== 'normal')
        .map(i => i.relatedOrgan)
    )

    twin.riskAssessment = assessment
    twin.lastUpdated = new Date().toISOString()

    return assessment
  }

  exportModel(patientId: string): { format: string; url: string; organs: string[] } | null {
    const twin = this.patientTwins.get(patientId)
    if (!twin) return null

    return {
      format: 'glb',
      url: `/api/v1/digital-twin/patients/${patientId}/download`,
      organs: twin.organs.map(o => o.id)
    }
  }

  getIndicatorMapping(): Record<string, string[]> {
    return INDICATOR_ORGAN_MAPPING
  }

  getStatistics(): typeof this.statistics {
    return { ...this.statistics }
  }
}

interface GenerateTwinRequest {
  healthRecords: {
    labResults?: Array<{ name: string; value: number; unit: string; normalRange: [number, number] }>
    diagnoses?: string[]
  }
}

export const digitalTwinService = new DigitalTwinService()
export type { OrganModel, HealthIndicator, RiskAssessment, PatientTwin, DiseaseOverlay }
