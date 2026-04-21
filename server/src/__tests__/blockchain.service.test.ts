import { describe, it, expect, beforeEach } from 'vitest'
import { blockchainService } from '../services/blockchain.service.js'

describe('BlockchainService', () => {
  beforeEach(() => {
  })

  describe('attestAdvice', () => {
    it('should create attestation record', async () => {
      const result = await blockchainService.attestAdvice({
        adviceId: 'advice-001',
        adviceContent: '建议定期进行肺部CT检查',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      expect(result.adviceId).toBe('advice-001')
      expect(result.contentHash).toBeDefined()
      expect(result.txHash).toBeDefined()
      expect(result.blockNumber).toBeGreaterThanOrEqual(0)
      expect(result.explorerUrl).toContain('explorer')
    })

    it('should generate unique transaction hashes', async () => {
      const result1 = await blockchainService.attestAdvice({
        adviceId: 'advice-002',
        adviceContent: '内容1',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const result2 = await blockchainService.attestAdvice({
        adviceId: 'advice-003',
        adviceContent: '内容2',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      expect(result1.txHash).not.toBe(result2.txHash)
    })

    it('should generate consistent content hash for same content', async () => {
      const result1 = await blockchainService.attestAdvice({
        adviceId: 'advice-004',
        adviceContent: '相同的内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const result2 = await blockchainService.attestAdvice({
        adviceId: 'advice-005',
        adviceContent: '相同的内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      expect(result1.contentHash).toBe(result2.contentHash)
    })
  })

  describe('verifyAdvice', () => {
    it('should verify existing attestation', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-verify-001',
        adviceContent: '原始内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const result = blockchainService.verifyAdvice(
        'advice-verify-001',
        '原始内容'
      )

      expect(result.verified).toBe(true)
      expect(result.contentMatch).toBe(true)
      expect(result.attestation).toBeDefined()
    })

    it('should detect content mismatch', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-verify-002',
        adviceContent: '原始内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const result = blockchainService.verifyAdvice(
        'advice-verify-002',
        '被篡改的内容'
      )

      expect(result.verified).toBe(true)
      expect(result.contentMatch).toBe(false)
    })

    it('should return not verified for non-existent attestation', () => {
      const result = blockchainService.verifyAdvice(
        'non-existent-id',
        '任何内容'
      )

      expect(result.verified).toBe(false)
      expect(result.contentMatch).toBe(false)
    })
  })

  describe('doctorVerify', () => {
    it('should verify by doctor', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-doctor-001',
        adviceContent: '需要医生验证的建议',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const result = blockchainService.doctorVerify(
        'advice-doctor-001',
        'doctor-001'
      )

      expect(result.success).toBe(true)
      expect(result.message).toContain('成功')
    })

    it('should fail for non-existent attestation', () => {
      const result = blockchainService.doctorVerify(
        'non-existent-id',
        'doctor-001'
      )

      expect(result.success).toBe(false)
      expect(result.message).toContain('不存在')
    })

    it('should fail for already verified attestation', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-doctor-002',
        adviceContent: '内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      await blockchainService.doctorVerify('advice-doctor-002', 'doctor-001')
      const result = blockchainService.doctorVerify('advice-doctor-002', 'doctor-002')

      expect(result.success).toBe(false)
      expect(result.message).toContain('已被医生验证')
    })
  })

  describe('getAttestation', () => {
    it('should return attestation by id', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-get-001',
        adviceContent: '测试内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const attestation = blockchainService.getAttestation('advice-get-001')

      expect(attestation).not.toBeNull()
      expect(attestation?.adviceId).toBe('advice-get-001')
    })

    it('should return null for non-existent attestation', () => {
      const attestation = blockchainService.getAttestation('non-existent-id')
      expect(attestation).toBeNull()
    })
  })

  describe('getPatientAttestations', () => {
    it('should return all attestations for a patient', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-patient-001',
        adviceContent: '内容1',
        patientId: 'patient-multi',
        doctorVerified: false,
        patientConsent: true,
      })

      await blockchainService.attestAdvice({
        adviceId: 'advice-patient-002',
        adviceContent: '内容2',
        patientId: 'patient-multi',
        doctorVerified: false,
        patientConsent: true,
      })

      const attestations = blockchainService.getPatientAttestations('patient-multi')

      expect(attestations.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('getStatus', () => {
    it('should return blockchain status', () => {
      const status = blockchainService.getStatus()

      expect(status.chainId).toBeDefined()
      expect(status.network).toBeDefined()
      expect(status.blockHeight).toBeGreaterThanOrEqual(0)
      expect(status.connected).toBe(true)
    })
  })

  describe('getStatistics', () => {
    it('should return blockchain statistics', () => {
      const stats = blockchainService.getStatistics()

      expect(stats).toHaveProperty('totalAttestations')
      expect(stats).toHaveProperty('totalVerifications')
      expect(stats).toHaveProperty('chainIntegrity')
    })
  })

  describe('getAuditTrail', () => {
    it('should return audit trail for attestation', async () => {
      await blockchainService.attestAdvice({
        adviceId: 'advice-audit-001',
        adviceContent: '审计内容',
        patientId: 'patient-001',
        doctorVerified: false,
        patientConsent: true,
      })

      const trail = blockchainService.getAuditTrail('advice-audit-001')

      expect(trail.length).toBeGreaterThan(0)
      expect(trail[0].action).toBe('ATTEST')
    })
  })

  describe('getLatestBlocks', () => {
    it('should return latest blocks', () => {
      const blocks = blockchainService.getLatestBlocks(5)

      expect(blocks.length).toBeLessThanOrEqual(5)
      expect(blocks[0]).toHaveProperty('number')
      expect(blocks[0]).toHaveProperty('hash')
      expect(blocks[0]).toHaveProperty('timestamp')
    })
  })

  describe('chain integrity', () => {
    it('should maintain valid chain', () => {
      const stats = blockchainService.getStatistics()
      expect(stats.chainIntegrity).toBe(true)
    })
  })
})
