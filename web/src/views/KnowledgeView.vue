<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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
const isSearching = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const totalDocuments = ref(0)
const pageSize = 5

const showAddModal = ref(false)
const newDoc = ref({ title: '', content: '', source: '', category: 'general' })
const isSubmitting = ref(false)

const deletingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const confirmBatchDelete = ref(false)

const selectedIds = ref<Set<string>>(new Set())
const isBatchDeleting = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalDocuments.value / pageSize)))

const hasSearch = computed(() => searchQuery.value.trim().length > 0)

const selectedCount = computed(() => selectedIds.value.size)

const isAllSelected = computed(() =>
  documents.value.length > 0 && selectedIds.value.size === documents.value.filter(d => !d.id.startsWith('search-')).length
)

const hasBatchActions = computed(() => !hasSearch.value && selectedCount.value > 0)

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
      const data = result.data as { documents: KnowledgeDocument[]; total: number }
      documents.value = data.documents || []
      totalDocuments.value = data.total || 0
    }
  } finally {
    isLoading.value = false
  }
}

const handleSearch = async () => {
  const query = searchQuery.value.trim()
  if (!query) {
    loadDocuments()
    return
  }
  isSearching.value = true
  try {
    const result = await knowledgeApi.search(query, selectedCategory.value || undefined)
    if (result.success && result.data) {
      const results = result.data as { content: string; source: string; score: number }[]
      documents.value = results.map((r, i) => ({
        id: `search-${i}-${Date.now()}`,
        title: r.source || `搜索结果 ${i + 1}`,
        content: r.content,
        source: r.source || '知识库',
        category: selectedCategory.value || 'search',
        metadata: {},
        chunkCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      totalDocuments.value = results.length
    }
  } finally {
    isSearching.value = false
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
  loadDocuments()
}

const debouncedSearch = () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    if (hasSearch.value) {
      handleSearch()
    }
  }, 400)
}

watch(searchQuery, () => {
  if (!searchQuery.value.trim()) {
    if (searchTimer) clearTimeout(searchTimer)
    currentPage.value = 1
    loadDocuments()
  }
})

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

const confirmDelete = (id: string) => {
  confirmDeleteId.value = id
}

const cancelDelete = () => {
  confirmDeleteId.value = null
}

const toggleSelect = (id: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = new Set()
  } else {
    const ids = documents.value.filter(d => !d.id.startsWith('search-')).map(d => d.id)
    selectedIds.value = new Set(ids)
  }
}

const clearSelection = () => {
  selectedIds.value = new Set()
}

const handleBatchDelete = async () => {
  confirmBatchDelete.value = false
  isBatchDeleting.value = true
  const ids = Array.from(selectedIds.value)
  try {
    const result = await knowledgeApi.batchDelete(ids)
    if (result.success) {
      toast.success('批量删除成功', `成功删除 ${result.data?.deleted || ids.length} 个文档`)
      selectedIds.value = new Set()
      loadDocuments()
      loadStats()
    } else {
      toast.error('批量删除失败', result.error?.message || '请稍后重试')
    }
  } finally {
    isBatchDeleting.value = false
  }
}

const handleDelete = async (id: string) => {
  confirmDeleteId.value = null
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

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
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
            @input="debouncedSearch"
            @keydown.enter="handleSearch"
          />
          <button v-if="hasSearch" class="clear-search-btn" @click="clearSearch" aria-label="清除搜索">清除</button>
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

      <div v-if="hasBatchActions" class="batch-bar">
        <span class="batch-info">已选择 {{ selectedCount }} 项</span>
        <button class="batch-delete-btn" @click="confirmBatchDelete = true">批量删除</button>
        <button class="batch-cancel-btn" @click="clearSelection">取消选择</button>
      </div>

      <div class="documents-section">
        <div v-if="isLoading || isSearching || isBatchDeleting" class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ isBatchDeleting ? '删除中...' : isSearching ? '搜索中...' : '加载中...' }}</p>
        </div>

        <div v-else-if="documents.length === 0 && hasSearch" class="empty-state">
          <p>未找到匹配的文档</p>
          <p class="empty-hint">尝试使用不同的关键词搜索，或<button class="link-btn" @click="clearSearch">查看全部文档</button></p>
        </div>

        <div v-else-if="documents.length === 0" class="empty-state">
          <p>知识库为空</p>
          <p class="empty-hint">点击右上角"添加文档"按钮向知识库添加内容</p>
        </div>

        <div v-else>
          <div v-if="!hasSearch && documents.length > 0" class="select-all-bar">
            <label class="checkbox-label">
              <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="checkbox-input" />
              <span class="checkbox-custom"></span>
              <span class="select-all-text">{{ isAllSelected ? '取消全选' : '全选' }}</span>
            </label>
          </div>

          <div class="documents-list">
            <div v-for="doc in documents" :key="doc.id" :class="['document-card', { 'is-selected': selectedIds.has(doc.id) }]">
              <div class="doc-header">
                <div class="doc-check-title">
                  <label v-if="!hasSearch" class="checkbox-label" @click.stop>
                    <input type="checkbox" :checked="selectedIds.has(doc.id)" @change="toggleSelect(doc.id)" class="checkbox-input" />
                    <span class="checkbox-custom"></span>
                  </label>
                  <div class="doc-title-row">
                    <span class="doc-category">{{ doc.category }}</span>
                    <h3 class="doc-title">{{ doc.title }}</h3>
                  </div>
                </div>
                <button
                  class="doc-delete-btn"
                  :disabled="deletingId === doc.id"
                  @click="confirmDelete(doc.id)"
                  aria-label="删除文档"
                >
                  <IconClose aria-hidden="true" />
                </button>
              </div>
              <p class="doc-content">{{ doc.content.substring(0, 200) }}{{ doc.content.length > 200 ? '...' : '' }}</p>
              <div class="doc-footer">
                <span class="doc-source">来源：{{ doc.source }}</span>
                <span v-if="doc.chunkCount > 0" class="doc-chunks">{{ doc.chunkCount }} 个分块</span>
                <span v-else-if="hasSearch" class="doc-chunks">搜索结果</span>
                <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1 && !hasSearch" class="pagination">
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">上一页</button>
          <div class="page-controls">
            <button
              v-for="p in Math.min(totalPages, 5)"
              :key="p"
              :class="['page-num', { active: currentPage === p }]"
              @click="goToPage(p)"
            >{{ p }}</button>
            <span v-if="totalPages > 5" class="page-ellipsis">...</span>
            <span class="page-info">共 {{ totalDocuments }} 条</span>
          </div>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一页</button>
        </div>
      </div>

      <div v-if="confirmDeleteId" class="confirm-overlay" @click="cancelDelete">
        <div class="confirm-dialog" @click.stop>
          <p class="confirm-text">确定要删除此文档吗？</p>
          <p class="confirm-hint">文档及其所有分块将被永久移除，此操作不可撤销</p>
          <div class="confirm-actions">
            <button class="btn-secondary" @click="cancelDelete">取消</button>
            <button class="btn-danger" :disabled="deletingId === confirmDeleteId" @click="handleDelete(confirmDeleteId)">{{ deletingId === confirmDeleteId ? '删除中...' : '删除' }}</button>
          </div>
        </div>
      </div>

      <div v-if="confirmBatchDelete" class="confirm-overlay" @click="confirmBatchDelete = false">
        <div class="confirm-dialog" @click.stop>
          <p class="confirm-text">批量删除 {{ selectedCount }} 个文档？</p>
          <p class="confirm-hint">所有选中的文档及其分块将被永久移除，此操作不可撤销</p>
          <div class="confirm-actions">
            <button class="btn-secondary" @click="confirmBatchDelete = false">取消</button>
            <button class="btn-danger" :disabled="isBatchDeleting" @click="handleBatchDelete">{{ isBatchDeleting ? '删除中...' : '确认删除' }}</button>
          </div>
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
.knowledge-page { max-width: 960px; margin: 0 auto; padding: var(--spacing-6); }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--spacing-6); }
.page-title { font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-text-primary); margin: 0 0 var(--spacing-1) 0; }
.page-subtitle { font-size: var(--font-size-base); color: var(--color-text-secondary); margin: 0; }
.add-btn { display: inline-flex; align-items: center; gap: var(--spacing-2); padding: var(--spacing-3) var(--spacing-5); background: var(--color-primary-gradient); color: var(--color-text-inverse); border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); box-shadow: 0 2px 12px rgba(0, 122, 255, 0.25); transition: all var(--transition-fast); }
.add-btn:hover { box-shadow: 0 4px 20px rgba(0, 122, 255, 0.35); transform: translateY(-1px); }
.add-btn :deep(svg) { width: 18px; height: 18px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-4); margin-bottom: var(--spacing-6); }
.stat-card { display: flex; flex-direction: column; align-items: center; padding: var(--spacing-5); background-color: var(--color-surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); }
.stat-value { font-size: var(--font-size-3xl); font-weight: var(--font-weight-bold); color: var(--color-primary); line-height: 1; }
.stat-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--spacing-2); }
.filter-bar { margin-bottom: var(--spacing-4); }
.search-box { display: flex; align-items: center; gap: var(--spacing-2); background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--spacing-2) var(--spacing-3); margin-bottom: var(--spacing-3); }
.search-icon { width: 20px; height: 20px; color: var(--color-text-tertiary); flex-shrink: 0; }
.search-input { flex: 1; border: none; outline: none; background: transparent; font-size: var(--font-size-base); color: var(--color-text-primary); }
.search-input::placeholder { color: var(--color-text-tertiary); }
.search-btn { padding: var(--spacing-2) var(--spacing-4); background: var(--color-primary); color: var(--color-text-inverse); border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); transition: background-color var(--transition-fast); }
.search-btn:hover { background: var(--color-primary-dark); }
.clear-search-btn { padding: var(--spacing-1) var(--spacing-3); background: transparent; color: var(--color-text-secondary); font-size: var(--font-size-sm); border-radius: var(--radius-md); transition: all var(--transition-fast); }
.clear-search-btn:hover { color: var(--color-primary); background: var(--color-primary-bg); }
.category-filters { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
.category-tag { padding: var(--spacing-1) var(--spacing-3); background-color: var(--color-fill-tertiary); border-radius: var(--radius-full); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.category-tag:hover { background-color: var(--color-fill-primary); color: var(--color-primary); }
.category-tag.active { background: var(--color-primary-gradient); color: var(--color-text-inverse); }
.batch-bar { display: flex; align-items: center; gap: var(--spacing-3); padding: var(--spacing-3) var(--spacing-4); background: var(--color-primary-bg); border: 1px solid var(--color-primary); border-radius: var(--radius-xl); margin-bottom: var(--spacing-4); }
.batch-info { flex: 1; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-primary); }
.batch-delete-btn { padding: var(--spacing-2) var(--spacing-4); background: var(--color-error); color: white; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); transition: all var(--transition-fast); }
.batch-delete-btn:hover { opacity: 0.9; box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3); }
.batch-cancel-btn { padding: var(--spacing-2) var(--spacing-4); background: transparent; color: var(--color-text-secondary); border-radius: var(--radius-lg); font-size: var(--font-size-sm); transition: all var(--transition-fast); }
.batch-cancel-btn:hover { color: var(--color-text-primary); background: var(--color-fill-tertiary); }
.select-all-bar { display: flex; align-items: center; padding: var(--spacing-2) var(--spacing-3); margin-bottom: var(--spacing-2); }
.select-all-text { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-left: var(--spacing-2); }
.checkbox-label { display: inline-flex; align-items: center; cursor: pointer; user-select: none; }
.checkbox-input { position: absolute; opacity: 0; width: 0; height: 0; }
.checkbox-custom { width: 18px; height: 18px; border: 2px solid var(--color-border); border-radius: 4px; background: var(--color-surface); transition: all var(--transition-fast); flex-shrink: 0; position: relative; }
.checkbox-input:checked + .checkbox-custom { background: var(--color-primary); border-color: var(--color-primary); }
.checkbox-input:checked + .checkbox-custom::after { content: ''; position: absolute; top: 2px; left: 4px; width: 6px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.checkbox-input:focus-visible + .checkbox-custom { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.doc-check-title { display: flex; align-items: center; gap: var(--spacing-2); flex: 1; min-width: 0; }
.document-card.is-selected { border: 1px solid var(--color-primary); background: var(--color-primary-bg); }
.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--spacing-12) var(--spacing-4); text-align: center; color: var(--color-text-secondary); }
.loading-spinner { width: 32px; height: 32px; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: var(--radius-full); animation: spin 0.8s linear infinite; margin-bottom: var(--spacing-3); }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-hint { font-size: var(--font-size-sm); color: var(--color-text-tertiary); margin-top: var(--spacing-2); }
.link-btn { background: none; border: none; color: var(--color-primary); font-size: inherit; text-decoration: underline; cursor: pointer; padding: 0; }
.link-btn:hover { color: var(--color-primary-dark); }
.documents-list { display: flex; flex-direction: column; gap: var(--spacing-3); }
.document-card { background-color: var(--color-surface); border-radius: var(--radius-xl); padding: var(--spacing-4); box-shadow: var(--shadow-sm); transition: box-shadow var(--transition-fast); }
.document-card:hover { box-shadow: var(--shadow-md); }
.doc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--spacing-2); }
.doc-title-row { display: flex; align-items: center; gap: var(--spacing-2); flex: 1; min-width: 0; }
.doc-category { padding: 2px 8px; background: var(--color-primary-gradient); border-radius: var(--radius-sm); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-inverse); flex-shrink: 0; }
.doc-title { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.doc-delete-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; color: var(--color-text-quaternary); border-radius: var(--radius-md); transition: all var(--transition-fast); flex-shrink: 0; }
.doc-delete-btn:hover:not(:disabled) { background-color: var(--color-error-bg); color: var(--color-error); }
.doc-delete-btn:disabled { opacity: 0.5; }
.doc-delete-btn :deep(svg) { width: 16px; height: 16px; }
.doc-content { font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: var(--line-height-body); margin: 0 0 var(--spacing-3) 0; }
.doc-footer { display: flex; gap: var(--spacing-4); font-size: var(--font-size-xs); color: var(--color-text-tertiary); }
.pagination { display: flex; align-items: center; justify-content: center; gap: var(--spacing-3); margin-top: var(--spacing-6); }
.page-btn { padding: var(--spacing-2) var(--spacing-4); background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--color-text-primary); transition: all var(--transition-fast); }
.page-btn:hover:not(:disabled) { background-color: var(--color-primary-bg); border-color: var(--color-primary); color: var(--color-primary); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-controls { display: flex; align-items: center; gap: var(--spacing-1); }
.page-num { min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-sm); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.page-num:hover { background-color: var(--color-primary-bg); border-color: var(--color-primary); color: var(--color-primary); }
.page-num.active { background: var(--color-primary-gradient); border-color: transparent; color: var(--color-text-inverse); }
.page-ellipsis { color: var(--color-text-tertiary); padding: 0 var(--spacing-1); }
.page-info { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-left: var(--spacing-2); }
.confirm-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: var(--z-index-modal-backdrop); padding: var(--spacing-4); }
.confirm-dialog { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--spacing-6); max-width: 360px; width: 100%; text-align: center; box-shadow: var(--shadow-float); }
.confirm-text { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin: 0 0 var(--spacing-1) 0; }
.confirm-hint { font-size: var(--font-size-sm); color: var(--color-text-tertiary); margin: 0 0 var(--spacing-5) 0; }
.confirm-actions { display: flex; gap: var(--spacing-3); justify-content: center; }
.btn-danger { padding: var(--spacing-2) var(--spacing-5); background: var(--color-error); color: white; border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); transition: all var(--transition-fast); }
.btn-danger:hover { opacity: 0.9; box-shadow: 0 2px 12px rgba(255, 59, 48, 0.35); }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: var(--z-index-modal-backdrop); padding: var(--spacing-4); }
.modal-content { background: var(--color-surface); border-radius: var(--radius-2xl); max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-float); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-5); border-bottom: 1px solid var(--color-border); }
.modal-title { font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); margin: 0; }
.modal-close { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; color: var(--color-text-tertiary); border-radius: var(--radius-md); transition: all var(--transition-fast); }
.modal-close:hover { background-color: var(--color-fill-tertiary); color: var(--color-text-primary); }
.modal-close :deep(svg) { width: 18px; height: 18px; }
.modal-body { padding: var(--spacing-5); display: flex; flex-direction: column; gap: var(--spacing-4); }
.form-group { display: flex; flex-direction: column; gap: var(--spacing-1); }
.form-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); }
.form-input, .form-textarea { padding: var(--spacing-3); background-color: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: var(--font-size-base); color: var(--color-text-primary); transition: border-color var(--transition-fast); }
.form-input:focus, .form-textarea:focus { outline: none; border-color: var(--color-primary); }
.form-textarea { resize: vertical; min-height: 120px; font-family: inherit; }
.modal-footer { display: flex; justify-content: flex-end; gap: var(--spacing-3); padding: var(--spacing-4) var(--spacing-5); border-top: 1px solid var(--color-border); }
.btn-secondary { padding: var(--spacing-2) var(--spacing-5); background-color: var(--color-fill-tertiary); border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); transition: all var(--transition-fast); }
.btn-secondary:hover { background-color: var(--color-fill-secondary); }
.btn-primary { padding: var(--spacing-2) var(--spacing-5); background: var(--color-primary-gradient); border-radius: var(--radius-lg); font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-text-inverse); transition: all var(--transition-fast); }
.btn-primary:hover:not(:disabled) { box-shadow: 0 2px 12px rgba(0, 122, 255, 0.35); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 767px) {
  .knowledge-page { padding: var(--spacing-4); }
  .page-header { flex-direction: column; gap: var(--spacing-3); }
  .stats-grid { grid-template-columns: repeat(3, 1fr); gap: var(--spacing-2); }
  .stat-card { padding: var(--spacing-3); }
  .stat-value { font-size: var(--font-size-2xl); }
}
</style>
