# 数据采集脚本

本目录包含用于构建AI健康助手知识库的数据采集脚本。

## 目录结构

```
scripts/data_collection/
├── pubmed_collector.py      # PubMed文献采集
├── tcm_collector.py          # 中医药知识库采集
├── guideline_collector.py    # 临床指南采集
├── medical_ner_pipeline.py   # 医学NER流水线
├── vector_builder.py         # 向量数据库构建
├── run_all.py                # 主运行脚本
├── requirements.txt          # Python依赖
└── README.md                 # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行所有采集任务

```bash
python run_all.py
```

### 3. 单独运行各模块

```bash
# PubMed文献采集（需要NCBI API Key）
python pubmed_collector.py

# 中医药知识库采集
python tcm_collector.py

# 临床指南采集
python guideline_collector.py

# 医学NER流水线
python medical_ner_pipeline.py

# 向量数据库构建
python vector_builder.py
```

## 模块说明

### 1. PubMed文献采集 (pubmed_collector.py)

**功能**: 从PubMed自动下载医学文献

**目标**: 3000篇核心文献

**配置**:
- 设置环境变量 `ENTREZ_EMAIL` (必需)
- 设置环境变量 `ENTREZ_API_KEY` (可选，提高请求限制)

**输出**:
- `data/pubmed/pubmed_articles_*.json` - 文献数据
- `data/pubmed/collection_stats.json` - 采集统计

### 2. 中医药知识库采集 (tcm_collector.py)

**功能**: 构建中医药知识图谱

**目标**: 2万+实体

**实体类型**:
- 中药 (medicines)
- 方剂 (formulas)
- 穴位 (acupoints)
- 证候 (syndromes)

**输出**:
- `data/tcm/tcm_medicines_*.json`
- `data/tcm/tcm_formulas_*.json`
- `data/tcm/tcm_acupoints_*.json`

### 3. 临床指南采集 (guideline_collector.py)

**功能**: 收集权威临床指南

**目标**: 500+指南

**来源**:
- 中华医学会
- 国家卫健委
- WHO
- NICE
- AHA/ESC等国际组织

**输出**:
- `data/guidelines/clinical_guidelines_*.json`

### 4. 医学NER流水线 (medical_ner_pipeline.py)

**功能**: 从文本中提取医学实体和关系

**实体类型**:
- DISEASE (疾病)
- SYMPTOM (症状)
- DRUG (药品)
- EXAMINATION (检查)
- BODY_PART (身体部位)

**关系类型**:
- HAS_SYMPTOM (疾病-症状)
- TREATED_BY (疾病-药品)
- NEEDS_EXAMINATION (疾病-检查)
- LOCATED_AT (症状-部位)
- HAS_SIDE_EFFECT (药品-副作用)

**输出**:
- `data/processed/processed_entities_*.json`
- `data/processed/processed_relations_*.json`

### 5. 向量数据库构建 (vector_builder.py)

**功能**: 构建向量索引

**特性**:
- 文本分块 (512 tokens, 50 overlap)
- 多层级索引
- SQL导入文件生成

**输出**:
- `data/vectors/document_chunks_*.json`
- `data/vectors/vector_import_*.sql`

## 数据格式

### 文献数据

```json
{
  "pmid": "12345678",
  "title": "文章标题",
  "abstract": "摘要内容",
  "keywords": ["关键词1", "关键词2"],
  "authors": ["作者1", "作者2"],
  "journal": "期刊名",
  "publication_date": "2024",
  "doi": "10.xxx/xxx",
  "disease": "疾病分类",
  "evidence_level": "1a"
}
```

### 指南数据

```json
{
  "id": "GL_2024_12345",
  "title": "指南标题",
  "organization": "发布机构",
  "specialty": "专科",
  "year": 2024,
  "summary": "摘要",
  "key_recommendations": ["推荐1", "推荐2"],
  "evidence_level": "1a"
}
```

### 实体数据

```json
{
  "id": "ENT_00000001",
  "text": "高血压",
  "type": "DISEASE",
  "start": 0,
  "end": 3,
  "cui": "C0020538",
  "standard_name": "Hypertension",
  "confidence": 0.85
}
```

## 验收标准

| 指标 | 目标 | 说明 |
|------|------|------|
| 文献数量 | 5000+ | PubMed核心文献 |
| 实体数量 | 5万+ | 医学实体 |
| 关系数量 | 20万+ | 实体关系 |
| 指南数量 | 500+ | 临床指南 |
| 中药实体 | 2万+ | 中医药知识库 |

## 注意事项

1. **API限制**: PubMed API有请求频率限制，建议配置API Key
2. **数据质量**: 采集后需人工审核关键数据
3. **版权问题**: 注意遵守各数据源的使用条款
4. **增量更新**: 支持增量采集，避免重复下载

## 后续优化

1. 接入更多数据源（CNKI、万方等）
2. 使用专业医学NER模型
3. 构建更完善的知识图谱
4. 实现自动化数据更新流程
