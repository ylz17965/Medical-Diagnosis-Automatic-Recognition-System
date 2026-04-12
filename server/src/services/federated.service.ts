import crypto from 'crypto'

interface HospitalNode {
  id: string
  name: string
  publicKey: string
  endpoint: string
  status: 'active' | 'inactive' | 'syncing'
  lastSync: string
  dataCount: number
}

interface FederatedSearchParams {
  query: string
  hospitalFilter?: string[]
  privacyEpsilon?: number
  maxResults?: number
}

interface SearchResult {
  hospitalId: string
  hospitalName: string
  resultCount: number
  relevanceScore: number
  encryptedPreview: string
  timestamp: string
}

interface FederatedSearchResult {
  query: string
  totalResults: number
  participatingHospitals: number
  results: SearchResult[]
  aggregatedInsights: string[]
  privacyMetrics: {
    epsilon: number
    noiseLevel: number
    privacyBudgetConsumed: number
  }
  timestamp: string
}

interface LocalModelUpdate {
  hospitalId: string
  modelUpdate: number[]
  sampleCount: number
}

interface AggregationResult {
  roundId: string
  globalModelHash: string
  participatingHospitals: number
  totalSamples: number
  convergenceMetrics: {
    loss: number
    accuracy: number
  }
  timestamp: string
}

interface AuditLogEntry {
  id: string
  action: string
  hospitalId?: string
  details: Record<string, unknown>
  timestamp: string
}

interface PrivacyBudget {
  total: number
  consumed: number
  remaining: number
  lastConsumption: string | null
}

interface FederatedMetrics {
  totalHospitals: number
  activeHospitals: number
  totalSearches: number
  totalAggregations: number
  averageSearchLatency: number
  privacyBudgetStatus: PrivacyBudget
  lastActivity: string | null
}

class FederatedLearningService {
  private hospitals: Map<string, HospitalNode> = new Map()
  private auditLog: AuditLogEntry[] = []
  private privacyBudget: PrivacyBudget = {
    total: 10.0,
    consumed: 0,
    remaining: 10.0,
    lastConsumption: null
  }
  private metrics = {
    totalSearches: 0,
    totalAggregations: 0,
    searchLatencies: [] as number[]
  }
  private globalModel: number[] = []
  private currentRound: number = 0

  constructor() {
    this.initializeDefaultHospitals()
  }

  private initializeDefaultHospitals(): void {
    const defaultHospitals: HospitalNode[] = [
      {
        id: 'hospital_001',
        name: '北京协和医院',
        publicKey: this.generateKeyPair().publicKey,
        endpoint: 'https://pumch.federated.local',
        status: 'active',
        lastSync: new Date().toISOString(),
        dataCount: 125000
      },
      {
        id: 'hospital_002',
        name: '上海瑞金医院',
        publicKey: this.generateKeyPair().publicKey,
        endpoint: 'https://ruijin.federated.local',
        status: 'active',
        lastSync: new Date().toISOString(),
        dataCount: 98000
      },
      {
        id: 'hospital_003',
        name: '广州中山医院',
        publicKey: this.generateKeyPair().publicKey,
        endpoint: 'https://zs-hospital.federated.local',
        status: 'active',
        lastSync: new Date().toISOString(),
        dataCount: 87000
      }
    ]

    for (const hospital of defaultHospitals) {
      this.hospitals.set(hospital.id, hospital)
    }

    this.logAudit('SYSTEM_INIT', { hospitalsCount: defaultHospitals.length })
  }

  private generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    })
    return { publicKey, privateKey }
  }

  registerHospital(hospital: { id: string; name: string; publicKey: string; endpoint: string; dataCount?: number }): HospitalNode {
    const newHospital: HospitalNode = {
      ...hospital,
      lastSync: new Date().toISOString(),
      dataCount: hospital.dataCount || Math.floor(Math.random() * 50000) + 10000,
      status: 'active'
    }

    this.hospitals.set(hospital.id, newHospital)
    this.logAudit('HOSPITAL_REGISTER', { hospitalId: hospital.id, name: hospital.name })

    return newHospital
  }

  getHospitals(): HospitalNode[] {
    return Array.from(this.hospitals.values())
  }

  getStatus(): { status: string; hospitals: number; privacyBudget: PrivacyBudget } {
    return {
      status: 'active',
      hospitals: this.hospitals.size,
      privacyBudget: this.privacyBudget
    }
  }

  async federatedSearch(params: FederatedSearchParams): Promise<FederatedSearchResult> {
    const startTime = Date.now()
    const { query, hospitalFilter, privacyEpsilon = 0.1, maxResults = 10 } = params

    const participatingHospitals = hospitalFilter
      ? Array.from(this.hospitals.values()).filter(h => hospitalFilter.includes(h.id))
      : Array.from(this.hospitals.values()).filter(h => h.status === 'active')

    if (participatingHospitals.length === 0) {
      throw new Error('No participating hospitals available')
    }

    const budgetResult = this.consumePrivacyBudget(privacyEpsilon)
    if (!budgetResult.success) {
      throw new Error('Insufficient privacy budget')
    }

    const results: SearchResult[] = []

    for (const hospital of participatingHospitals) {
      const localResult = await this.simulateLocalSearch(hospital, query, maxResults)
      results.push(localResult)
    }

    const aggregatedResults = this.secureAggregate(results, privacyEpsilon)

    const insights = this.generateInsights(query, aggregatedResults)

    const latency = Date.now() - startTime
    this.metrics.totalSearches++
    this.metrics.searchLatencies.push(latency)

    this.logAudit('FEDERATED_SEARCH', {
      query,
      hospitalsCount: participatingHospitals.length,
      epsilon: privacyEpsilon,
      latency
    })

    return {
      query,
      totalResults: aggregatedResults.reduce((sum, r) => sum + r.resultCount, 0),
      participatingHospitals: participatingHospitals.length,
      results: aggregatedResults,
      aggregatedInsights: insights,
      privacyMetrics: {
        epsilon: privacyEpsilon,
        noiseLevel: this.calculateNoiseLevel(privacyEpsilon),
        privacyBudgetConsumed: privacyEpsilon
      },
      timestamp: new Date().toISOString()
    }
  }

  private async simulateLocalSearch(
    hospital: HospitalNode,
    query: string,
    maxResults: number
  ): Promise<SearchResult> {
    await new Promise(resolve => setTimeout(resolve, 50))

    const relevanceScore = Math.random() * 0.3 + 0.7
    const resultCount = Math.floor(Math.random() * maxResults) + 1

    const preview = this.encryptData(
      JSON.stringify({
        query,
        sampleResults: Array(Math.min(3, resultCount)).fill(null).map((_, i) => ({
          id: `result_${hospital.id}_${i}`,
          snippet: `相关医学内容片段 ${i + 1}`,
          score: Math.random() * 0.2 + 0.8
        }))
      })
    )

    return {
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      resultCount,
      relevanceScore,
      encryptedPreview: preview,
      timestamp: new Date().toISOString()
    }
  }

  private secureAggregate(results: SearchResult[], epsilon: number): SearchResult[] {
    const noiseScale = 1 / epsilon

    return results.map(result => ({
      ...result,
      relevanceScore: Math.min(1, Math.max(0, result.relevanceScore + (Math.random() - 0.5) * noiseScale * 0.1)),
      resultCount: Math.max(0, Math.round(result.resultCount + (Math.random() - 0.5) * noiseScale * 2))
    }))
  }

  private generateInsights(query: string, results: SearchResult[]): string[] {
    const insights: string[] = []

    const totalResults = results.reduce((sum, r) => sum + r.resultCount, 0)
    insights.push(`联邦检索共发现 ${totalResults} 条相关记录`)

    const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
    insights.push(`平均相关度: ${(avgRelevance * 100).toFixed(1)}%`)

    const topHospital = results.reduce((best, r) =>
      r.relevanceScore > best.relevanceScore ? r : best
    )
    insights.push(`最相关数据源: ${topHospital.hospitalName}`)

    insights.push('数据隐私保护: 差分隐私噪声已添加，原始数据未离开本地')

    return insights
  }

  private calculateNoiseLevel(epsilon: number): number {
    return Math.sqrt(2 * Math.log(1.25 / 1e-5)) / epsilon
  }

  private encryptData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 64)
  }

  aggregateModels(roundId: string, localModels: LocalModelUpdate[]): AggregationResult {
    this.currentRound++

    const totalSamples = localModels.reduce((sum, m) => sum + m.sampleCount, 0)

    const weightedModel: number[] = []
    const modelLength = localModels[0]?.modelUpdate.length || 128

    for (let i = 0; i < modelLength; i++) {
      let weightedSum = 0
      for (const model of localModels) {
        const weight = model.sampleCount / totalSamples
        weightedSum += (model.modelUpdate[i] || 0) * weight
      }
      weightedModel.push(weightedSum)
    }

    this.globalModel = weightedModel

    const modelHash = crypto.createHash('sha256')
      .update(JSON.stringify(weightedModel))
      .digest('hex')

    const result: AggregationResult = {
      roundId,
      globalModelHash: modelHash,
      participatingHospitals: localModels.length,
      totalSamples,
      convergenceMetrics: {
        loss: Math.random() * 0.1 + 0.05,
        accuracy: Math.random() * 0.05 + 0.9
      },
      timestamp: new Date().toISOString()
    }

    this.metrics.totalAggregations++
    this.logAudit('MODEL_AGGREGATION', {
      roundId,
      hospitalsCount: localModels.length,
      totalSamples
    })

    return result
  }

  getPrivacyBudget(): PrivacyBudget {
    return { ...this.privacyBudget }
  }

  consumePrivacyBudget(amount: number): { success: boolean; consumed: number; remaining: number } {
    if (this.privacyBudget.remaining < amount) {
      return {
        success: false,
        consumed: 0,
        remaining: this.privacyBudget.remaining
      }
    }

    this.privacyBudget.consumed += amount
    this.privacyBudget.remaining -= amount
    this.privacyBudget.lastConsumption = new Date().toISOString()

    return {
      success: true,
      consumed: amount,
      remaining: this.privacyBudget.remaining
    }
  }

  verifyDataIntegrity(hospitalId: string, dataHash: string): { verified: boolean; details: Record<string, unknown> } {
    const hospital = this.hospitals.get(hospitalId)

    if (!hospital) {
      return {
        verified: false,
        details: { error: 'Hospital not found' }
      }
    }

    const expectedHash = crypto.createHash('sha256')
      .update(`${hospitalId}:${hospital.dataCount}:${hospital.lastSync}`)
      .digest('hex')

    const verified = dataHash === expectedHash.substring(0, 32)

    this.logAudit('DATA_VERIFICATION', {
      hospitalId,
      verified,
      providedHash: dataHash
    })

    return {
      verified,
      details: {
        hospitalId,
        hospitalName: hospital.name,
        lastSync: hospital.lastSync,
        dataCount: hospital.dataCount
      }
    }
  }

  getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog].reverse()
  }

  private logAudit(action: string, details: Record<string, unknown>, hospitalId?: string): void {
    this.auditLog.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      hospitalId,
      details,
      timestamp: new Date().toISOString()
    })

    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500)
    }
  }

  getMetrics(): FederatedMetrics {
    const activeHospitals = Array.from(this.hospitals.values())
      .filter(h => h.status === 'active').length

    const avgLatency = this.metrics.searchLatencies.length > 0
      ? this.metrics.searchLatencies.reduce((a, b) => a + b, 0) / this.metrics.searchLatencies.length
      : 0

    const lastActivity = this.auditLog.length > 0
      ? this.auditLog[this.auditLog.length - 1].timestamp
      : null

    return {
      totalHospitals: this.hospitals.size,
      activeHospitals,
      totalSearches: this.metrics.totalSearches,
      totalAggregations: this.metrics.totalAggregations,
      averageSearchLatency: Math.round(avgLatency),
      privacyBudgetStatus: this.getPrivacyBudget(),
      lastActivity
    }
  }
}

export const federatedLearningService = new FederatedLearningService()
export type { HospitalNode, FederatedSearchResult, SearchResult, AggregationResult, PrivacyBudget, FederatedMetrics }
