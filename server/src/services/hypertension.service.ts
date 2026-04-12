export interface BloodPressureReading {
  systolic: number
  diastolic: number
  timestamp: string
  position?: 'sitting' | 'standing' | 'supine'
}

export interface RiskAssessment {
  patientId: string
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high' | 'extremely_high'
  tenYearRisk: number
  factors: string[]
  recommendations: string[]
  followUpInterval: string
}

export interface TreatmentPlan {
  patientId: string
  targetBP: { systolic: number; diastolic: number }
  medications: Array<{
    name: string
    class: string
    dosage: string
    frequency: string
    timing: string
    notes?: string
  }>
  lifestyle: string[]
  monitoring: {
    homeBP: boolean
    frequency: string
    abpmRecommended: boolean
  }
  followUp: string
  precautions: string[]
}

interface BPClassification {
  category: string
  systolic: [number, number]
  diastolic: [number, number]
  description: string
  urgency: 'routine' | 'urgent' | 'emergency'
}

const BP_CLASSIFICATIONS: BPClassification[] = [
  { category: '正常血压', systolic: [0, 119], diastolic: [0, 79], description: '血压正常，继续保持健康生活方式', urgency: 'routine' },
  { category: '正常高值', systolic: [120, 139], diastolic: [80, 89], description: '血压偏高，建议改善生活方式', urgency: 'routine' },
  { category: '高血压1级(轻度)', systolic: [140, 159], diastolic: [90, 99], description: '轻度高血压，需要生活方式干预', urgency: 'routine' },
  { category: '高血压2级(中度)', systolic: [160, 179], diastolic: [100, 109], description: '中度高血压，建议药物治疗', urgency: 'urgent' },
  { category: '高血压3级(重度)', systolic: [180, 300], diastolic: [110, 200], description: '重度高血压，需要紧急处理', urgency: 'emergency' },
]

const MEDICATION_CLASSES = {
  ccb: { name: '钙通道阻滞剂', examples: ['氨氯地平', '硝苯地平控释片', '非洛地平'] },
  arb: { name: '血管紧张素受体拮抗剂', examples: ['缬沙坦', '厄贝沙坦', '氯沙坦'] },
  acei: { name: '血管紧张素转换酶抑制剂', examples: ['培哚普利', '依那普利', '贝那普利'] },
  diuretic: { name: '利尿剂', examples: ['氢氯噻嗪', '吲达帕胺'] },
  beta_blocker: { name: 'β受体阻滞剂', examples: ['美托洛尔', '比索洛尔', '卡维地洛'] },
  alpha_blocker: { name: 'α受体阻滞剂', examples: ['特拉唑嗪', '多沙唑嗪'] },
}

const RISK_FACTORS = {
  age: { weight: 2, description: '年龄≥55岁(男)/≥65岁(女)' },
  smoking: { weight: 2, description: '吸烟' },
  diabetes: { weight: 3, description: '糖尿病' },
  dyslipidemia: { weight: 2, description: '血脂异常' },
  familyHistory: { weight: 1, description: '早发心血管病家族史' },
  obesity: { weight: 2, description: '肥胖(BMI≥28)' },
  kidneyDisease: { weight: 4, description: '慢性肾脏病' },
  establishedCVD: { weight: 5, description: '已确诊心血管疾病' },
}

class HypertensionService {
  private patientRecords: Map<string, any[]> = new Map()

  getServiceInfo() {
    return {
      name: '高血压管理专科服务',
      version: '1.0.0',
      features: [
        '血压分类与评估',
        '心血管风险评估(10年ASCVD风险)',
        '个性化治疗方案生成',
        '动态血压监测(ABPM)分析',
        '生活方式干预建议',
        '用药指导与禁忌检查',
      ],
      guidelines: ['中国高血压防治指南2024', 'ISH2020国际高血压指南', 'ESC/ESH2018高血压指南'],
      supportedMedications: Object.keys(MEDICATION_CLASSES).length,
    }
  }

  analyzeBloodPressure(patientId: string, readings: BloodPressureReading[]) {
    if (!this.patientRecords.has(patientId)) {
      this.patientRecords.set(patientId, [])
    }
    this.patientRecords.get(patientId)!.push(...readings)

    const avgSystolic = readings.reduce((sum, r) => sum + r.systolic, 0) / readings.length
    const avgDiastolic = readings.reduce((sum, r) => sum + r.diastolic, 0) / readings.length
    const maxSystolic = Math.max(...readings.map(r => r.systolic))
    const minSystolic = Math.min(...readings.map(r => r.systolic))
    const variability = {
      systolic: { max: maxSystolic, min: minSystolic, range: maxSystolic - minSystolic },
      diastolic: {
        max: Math.max(...readings.map(r => r.diastolic)),
        min: Math.min(...readings.map(r => r.diastolic)),
        range: Math.max(...readings.map(r => r.diastolic)) - Math.min(...readings.map(r => r.diastolic))
      }
    }

    const classification = this.classifyBP(avgSystolic, avgDiastolic)
    const trend = this.calculateTrend(readings)

    return {
      patientId,
      timestamp: new Date().toISOString(),
      readings: readings.length,
      average: { systolic: Math.round(avgSystolic), diastolic: Math.round(avgDiastolic) },
      classification: classification.category,
      description: classification.description,
      urgency: classification.urgency,
      variability,
      trend,
      recommendations: this.generateBPRecommendations(classification, avgSystolic, avgDiastolic),
    }
  }

  private classifyBP(systolic: number, diastolic: number): BPClassification {
    for (const classification of BP_CLASSIFICATIONS) {
      if (systolic >= classification.systolic[0] && systolic <= classification.systolic[1] &&
          diastolic >= classification.diastolic[0] && diastolic <= classification.diastolic[1]) {
        return classification
      }
      if (systolic >= classification.systolic[0] && systolic <= classification.systolic[1] && diastolic < classification.diastolic[0]) {
        return classification
      }
      if (diastolic >= classification.diastolic[0] && diastolic <= classification.diastolic[1] && systolic < classification.systolic[0]) {
        return classification
      }
    }
    return BP_CLASSIFICATIONS[BP_CLASSIFICATIONS.length - 1]
  }

  private calculateTrend(readings: BloodPressureReading[]) {
    if (readings.length < 2) return 'insufficient_data'
    const sorted = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))
    const firstAvg = firstHalf.reduce((s, r) => s + r.systolic, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, r) => s + r.systolic, 0) / secondHalf.length
    const diff = secondAvg - firstAvg
    if (diff > 5) return 'increasing'
    if (diff < -5) return 'decreasing'
    return 'stable'
  }

  private generateBPRecommendations(classification: BPClassification, systolic: number, diastolic: number): string[] {
    const recommendations: string[] = []
    if (classification.urgency === 'emergency') {
      recommendations.push('⚠️ 血压危急，建议立即就医')
      recommendations.push('避免剧烈活动，保持安静休息')
    } else if (classification.urgency === 'urgent') {
      recommendations.push('建议尽快就医评估')
      recommendations.push('考虑启动或调整降压药物治疗')
    } else if (classification.category === '正常高值') {
      recommendations.push('建议改善生活方式')
      recommendations.push('限制钠盐摄入(<5g/天)')
      recommendations.push('增加体育锻炼')
    } else if (classification.category === '高血压1级(轻度)') {
      recommendations.push('建议生活方式干预3个月')
      recommendations.push('如血压未达标，考虑药物治疗')
    }
    recommendations.push('定期监测血压')
    return recommendations
  }

  assessCardiovascularRisk(patientId: string, profile: {
    age: number
    gender: 'male' | 'female'
    smoking?: boolean
    diabetes?: boolean
    cholesterol?: { total: number; ldl: number; hdl: number }
    familyHistory?: boolean
    kidneyDisease?: boolean
    establishedCVD?: boolean
  }): RiskAssessment {
    let riskScore = 0
    const factors: string[] = []

    if (profile.age >= 55 && profile.gender === 'male' || profile.age >= 65 && profile.gender === 'female') {
      riskScore += RISK_FACTORS.age.weight
      factors.push(RISK_FACTORS.age.description)
    }
    if (profile.smoking) {
      riskScore += RISK_FACTORS.smoking.weight
      factors.push(RISK_FACTORS.smoking.description)
    }
    if (profile.diabetes) {
      riskScore += RISK_FACTORS.diabetes.weight
      factors.push(RISK_FACTORS.diabetes.description)
    }
    if (profile.cholesterol && profile.cholesterol.ldl > 3.4) {
      riskScore += RISK_FACTORS.dyslipidemia.weight
      factors.push(RISK_FACTORS.dyslipidemia.description)
    }
    if (profile.familyHistory) {
      riskScore += RISK_FACTORS.familyHistory.weight
      factors.push(RISK_FACTORS.familyHistory.description)
    }
    if (profile.kidneyDisease) {
      riskScore += RISK_FACTORS.kidneyDisease.weight
      factors.push(RISK_FACTORS.kidneyDisease.description)
    }
    if (profile.establishedCVD) {
      riskScore += RISK_FACTORS.establishedCVD.weight
      factors.push(RISK_FACTORS.establishedCVD.description)
    }

    const baseRisk = profile.gender === 'male' ? 5 : 3
    const ageAdjustment = Math.max(0, (profile.age - 40) * 0.5)
    let tenYearRisk = (baseRisk + ageAdjustment + riskScore * 2) / 100
    tenYearRisk = Math.min(0.8, Math.max(0.01, tenYearRisk))

    let riskLevel: RiskAssessment['riskLevel']
    let followUpInterval: string
    if (profile.establishedCVD || profile.kidneyDisease || tenYearRisk >= 0.2) {
      riskLevel = 'very_high'
      followUpInterval = '1个月'
    } else if (tenYearRisk >= 0.1 || profile.diabetes) {
      riskLevel = 'high'
      followUpInterval = '3个月'
    } else if (tenYearRisk >= 0.05 || factors.length >= 2) {
      riskLevel = 'moderate'
      followUpInterval = '6个月'
    } else {
      riskLevel = 'low'
      followUpInterval = '12个月'
    }

    const recommendations = this.generateRiskRecommendations(riskLevel, factors)

    return {
      patientId,
      riskLevel,
      tenYearRisk: Math.round(tenYearRisk * 1000) / 1000,
      factors,
      recommendations,
      followUpInterval,
    }
  }

  private generateRiskRecommendations(riskLevel: string, factors: string[]): string[] {
    const recommendations: string[] = []
    switch (riskLevel) {
      case 'very_high':
        recommendations.push('强烈建议药物治疗')
        recommendations.push('积极控制所有危险因素')
        recommendations.push('定期心血管专科随访')
        break
      case 'high':
        recommendations.push('建议启动药物治疗')
        recommendations.push('强化生活方式干预')
        recommendations.push('定期监测血压和血脂')
        break
      case 'moderate':
        recommendations.push('生活方式干预为主')
        recommendations.push('定期评估危险因素')
        break
      default:
        recommendations.push('保持健康生活方式')
        recommendations.push('定期体检')
    }
    if (factors.includes('吸烟')) {
      recommendations.push('戒烟是降低风险的最有效措施')
    }
    return recommendations
  }

  generateTreatmentPlan(
    patientId: string,
    currentBP: { systolic: number; diastolic: number },
    riskLevel: 'low' | 'moderate' | 'high' | 'very_high',
    comorbidities: string[],
    contraindications: string[],
    currentMedications?: string[]
  ): TreatmentPlan {
    const targetBP = this.calculateTargetBP(comorbidities)
    const medications = this.selectMedications(currentBP, riskLevel, comorbidities, contraindications, currentMedications)
    const lifestyle = this.generateLifestyleList(comorbidities)
    const monitoring = this.determineMonitoring(currentBP, riskLevel)

    return {
      patientId,
      targetBP,
      medications,
      lifestyle,
      monitoring,
      followUp: this.determineFollowUp(riskLevel, currentBP),
      precautions: this.generatePrecautions(medications, comorbidities),
    }
  }

  private calculateTargetBP(comorbidities: string[]): { systolic: number; diastolic: number } {
    if (comorbidities.includes('diabetes') || comorbidities.includes('chronic_kidney_disease')) {
      return { systolic: 130, diastolic: 80 }
    }
    if (comorbidities.includes('elderly') || comorbidities.includes('frail')) {
      return { systolic: 150, diastolic: 90 }
    }
    return { systolic: 140, diastolic: 90 }
  }

  private selectMedications(
    currentBP: { systolic: number; diastolic: number },
    riskLevel: string,
    comorbidities: string[],
    contraindications: string[],
    currentMedications?: string[]
  ) {
    const medications: TreatmentPlan['medications'] = []
    const needsMultiple = currentBP.systolic > 160 || riskLevel === 'very_high'

    if (comorbidities.includes('diabetes') && !contraindications.includes('acei_arb')) {
      medications.push({
        name: '培哚普利',
        class: 'ACEI',
        dosage: '4-8mg',
        frequency: '每日1次',
        timing: '早晨服用',
        notes: '糖尿病首选，有肾脏保护作用'
      })
    } else if (comorbidities.includes('chronic_kidney_disease') && !contraindications.includes('acei_arb')) {
      medications.push({
        name: '缬沙坦',
        class: 'ARB',
        dosage: '80-160mg',
        frequency: '每日1次',
        timing: '早晨服用',
        notes: '肾功能不全首选'
      })
    } else if (comorbidities.includes('coronary_heart_disease') && !contraindications.includes('beta_blocker')) {
      medications.push({
        name: '美托洛尔缓释片',
        class: 'β受体阻滞剂',
        dosage: '47.5-95mg',
        frequency: '每日1次',
        timing: '早晨服用',
        notes: '冠心病首选'
      })
    } else if (!contraindications.includes('ccb')) {
      medications.push({
        name: '氨氯地平',
        class: 'CCB',
        dosage: '5-10mg',
        frequency: '每日1次',
        timing: '早晨服用',
        notes: '一线降压药，无代谢影响'
      })
    }

    if (needsMultiple && medications.length === 1) {
      if (!contraindications.includes('diuretic')) {
        medications.push({
          name: '氢氯噻嗪',
          class: '利尿剂',
          dosage: '12.5-25mg',
          frequency: '每日1次',
          timing: '早晨服用',
          notes: '联合用药增强降压效果'
        })
      }
    }

    if (medications.length === 0) {
      medications.push({
        name: '氨氯地平',
        class: 'CCB',
        dosage: '5mg',
        frequency: '每日1次',
        timing: '早晨服用',
        notes: '初始治疗推荐'
      })
    }

    return medications
  }

  private generateLifestyleList(comorbidities: string[]): string[] {
    const lifestyle = [
      '限制钠盐摄入，每日<5g',
      '增加钾摄入，多吃新鲜蔬菜水果',
      '规律有氧运动，每周≥150分钟',
      '控制体重，BMI<24',
      '限制饮酒，男性<25g/天，女性<15g/天',
      '戒烟',
    ]
    if (comorbidities.includes('diabetes')) {
      lifestyle.push('控制碳水化合物摄入，监测血糖')
    }
    if (comorbidities.includes('chronic_kidney_disease')) {
      lifestyle.push('限制蛋白质摄入，遵医嘱调整')
    }
    return lifestyle
  }

  private determineMonitoring(currentBP: { systolic: number; diastolic: number }, riskLevel: string) {
    return {
      homeBP: currentBP.systolic >= 140 || riskLevel !== 'low',
      frequency: riskLevel === 'very_high' ? '每日2次' : riskLevel === 'high' ? '每日1次' : '每周2-3次',
      abpmRecommended: currentBP.systolic >= 160 || riskLevel === 'very_high',
    }
  }

  private determineFollowUp(riskLevel: string, currentBP: { systolic: number; diastolic: number }): string {
    if (currentBP.systolic >= 180) return '立即就医'
    if (riskLevel === 'very_high') return '2周后复诊'
    if (riskLevel === 'high') return '1个月后复诊'
    if (riskLevel === 'moderate') return '3个月后复诊'
    return '6个月后复诊'
  }

  private generatePrecautions(medications: TreatmentPlan['medications'], comorbidities: string[]): string[] {
    const precautions: string[] = []
    const hasACEIARB = medications.some(m => m.class === 'ACEI' || m.class === 'ARB')
    const hasDiuretic = medications.some(m => m.class === '利尿剂')

    if (hasACEIARB) {
      precautions.push('ACEI/ARB类药物可能引起干咳，如不耐受可换用另一类')
      precautions.push('用药期间监测肾功能和血钾')
    }
    if (hasDiuretic) {
      precautions.push('利尿剂可能引起低钾，建议定期检查电解质')
    }
    if (comorbidities.includes('diabetes')) {
      precautions.push('注意监测血糖变化')
    }
    precautions.push('避免突然停药，如需调整请咨询医生')
    precautions.push('如出现头晕、乏力等症状，及时测量血压并就医')

    return precautions
  }

  analyzeABPM(patientId: string, abpmData: Array<{ time: string; systolic: number; diastolic: number }>) {
    const dayReadings = abpmData.filter(d => {
      const hour = new Date(d.time).getHours()
      return hour >= 6 && hour < 22
    })
    const nightReadings = abpmData.filter(d => {
      const hour = new Date(d.time).getHours()
      return hour >= 22 || hour < 6
    })

    const dayAvg = {
      systolic: dayReadings.reduce((s, r) => s + r.systolic, 0) / dayReadings.length,
      diastolic: dayReadings.reduce((s, r) => s + r.diastolic, 0) / dayReadings.length,
    }
    const nightAvg = {
      systolic: nightReadings.reduce((s, r) => s + r.systolic, 0) / nightReadings.length,
      diastolic: nightReadings.reduce((s, r) => s + r.diastolic, 0) / nightReadings.length,
    }

    const nocturnalDip = {
      systolic: ((dayAvg.systolic - nightAvg.systolic) / dayAvg.systolic) * 100,
      diastolic: ((dayAvg.diastolic - nightAvg.diastolic) / dayAvg.diastolic) * 100,
    }

    const dipperPattern = this.classifyDipperPattern(nocturnalDip.systolic)
    const overallAvg = {
      systolic: (dayAvg.systolic * dayReadings.length + nightAvg.systolic * nightReadings.length) / abpmData.length,
      diastolic: (dayAvg.diastolic * dayReadings.length + nightAvg.diastolic * nightReadings.length) / abpmData.length,
    }

    const load = {
      day: {
        systolic: (dayReadings.filter(r => r.systolic >= 135).length / dayReadings.length) * 100,
        diastolic: (dayReadings.filter(r => r.diastolic >= 85).length / dayReadings.length) * 100,
      },
      night: {
        systolic: (nightReadings.filter(r => r.systolic >= 120).length / nightReadings.length) * 100,
        diastolic: (nightReadings.filter(r => r.diastolic >= 70).length / nightReadings.length) * 100,
      },
    }

    return {
      patientId,
      timestamp: new Date().toISOString(),
      summary: {
        totalReadings: abpmData.length,
        dayReadings: dayReadings.length,
        nightReadings: nightReadings.length,
      },
      averages: {
        day: { systolic: Math.round(dayAvg.systolic), diastolic: Math.round(dayAvg.diastolic) },
        night: { systolic: Math.round(nightAvg.systolic), diastolic: Math.round(nightAvg.diastolic) },
        overall: { systolic: Math.round(overallAvg.systolic), diastolic: Math.round(overallAvg.diastolic) },
      },
      nocturnalDip: {
        systolic: Math.round(nocturnalDip.systolic * 10) / 10,
        diastolic: Math.round(nocturnalDip.diastolic * 10) / 10,
      },
      dipperPattern,
      load: {
        day: { systolic: Math.round(load.day.systolic), diastolic: Math.round(load.day.diastolic) },
        night: { systolic: Math.round(load.night.systolic), diastolic: Math.round(load.night.diastolic) },
      },
      interpretation: this.interpretABPM(dipperPattern, overallAvg, load),
    }
  }

  private classifyDipperPattern(dip: number): string {
    if (dip >= 10 && dip <= 20) return '杓型(正常)'
    if (dip < 10) return '非杓型(风险增加)'
    if (dip > 20) return '超杓型'
    if (dip < 0) return '反杓型(高风险)'
    return '杓型(正常)'
  }

  private interpretABPM(pattern: string, avg: { systolic: number; diastolic: number }, load: any): string[] {
    const interpretation: string[] = []
    if (avg.systolic >= 130 || avg.diastolic >= 80) {
      interpretation.push('24小时平均血压升高，提示高血压')
    }
    if (pattern === '非杓型(风险增加)' || pattern === '反杓型(高风险)') {
      interpretation.push('夜间血压下降不足，心血管风险增加')
      interpretation.push('建议评估靶器官损害')
    }
    if (load.day.systolic > 30 || load.night.systolic > 30) {
      interpretation.push('血压负荷增高，需要积极治疗')
    }
    if (interpretation.length === 0) {
      interpretation.push('动态血压结果正常')
    }
    return interpretation
  }

  generateLifestyleRecommendations(patientId: string, systolic: number, diastolic: number) {
    const recommendations: Array<{ category: string; items: string[]; priority: 'high' | 'medium' | 'low' }> = []

    if (systolic >= 140 || diastolic >= 90) {
      recommendations.push({
        category: '饮食管理',
        items: [
          '每日钠盐摄入控制在5g以下',
          '增加富含钾的食物：香蕉、土豆、菠菜',
          'DASH饮食：多蔬菜水果、全谷物、低脂乳制品',
          '减少饱和脂肪和胆固醇摄入',
        ],
        priority: 'high',
      })
    }

    recommendations.push({
      category: '运动指导',
      items: [
        '每周至少150分钟中等强度有氧运动',
        '推荐：快走、游泳、骑自行车',
        '避免剧烈运动和憋气动作',
        '运动前后监测血压',
      ],
      priority: systolic >= 160 ? 'high' : 'medium',
    })

    recommendations.push({
      category: '体重管理',
      items: [
        '目标BMI: 18.5-23.9',
        '腰围：男性<90cm，女性<85cm',
        '每减重10kg，血压可下降5-20mmHg',
      ],
      priority: 'medium',
    })

    recommendations.push({
      category: '戒烟限酒',
      items: [
        '完全戒烟，避免二手烟',
        '限制饮酒：男性<25g酒精/天，女性<15g/天',
        '红酒不推荐用于降压',
      ],
      priority: 'high',
    })

    recommendations.push({
      category: '心理调节',
      items: [
        '保持规律作息，充足睡眠',
        '学习放松技巧：深呼吸、冥想',
        '必要时寻求心理咨询',
      ],
      priority: 'low',
    })

    return {
      patientId,
      generatedAt: new Date().toISOString(),
      currentBP: { systolic, diastolic },
      recommendations,
      estimatedBPReduction: this.estimateBPReduction(recommendations),
    }
  }

  private estimateBPReduction(recommendations: any[]): { systolic: number; diastolic: number } {
    let systolicReduction = 0
    let diastolicReduction = 0
    for (const rec of recommendations) {
      if (rec.category === '饮食管理') {
        systolicReduction += 8
        diastolicReduction += 4
      }
      if (rec.category === '运动指导') {
        systolicReduction += 5
        diastolicReduction += 3
      }
      if (rec.category === '体重管理') {
        systolicReduction += 5
        diastolicReduction += 3
      }
      if (rec.category === '戒烟限酒') {
        systolicReduction += 4
        diastolicReduction += 2
      }
    }
    return { systolic: systolicReduction, diastolic: diastolicReduction }
  }

  getGuidelines() {
    return {
      current: {
        name: '中国高血压防治指南(2024年修订版)',
        keyPoints: [
          '诊室血压≥140/90mmHg诊断为高血压',
          '家庭血压≥135/85mmHg诊断为高血压',
          '24小时动态血压≥130/80mmHg诊断为高血压',
          '目标血压：<140/90mmHg(一般患者)',
          '目标血压：<130/80mmHg(糖尿病、慢性肾病患者)',
        ],
      },
      references: [
        { name: 'ISH2020国际高血压指南', organization: '国际高血压学会' },
        { name: 'ESC/ESH2018高血压指南', organization: '欧洲心脏病学会' },
        { name: 'JNC8高血压指南', organization: '美国联合国家委员会' },
      ],
    }
  }

  getMedicationList() {
    return Object.entries(MEDICATION_CLASSES).map(([key, value]) => ({
      class: key.toUpperCase(),
      name: value.name,
      examples: value.examples,
      indications: this.getMedicationIndications(key),
      contraindications: this.getMedicationContraindications(key),
    }))
  }

  private getMedicationIndications(medClass: string): string[] {
    const indications: Record<string, string[]> = {
      ccb: ['单纯收缩期高血压', '心绞痛', '老年高血压'],
      arb: ['糖尿病肾病', '蛋白尿', '心力衰竭', '房颤'],
      acei: ['心力衰竭', '心肌梗死后', '糖尿病肾病', '蛋白尿'],
      diuretic: ['心力衰竭', '老年高血压', '单纯收缩期高血压'],
      beta_blocker: ['冠心病', '心力衰竭', '心率快'],
      alpha_blocker: ['前列腺增生', '难治性高血压'],
    }
    return indications[medClass] || []
  }

  private getMedicationContraindications(medClass: string): string[] {
    const contraindications: Record<string, string[]> = {
      ccb: ['严重心力衰竭(非二氢吡啶类)'],
      arb: ['妊娠', '高钾血症', '双侧肾动脉狭窄'],
      acei: ['妊娠', '高钾血症', '双侧肾动脉狭窄', '血管神经性水肿史'],
      diuretic: ['痛风', '严重肾功能不全'],
      beta_blocker: ['哮喘', '二度以上房室传导阻滞', '严重心动过缓'],
      alpha_blocker: ['体位性低血压'],
    }
    return contraindications[medClass] || []
  }

  getStatistics() {
    return {
      totalPatients: this.patientRecords.size,
      totalReadings: Array.from(this.patientRecords.values()).reduce((sum, records) => sum + records.length, 0),
      averageReadingsPerPatient: this.patientRecords.size > 0
        ? Math.round(Array.from(this.patientRecords.values()).reduce((sum, records) => sum + records.length, 0) / this.patientRecords.size)
        : 0,
    }
  }
}

export const hypertensionService = new HypertensionService()
