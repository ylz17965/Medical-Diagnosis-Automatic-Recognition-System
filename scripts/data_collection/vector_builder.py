#!/usr/bin/env python3
"""
向量数据库构建脚本
功能：多层级索引构建、增量更新、性能优化
输出：可直接导入PostgreSQL/pgvector的SQL文件
"""

import json
import os
import hashlib
import re
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict
import math


@dataclass
class DocumentChunk:
    """文档分块"""
    id: str
    document_id: str
    content: str
    chunk_index: int
    token_count: int
    metadata: Dict
    embedding: Optional[List[float]] = None


@dataclass
class VectorIndex:
    """向量索引"""
    id: str
    chunk_id: str
    embedding: List[float]
    embedding_model: str
    dimension: int


class VectorDatabaseBuilder:
    """向量数据库构建器"""
    
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 50
    EMBEDDING_DIMENSION = 1536
    
    DOCUMENT_TYPES = {
        "literature": {
            "priority": 1,
            "weight": 1.0,
            "fields": ["title", "abstract", "keywords"]
        },
        "guideline": {
            "priority": 2,
            "weight": 1.2,
            "fields": ["title", "summary", "key_recommendations"]
        },
        "tcm_medicine": {
            "priority": 3,
            "weight": 0.8,
            "fields": ["name", "efficacy", "indications"]
        },
        "tcm_formula": {
            "priority": 3,
            "weight": 0.8,
            "fields": ["name", "efficacy", "indications"]
        }
    }
    
    def __init__(self):
        self.output_dir = "data/vectors"
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.chunks: List[DocumentChunk] = []
        self.indexes: List[VectorIndex] = []
        
        self.stats = {
            "total_documents": 0,
            "total_chunks": 0,
            "total_tokens": 0,
            "by_type": {},
            "by_source": {}
        }
    
    def generate_chunk_id(self, document_id: str, chunk_index: int) -> str:
        hash_input = f"{document_id}_{chunk_index}".encode()
        return f"CHUNK_{hashlib.md5(hash_input).hexdigest()[:12]}"
    
    def count_tokens(self, text: str) -> int:
        chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
        english_words = len(re.findall(r'[a-zA-Z]+', text))
        numbers = len(re.findall(r'\d+', text))
        
        return chinese_chars + english_words + numbers
    
    def chunk_text(self, text: str, document_id: str, metadata: Dict = None) -> List[DocumentChunk]:
        """文本分块"""
        if not text or len(text.strip()) == 0:
            return []
        
        tokens = self.count_tokens(text)
        
        if tokens <= self.CHUNK_SIZE:
            chunk = DocumentChunk(
                id=self.generate_chunk_id(document_id, 0),
                document_id=document_id,
                content=text.strip(),
                chunk_index=0,
                token_count=tokens,
                metadata=metadata or {}
            )
            return [chunk]
        
        sentences = re.split(r'([。！？\n\.!?])', text)
        sentences = [''.join(pair) for pair in zip(sentences[::2], sentences[1::2] + [''])]
        sentences = [s.strip() for s in sentences if s.strip()]
        
        chunks = []
        current_chunk = []
        current_tokens = 0
        chunk_index = 0
        
        for sentence in sentences:
            sentence_tokens = self.count_tokens(sentence)
            
            if current_tokens + sentence_tokens > self.CHUNK_SIZE and current_chunk:
                chunk_content = ''.join(current_chunk)
                chunk = DocumentChunk(
                    id=self.generate_chunk_id(document_id, chunk_index),
                    document_id=document_id,
                    content=chunk_content,
                    chunk_index=chunk_index,
                    token_count=current_tokens,
                    metadata=metadata or {}
                )
                chunks.append(chunk)
                
                overlap_sentences = []
                overlap_tokens = 0
                for s in reversed(current_chunk):
                    s_tokens = self.count_tokens(s)
                    if overlap_tokens + s_tokens <= self.CHUNK_OVERLAP:
                        overlap_sentences.insert(0, s)
                        overlap_tokens += s_tokens
                    else:
                        break
                
                current_chunk = overlap_sentences
                current_tokens = overlap_tokens
                chunk_index += 1
            
            current_chunk.append(sentence)
            current_tokens += sentence_tokens
        
        if current_chunk:
            chunk_content = ''.join(current_chunk)
            chunk = DocumentChunk(
                id=self.generate_chunk_id(document_id, chunk_index),
                document_id=document_id,
                content=chunk_content,
                chunk_index=chunk_index,
                token_count=current_tokens,
                metadata=metadata or {}
            )
            chunks.append(chunk)
        
        return chunks
    
    def generate_mock_embedding(self, text: str) -> List[float]:
        """生成模拟嵌入向量（实际使用时替换为真实API调用）"""
        hash_values = hashlib.sha256(text.encode()).digest()
        
        embedding = []
        for i in range(self.EMBEDDING_DIMENSION):
            byte_index = i % len(hash_values)
            value = (hash_values[byte_index] / 255.0 - 0.5) * 2
            embedding.append(round(value, 6))
        
        norm = math.sqrt(sum(x*x for x in embedding))
        if norm > 0:
            embedding = [x/norm for x in embedding]
        
        return embedding
    
    def process_document(self, doc: Dict, doc_type: str) -> List[DocumentChunk]:
        """处理单个文档"""
        type_config = self.DOCUMENT_TYPES.get(doc_type, {})
        fields = type_config.get("fields", ["content", "text", "abstract"])
        
        text_parts = []
        for field in fields:
            value = doc.get(field)
            if value:
                if isinstance(value, list):
                    text_parts.extend(str(v) for v in value)
                else:
                    text_parts.append(str(value))
        
        full_text = ' '.join(text_parts)
        
        doc_id = doc.get("id") or doc.get("pmid") or doc.get("doc_id", f"DOC_{self.stats['total_documents']}")
        
        metadata = {
            "type": doc_type,
            "source": doc.get("source", "unknown"),
            "title": doc.get("title", ""),
            "weight": type_config.get("weight", 1.0)
        }
        
        chunks = self.chunk_text(full_text, doc_id, metadata)
        
        self.stats["total_documents"] += 1
        self.stats["total_chunks"] += len(chunks)
        self.stats["total_tokens"] += sum(c.token_count for c in chunks)
        
        type_name = doc_type
        self.stats["by_type"][type_name] = self.stats["by_type"].get(type_name, 0) + 1
        
        return chunks
    
    def process_literature(self, filepath: str) -> List[DocumentChunk]:
        """处理文献数据"""
        print(f"\nProcessing literature: {filepath}")
        
        if not os.path.exists(filepath):
            print(f"  File not found: {filepath}")
            return []
        
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        all_chunks = []
        for doc in data:
            chunks = self.process_document(doc, "literature")
            all_chunks.extend(chunks)
        
        print(f"  Processed {len(data)} documents, {len(all_chunks)} chunks")
        return all_chunks
    
    def process_guidelines(self, filepath: str) -> List[DocumentChunk]:
        """处理指南数据"""
        print(f"\nProcessing guidelines: {filepath}")
        
        if not os.path.exists(filepath):
            print(f"  File not found: {filepath}")
            return []
        
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        all_chunks = []
        for doc in data:
            chunks = self.process_document(doc, "guideline")
            all_chunks.extend(chunks)
        
        print(f"  Processed {len(data)} documents, {len(all_chunks)} chunks")
        return all_chunks
    
    def process_tcm(self, filepath: str, tcm_type: str) -> List[DocumentChunk]:
        """处理中医药数据"""
        print(f"\nProcessing TCM {tcm_type}: {filepath}")
        
        if not os.path.exists(filepath):
            print(f"  File not found: {filepath}")
            return []
        
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        all_chunks = []
        for doc in data:
            chunks = self.process_document(doc, f"tcm_{tcm_type}")
            all_chunks.extend(chunks)
        
        print(f"  Processed {len(data)} documents, {len(all_chunks)} chunks")
        return all_chunks
    
    def build_indexes(self, chunks: List[DocumentChunk]) -> List[VectorIndex]:
        """构建向量索引"""
        print(f"\nBuilding vector indexes for {len(chunks)} chunks...")
        
        indexes = []
        for chunk in chunks:
            embedding = self.generate_mock_embedding(chunk.content)
            
            index = VectorIndex(
                id=f"IDX_{chunk.id}",
                chunk_id=chunk.id,
                embedding=embedding,
                embedding_model="text-embedding-v3",
                dimension=self.EMBEDDING_DIMENSION
            )
            indexes.append(index)
        
        return indexes
    
    def generate_sql_import(self, chunks: List[DocumentChunk], indexes: List[VectorIndex], output_file: str):
        """生成SQL导入文件"""
        print(f"\nGenerating SQL import file: {output_file}")
        
        sql_lines = [
            "-- Vector Database Import",
            f"-- Generated at: {datetime.now().isoformat()}",
            f"-- Total chunks: {len(chunks)}",
            f"-- Total indexes: {len(indexes)}",
            "",
            "-- Create tables if not exist",
            """
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vector_indexes (
    id VARCHAR(64) PRIMARY KEY,
    chunk_id VARCHAR(64) REFERENCES document_chunks(id),
    embedding vector(1536),
    embedding_model VARCHAR(64),
    dimension INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_vector_embedding ON vector_indexes USING ivfflat (embedding vector_cosine_ops);
""",
            "",
            "-- Insert document chunks",
        ]
        
        for chunk in chunks:
            content_escaped = chunk.content.replace("'", "''")
            metadata_json = json.dumps(chunk.metadata, ensure_ascii=False).replace("'", "''")
            
            sql_lines.append(f"""
INSERT INTO document_chunks (id, document_id, content, chunk_index, token_count, metadata)
VALUES ('{chunk.id}', '{chunk.document_id}', '{content_escaped}', {chunk.chunk_index}, {chunk.token_count}, '{metadata_json}'::jsonb)
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata;
""")
        
        sql_lines.append("")
        sql_lines.append("-- Insert vector indexes")
        
        for idx in indexes:
            embedding_str = '[' + ','.join(str(x) for x in idx.embedding[:100]) + '...]'
            sql_lines.append(f"""
-- INSERT INTO vector_indexes (id, chunk_id, embedding, embedding_model, dimension)
-- VALUES ('{idx.id}', '{idx.chunk_id}', '{embedding_str}'::vector, '{idx.embedding_model}', {idx.dimension});
-- Note: Actual embedding values truncated for readability. Use Python script for full import.
""")
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write('\n'.join(sql_lines))
        
        print(f"  SQL file generated: {output_file}")
    
    def save_results(self, chunks: List[DocumentChunk], indexes: List[VectorIndex]):
        """保存结果"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        chunks_file = f"{self.output_dir}/document_chunks_{timestamp}.json"
        with open(chunks_file, "w", encoding="utf-8") as f:
            json.dump([asdict(c) for c in chunks], f, ensure_ascii=False, indent=2)
        
        stats_file = f"{self.output_dir}/vector_stats_{timestamp}.json"
        with open(stats_file, "w", encoding="utf-8") as f:
            json.dump(self.stats, f, ensure_ascii=False, indent=2)
        
        sql_file = f"{self.output_dir}/vector_import_{timestamp}.sql"
        self.generate_sql_import(chunks, indexes, sql_file)
        
        print("\n" + "="*50)
        print("Vector Database Build Complete!")
        print("="*50)
        print(f"Total documents: {self.stats['total_documents']}")
        print(f"Total chunks: {self.stats['total_chunks']}")
        print(f"Total tokens: {self.stats['total_tokens']}")
        print(f"\nBy type:")
        for type_name, count in self.stats["by_type"].items():
            print(f"  {type_name}: {count}")
        print(f"\nOutput files:")
        print(f"  - {chunks_file}")
        print(f"  - {stats_file}")
        print(f"  - {sql_file}")
    
    def build_from_data_dir(self, data_dir: str = "data"):
        """从数据目录构建向量数据库"""
        print("\n" + "="*50)
        print("Building Vector Database")
        print("="*50)
        
        all_chunks = []
        
        literature_files = self._find_files(data_dir, "pubmed", ".json")
        for filepath in literature_files:
            chunks = self.process_literature(filepath)
            all_chunks.extend(chunks)
        
        guideline_files = self._find_files(data_dir, "guidelines", ".json")
        for filepath in guideline_files:
            chunks = self.process_guidelines(filepath)
            all_chunks.extend(chunks)
        
        tcm_files = {
            "medicines": self._find_files(data_dir, "tcm_medicines", ".json"),
            "formulas": self._find_files(data_dir, "tcm_formulas", ".json"),
            "acupoints": self._find_files(data_dir, "tcm_acupoints", ".json")
        }
        for tcm_type, files in tcm_files.items():
            for filepath in files:
                chunks = self.process_tcm(filepath, tcm_type)
                all_chunks.extend(chunks)
        
        indexes = self.build_indexes(all_chunks)
        
        self.save_results(all_chunks, indexes)
        
        return all_chunks, indexes
    
    def _find_files(self, base_dir: str, subdir: str, extension: str) -> List[str]:
        """查找文件"""
        search_dir = os.path.join(base_dir, subdir)
        if not os.path.exists(search_dir):
            return []
        
        files = []
        for filename in os.listdir(search_dir):
            if filename.endswith(extension):
                files.append(os.path.join(search_dir, filename))
        
        return files


def main():
    builder = VectorDatabaseBuilder()
    builder.build_from_data_dir("data")


if __name__ == "__main__":
    main()
