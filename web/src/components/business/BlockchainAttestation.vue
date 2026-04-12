<script setup lang="ts">
import { ref, computed } from 'vue'
import IconLink from '@/components/icons/IconLink.vue'

interface Props {
  txHash: string
  blockNumber?: number
  timestamp?: string
  contentHash?: string
  network?: string
}

const props = withDefaults(defineProps<Props>(), {
  network: 'sepolia'
})

const showDetails = ref(false)

const shortHash = computed(() => {
  if (!props.txHash) return ''
  return `${props.txHash.slice(0, 10)}...${props.txHash.slice(-8)}`
})

const explorerUrl = computed(() => {
  if (props.network === 'sepolia') {
    return `https://sepolia.etherscan.io/tx/${props.txHash}`
  }
  return `https://etherscan.io/tx/${props.txHash}`
})

const copyHash = async () => {
  try {
    await navigator.clipboard.writeText(props.txHash)
  } catch (e) {
    console.error('复制失败', e)
  }
}
</script>

<template>
  <div class="blockchain-attestation">
    <div class="attestation-header" @click="showDetails = !showDetails">
      <div class="attestation-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="attestation-info">
        <span class="attestation-label">区块链存证</span>
        <span class="attestation-hash">{{ shortHash }}</span>
      </div>
      <div class="attestation-badge">
        <span class="badge-verified">已验证</span>
      </div>
    </div>
    
    <div v-if="showDetails" class="attestation-details">
      <div class="detail-row">
        <span class="detail-label">交易哈希</span>
        <div class="detail-value">
          <span class="mono">{{ txHash }}</span>
          <button class="copy-btn" @click.stop="copyHash">复制</button>
        </div>
      </div>
      
      <div v-if="blockNumber" class="detail-row">
        <span class="detail-label">区块高度</span>
        <span class="detail-value mono">{{ blockNumber.toLocaleString() }}</span>
      </div>
      
      <div v-if="timestamp" class="detail-row">
        <span class="detail-label">存证时间</span>
        <span class="detail-value">{{ timestamp }}</span>
      </div>
      
      <div v-if="contentHash" class="detail-row">
        <span class="detail-label">内容哈希</span>
        <span class="detail-value mono small">{{ contentHash }}</span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">网络</span>
        <span class="detail-value">{{ network === 'sepolia' ? 'Sepolia测试网' : '以太坊主网' }}</span>
      </div>
      
      <div class="detail-actions">
        <a :href="explorerUrl" target="_blank" rel="noopener" class="explorer-link">
          <IconLink />
          <span>在区块浏览器中查看</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blockchain-attestation {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-top: var(--spacing-3);
}

.attestation-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  cursor: pointer;
  transition: background-color 0.2s;
}

.attestation-header:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.attestation-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.attestation-icon svg {
  width: 20px;
  height: 20px;
}

.attestation-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attestation-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.attestation-hash {
  font-size: var(--font-size-xs);
  font-family: monospace;
  color: var(--color-text-tertiary);
}

.attestation-badge {
  display: flex;
  align-items: center;
}

.badge-verified {
  padding: 2px 8px;
  background: rgba(16, 185, 129, 0.15);
  color: #10B981;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
}

.attestation-details {
  padding: var(--spacing-3);
  border-top: 1px solid rgba(99, 102, 241, 0.2);
  background: rgba(0, 0, 0, 0.1);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-row:last-of-type {
  border-bottom: none;
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  text-align: right;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.detail-value.mono {
  font-family: monospace;
}

.detail-value.small {
  font-size: var(--font-size-xs);
}

.copy-btn {
  padding: 2px 6px;
  background: rgba(99, 102, 241, 0.2);
  border: none;
  border-radius: var(--radius-sm);
  color: #818cf8;
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(99, 102, 241, 0.3);
}

.detail-actions {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.explorer-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-md);
  color: #a5b4fc;
  font-size: var(--font-size-sm);
  text-decoration: none;
  transition: all 0.2s;
}

.explorer-link:hover {
  background: rgba(99, 102, 241, 0.3);
  color: white;
}

.explorer-link svg {
  width: 16px;
  height: 16px;
}
</style>
