-- 启用pgvector扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建对话历史表
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建知识库文档表
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(255),
    category VARCHAR(100),
    tags TEXT[],
    embedding vector(1024),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建向量索引
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx ON knowledge_documents USING ivfflat (embedding vector_cosine_ops);

-- 插入示例数据
INSERT INTO knowledge_documents (title, content, source, category, tags) VALUES
('肺结节Fleischner指南', '肺结节是指肺内直径小于或等于3厘米的类圆形或不规则形病灶。Fleischner学会指南为偶发性肺结节的处理提供了循证医学建议。', 'Fleischner Society', 'guideline', ARRAY['肺结节', 'CT筛查']),
('肺癌TNM分期', 'TNM分期是肺癌预后评估的重要工具。T分期根据肿瘤大小和侵犯范围，N分期根据淋巴结转移情况，M分期根据远处转移情况。', 'IASLC', 'guideline', ARRAY['肺癌', 'TNM分期']),
('慢性阻塞性肺疾病', 'COPD是一种常见的、可预防和治疗的疾病，以持续呼吸道症状和气流受限为特征。', 'GOLD', 'guideline', ARRAY['COPD', '慢阻肺']);
