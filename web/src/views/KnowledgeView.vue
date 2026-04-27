<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { MainLayout } from '@/layouts'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconPlus from '@/components/icons/IconPlus.vue'
import IconClose from '@/components/icons/IconClose.vue'
import { knowledgeApi } from '@/services/api'
import { useToast } from '@/composables'

const toast = useToast()

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  source: string
  category: string
  metadata: Record<string, unknown>
  chunkCount: number
  createdAt: string
  updatedAt: string
}

interface KnowledgeStats {
  totalDocuments: number
  totalChunks: number
  categories: string[]
}

const documents = ref<KnowledgeDocument[]>([])
const stats = ref<KnowledgeStats | null>(null)
const isLoading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const totalDocuments = ref(0)
const pageSize = 20

const showAddModal = ref(false)
const newDoc = ref({ title: '', content: '', source: '', category: 'general' })
const isSubmitting = ref(false)

const deletingId = ref<string | null>(null)

const totalPages = computed(() => Math.ceil(totalDocuments.value / pageSize))

const loadStats = async () => {
  const result = await knowledgeApi.getStats()
  if (result.success && result.data) {
    stats.value = result.data as KnowledgeStats
  }
}

const loadDocuments = async () => {
  isLoading.value = true
  try {
    const result = await knowledgeApi.getDocuments({
      category: selectedCategory.value || undefined,
      page: currentPage.value,
      limit: pageSize,
    })
    if (result.success && result.data) {
      const data = result.data as any
      documents.value = data.documents || data || []
      totalDocuments.value = data.total || documents.value.length
    }
  } finally {
    isLoading.value = false
  }
}

const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    loadDocuments()
    return
  }
  isLoading.value = true
  try {
    const result = await knowledgeApi.search(
      searchQuery.value.trim(),
      selectedCategory.value || undefined
    )
    if (result.success && result.data) {
      documents.value = (result.data as any[]).map((r: any) => ({
        id: r.source || Math.random().toString(),
        title: r.source || '搜索结果',
        content: r.content,
        source: r.source,
        category: selectedCategory.value || 'general',
        metadata: {},
        chunkCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    }
  } finally {
    isLoading.value = false
  }
}

const handleAddDocument = async () => {
  if (!newDoc.value.title || !newDoc.value.content || !newDoc.value.source) {
    toast.warning('信息不完整', '请填写标题、内容和来源')
    return
  }
  isSubmitting.value = true
  try {
    const result = await knowledgeApi.createDocument(newDoc.value)
    if (result.success) {
      toast.success('添加成功', '知识文档已添加到知识库')
      showAddModal.value = false
      newDoc.value = { title: '', content: '', source: '', category: 'general' }
      loadDocuments()
      loadStats()
    } else {
      toast.error('添加失败', result.error?.message || '请稍后重试')
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleDelete = async (id: string) => {
  deletingId.value = id
  try {
    const result = await knowledgeApi.deleteDocument(id)
    if (result.success) {
      toast.success('删除成功', '文档已从知识库中移除')
      loadDocuments()
      loadStats()
    } else {
      toast.error('删除失败', result.error?.message || '请稍后重试')
    }
  } finally {
    deletingId.value = null
  }
}

const handleCategoryFilter = (category: string) => {
  selectedCategory.value = category
  currentPage.value = 1
  loadDocuments()
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onMounted(() => {
  loadStats()
  loadDocuments()
})
</script>

<template>
  <MainLayout>
    <div class="knowledge-page">
      <header class="page-header">
        <div class="header-content">
          <h1 class="page-title">知识库管理</h1>
          <p class="page-subtitle">管理和检索RAG知识库中的医学文档</p>
        </div>
        <button class="add-btn" @click="showAddModal = true">
          <IconPlus aria-hidden="true" />
          <span>添加文档</span>
        </button>
      </header>

      <div class="stats-grid" v-if="stats">
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalDocuments }}</span>
          <span class="stat-label">文档总数</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.totalChunks }}</span>
          <span class="stat-label">分块数量</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ stats.categories.length }}</span>
          <span class="stat-label">分类数</span>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-box">
          <IconSearch class="search-icon" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索知识库..."
            class="search-input"
            @keydown.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">搜索</button>
        </div>
        <div class="category-filters" v-if="stats && stats.categories.length > 0">
          <button
            :class="['category-tag', { active: !selectedCategory }]"
            @click="handleCategoryFilter('')"
          >
            全部
          </button>
          <button
            v-for="cat in stats.categories"
            :key="cat"
            :class="['category-tag', { active: selectedCategory === cat }]"
            @click="handleCategoryFilter(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <div class="documents-section">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div v-else-if="documents.length === 0" class="empty-state">
          <p>暂无文档</p>
          <p class="empty-hint">点击"添加文档"按钮向知识库添加内容</p>
        </div>

        <div v-else class="documents-list">
          <div v-for="doc in documents" :key="doc.id" class="document-card">
            <div class="doc-header">
              <div class="doc-title-row">
                <span class="doc-category">{{ doc.category }}</span>
                <h3 class="doc-title">{{ doc.title }}</h3>
              </div>
              <button
                class="doc-delete-btn"
                :disabled="deletingId === doc.id"
                @click="handleDelete(doc.id)"
                aria-label="删除文档"
              >
                <IconClose aria-hidden="true" />
              </button>
            </div>
            <p class="doc-content">{{ doc.content.substring(0, 200) }}{{ doc.content.length > 200 ? '...' : '' }}</p>
            <div class="doc-footer">
              <span class="doc-source">来源：{{ doc.source }}</span>
              <span class="doc-chunks">{{ doc.chunkCount }} 个分块</span>
              <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button
            class="page-btn"
            :disabled="currentPage <= 1"
            @click="currentPage--; loadDocuments()"
          >
            上一页
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="page-btn"
            :disabled="currentPage >= totalPages"
            @click="currentPage++; loadDocuments()"
          >
            下一页
          </button>
        </div>
      </div>

      <Teleport to="body">
        <div v-if="showAddModal" class="modal-overlay" @click="showAddModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2 class="modal-title">添加知识文档</h2>
              <button class="modal-close" @click="showAddModal = false" aria-label="关闭">
                <IconClose aria-hidden="true" />
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">标题</label>
                <input v-model="newDoc.title" type="text" class="form-input" placeholder="文档标题" />
              </div>
              <div class="form-group">
                <label class="form-label">来源</label>
                <input v-model="newDoc.source" type="text" class="form-input" placeholder="文档来源" />
              </div>
              <div class="form-group">
                <label class="form-label">分类</label>
                <input v-model="newDoc.category" type="text" class="form-input" placeholder="文档分类" />
              </div>
              <div class="form-group">
                <label class="form-label">内容</label>
                <textarea v-model="newDoc.content" class="form-textarea" placeholder="文档内容" rows="8"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showAddModal = false">取消</button>
              <button class="btn-primary" :disabled="isSubmitting" @click="handleAddDocument">
                {{ isSubmitting ? '添加中...' : '添加' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </MainLayout>
</template>

<style scoped>
.knowledge-page {
  max-width: 960px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-6);
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-1) 0;
}

.page-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-5);
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  box-shadow: 0 2px 12px rgba(0, 122, 255, 0.25);
  transition: all var(--transition-fast);
}

.add-btn:hover {
  box-shadow: 0 4px 20px rgba(0, 122, 255, 0.35);
  transform: translateY(-1px);
}

.add-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-5);
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
}

.stat-value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  line-height: 1;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-2);
}

.filter-bar {
  margin-bottom: var(--spacing-4);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2) var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-btn {
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background-color var(--transition-fast);
}

.search-btn:hover {
  background: var(--color-primary-dark);
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.category-tag {
  padding: var(--spacing-1) var(--spacing-3);
  background-color: var(--color-fill-tertiary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.category-tag:hover {
  background-color: var(--color-fill-primary);
  color: var(--color-primary);
}

.category-tag.active {
  background: var(--color-primary-gradient);
  color: var(--color-text-inverse);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-12) var(--spacing-4);
  text-align: center;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
  margin-bottom: var(--spacing-3);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin-top: var(--spacing-2);
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.document-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
}

.document-card:hover {
  box-shadow: var(--shadow-md);
}

.doc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}

.doc-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.doc-category {
  padding: 2px 8px;
  background: var(--color-primary-gradient);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
  flex-shrink: 0;
}

.doc-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: var(--color-text-quaternary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.doc-delete-btn:hover:not(:disabled) {
  background-color: var(--color-error-bg);
  color: var(--color-error);
}

.doc-delete-btn:disabled {
  opacity: 0.5;
}

.doc-delete-btn :deep(svg) {
  width: 16px;
  height: 16px;
}

.doc-content {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-body);
  margin: 0 0 var(--spacing-3) 0;
}

.doc-footer {
  display: flex;
  gap: var(--spacing-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-4);
  margin-top: var(--spacing-6);
}

.page-btn {
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  background-color: var(--color-primary-bg);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal-backdrop);
  padding: var(--spacing-4);
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-2xl);
  max-width: 560px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-float);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-5);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--color-text-tertiary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background-color: var(--color-fill-tertiary);
  color: var(--color-text-primary);
}

.modal-close :deep(svg) {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: var(--spacing-5);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.form-input,
.form-textarea {
  padding: var(--spacing-3);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast);
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  padding: var(--spacing-4) var(--spacing-5);
  border-top: 1px solid var(--color-border);
}

.btn-secondary {
  padding: var(--spacing-2) var(--spacing-5);
  background-color: var(--color-fill-tertiary);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.btn-secondary:hover {
  background-color: var(--color-fill-secondary);
}

.btn-primary {
  padding: var(--spacing-2) var(--spacing-5);
  background: var(--color-primary-gradient);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-inverse);
  transition: all var(--transition-fast);
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 2px 12px rgba(0, 122, 255, 0.35);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .knowledge-page {
    padding: var(--spacing-4);
  }

  .page-header {
    flex-direction: column;
    gap: var(--spacing-3);
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-2);
  }

  .stat-card {
    padding: var(--spacing-3);
  }

  .stat-value {
    font-size: var(--font-size-2xl);
  }
}
</style>
