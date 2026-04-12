import crypto from 'crypto'

interface AttestationRecord {
  adviceId: string
  contentHash: string
  patientId: string
  timestamp: number
  blockNumber: number
  txHash: string
  doctorVerified: boolean
  doctorId?: string
  patientConsent: boolean
  verificationCount: number
  lastVerification?: number
}

interface VerificationResult {
  verified: boolean
  attestation?: AttestationRecord
  contentMatch: boolean
  timestamp?: number
  blockNumber?: number
  explorerUrl?: string
}

interface Block {
  number: number
  hash: string
  previousHash: string
  timestamp: number
  transactions: string[]
  nonce: number
}

interface BlockchainStatus {
  chainId: string
  network: string
  blockHeight: number
  totalAttestations: number
  connected: boolean
  consensusNodes: number
}

interface AuditTrailEntry {
  timestamp: number
  action: string
  actor?: string
  details: Record<string, unknown>
}

interface Statistics {
  totalAttestations: number
  totalVerifications: number
  totalDoctorVerifications: number
  averageVerificationTime: number
  lastBlockTime: number | null
  chainIntegrity: boolean
}

class BlockchainService {
  private chain: Block[] = []
  private attestations: Map<string, AttestationRecord> = new Map()
  private patientAttestations: Map<string, string[]> = new Map()
  private auditTrails: Map<string, AuditTrailEntry[]> = new Map()
  private pendingTransactions: string[] = []
  private difficulty = 4
  private miningReward = 1
  private blockTime = 10000

  private stats = {
    totalVerifications: 0,
    totalDoctorVerifications: 0,
    verificationTimes: [] as number[]
  }

  constructor() {
    this.createGenesisBlock()
  }

  private createGenesisBlock(): void {
    const genesisBlock: Block = {
      number: 0,
      hash: this.calculateHash(0, '0', Date.now(), [], 0),
      previousHash: '0',
      timestamp: Date.now(),
      transactions: [],
      nonce: 0
    }

    this.chain.push(genesisBlock)
  }

  private calculateHash(
    blockNumber: number,
    previousHash: string,
    timestamp: number,
    transactions: string[],
    nonce: number
  ): string {
    const data = blockNumber + previousHash + timestamp + JSON.stringify(transactions) + nonce
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  private mineBlock(transactions: string[]): Block {
    const previousBlock = this.chain[this.chain.length - 1]
    const blockNumber = previousBlock.number + 1
    const timestamp = Date.now()
    let nonce = 0
    let hash = this.calculateHash(blockNumber, previousBlock.hash, timestamp, transactions, nonce)

    const target = '0'.repeat(this.difficulty)

    while (!hash.startsWith(target)) {
      nonce++
      hash = this.calculateHash(blockNumber, previousBlock.hash, timestamp, transactions, nonce)
    }

    const newBlock: Block = {
      number: blockNumber,
      hash,
      previousHash: previousBlock.hash,
      timestamp,
      transactions,
      nonce
    }

    this.chain.push(newBlock)
    return newBlock
  }

  private generateTxHash(): string {
    return '0x' + crypto.randomBytes(32).toString('hex')
  }

  async attestAdvice(params: {
    adviceId: string
    adviceContent: string
    patientId: string
    doctorVerified: boolean
    patientConsent: boolean
  }): Promise<AttestationRecord & { explorerUrl: string }> {
    const { adviceId, adviceContent, patientId, doctorVerified, patientConsent } = params

    const contentHash = crypto.createHash('sha256').update(adviceContent).digest('hex')

    const txHash = this.generateTxHash()
    this.pendingTransactions.push(txHash)

    if (this.pendingTransactions.length >= 1) {
      this.mineBlock([...this.pendingTransactions])
      this.pendingTransactions = []
    }

    const blockNumber = this.chain.length - 1

    const attestation: AttestationRecord = {
      adviceId,
      contentHash,
      patientId,
      timestamp: Date.now(),
      blockNumber,
      txHash,
      doctorVerified,
      patientConsent,
      verificationCount: 0
    }

    this.attestations.set(adviceId, attestation)

    const patientAtts = this.patientAttestations.get(patientId) || []
    patientAtts.push(adviceId)
    this.patientAttestations.set(patientId, patientAtts)

    this.addAuditEntry(adviceId, 'ATTEST', undefined, {
      patientId,
      blockNumber,
      txHash,
      doctorVerified,
      patientConsent
    })

    return {
      ...attestation,
      explorerUrl: `https://explorer.medical-chain.io/tx/${txHash}`
    }
  }

  verifyAdvice(adviceId: string, currentContent: string): VerificationResult {
    const startTime = Date.now()
    const attestation = this.attestations.get(adviceId)

    if (!attestation) {
      return {
        verified: false,
        contentMatch: false
      }
    }

    const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex')
    const contentMatch = currentHash === attestation.contentHash

    attestation.verificationCount++
    attestation.lastVerification = Date.now()

    this.stats.totalVerifications++
    this.stats.verificationTimes.push(Date.now() - startTime)

    this.addAuditEntry(adviceId, 'VERIFY', undefined, {
      contentMatch,
      verificationCount: attestation.verificationCount
    })

    return {
      verified: true,
      attestation,
      contentMatch,
      timestamp: attestation.timestamp,
      blockNumber: attestation.blockNumber,
      explorerUrl: `https://explorer.medical-chain.io/tx/${attestation.txHash}`
    }
  }

  doctorVerify(adviceId: string, doctorId: string): { success: boolean; message: string } {
    const attestation = this.attestations.get(adviceId)

    if (!attestation) {
      return { success: false, message: '存证记录不存在' }
    }

    if (attestation.doctorVerified) {
      return { success: false, message: '该建议已被医生验证' }
    }

    attestation.doctorVerified = true
    attestation.doctorId = doctorId

    this.stats.totalDoctorVerifications++

    this.addAuditEntry(adviceId, 'DOCTOR_VERIFY', doctorId, {
      verifiedAt: Date.now()
    })

    return { success: true, message: '医生验证成功' }
  }

  getAttestation(adviceId: string): AttestationRecord | null {
    return this.attestations.get(adviceId) || null
  }

  getAllAttestations(): AttestationRecord[] {
    return Array.from(this.attestations.values())
  }

  getPatientAttestations(patientId: string): AttestationRecord[] {
    const adviceIds = this.patientAttestations.get(patientId) || []
    return adviceIds
      .map(id => this.attestations.get(id))
      .filter((a): a is AttestationRecord => a !== undefined)
  }

  getLatestBlocks(count: number = 10): Block[] {
    return this.chain.slice(-count).reverse()
  }

  getBlock(blockNumber: number): Block | null {
    return this.chain.find(b => b.number === blockNumber) || null
  }

  getStatus(): BlockchainStatus {
    return {
      chainId: '0xMEDICAL_CHAIN',
      network: 'Medical Attestation Network',
      blockHeight: this.chain.length - 1,
      totalAttestations: this.attestations.size,
      connected: true,
      consensusNodes: 3
    }
  }

  getStatistics(): Statistics {
    const avgTime = this.stats.verificationTimes.length > 0
      ? this.stats.verificationTimes.reduce((a, b) => a + b, 0) / this.stats.verificationTimes.length
      : 0

    const lastBlock = this.chain[this.chain.length - 1]

    return {
      totalAttestations: this.attestations.size,
      totalVerifications: this.stats.totalVerifications,
      totalDoctorVerifications: this.stats.totalDoctorVerifications,
      averageVerificationTime: Math.round(avgTime),
      lastBlockTime: lastBlock ? lastBlock.timestamp : null,
      chainIntegrity: this.validateChain()
    }
  }

  getAuditTrail(adviceId: string): AuditTrailEntry[] {
    return this.auditTrails.get(adviceId) || []
  }

  private addAuditEntry(
    adviceId: string,
    action: string,
    actor?: string,
    details: Record<string, unknown> = {}
  ): void {
    const trail = this.auditTrails.get(adviceId) || []

    trail.push({
      timestamp: Date.now(),
      action,
      actor,
      details
    })

    this.auditTrails.set(adviceId, trail)
  }

  private validateChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i]
      const previousBlock = this.chain[i - 1]

      const expectedHash = this.calculateHash(
        currentBlock.number,
        currentBlock.previousHash,
        currentBlock.timestamp,
        currentBlock.transactions,
        currentBlock.nonce
      )

      if (currentBlock.hash !== expectedHash) {
        return false
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false
      }
    }

    return true
  }
}

export const blockchainService = new BlockchainService()
export type { AttestationRecord, VerificationResult, Block, BlockchainStatus, Statistics }
