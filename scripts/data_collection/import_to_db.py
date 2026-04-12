#!/usr/bin/env python3
"""
数据导入脚本
将采集的数据导入到PostgreSQL数据库，供RAG服务使用

运行方式：
    python import_to_db.py

依赖：
    pip install pg8000 python-dotenv
"""

import json
import os
import sys
import uuid
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

import pg8000

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:ylz1799951751@localhost:5432/zhiliao')

DATA_DIR = Path(__file__).parent / 'data'


def parse_db_url(url: str):
    """解析数据库URL"""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/').split('?')[0] or 'zhiliao',
        'user': parsed.username or 'postgres',
        'password': parsed.password or 'postgres'
    }


class DataImporter:
    def __init__(self, db_url: str):
        db_params = parse_db_url(db_url)
        self.conn = pg8000.connect(
            host=db_params['host'],
            port=db_params['port'],
            database=db_params['database'],
            user=db_params['user'],
            password=db_params['password']
        )
        self.cursor = self.conn.cursor()
        self.imported_count = {
            'documents': 0,
            'chunks': 0,
            'entities': 0,
            'relations': 0
        }
    
    def close(self):
        self.cursor.close()
        self.conn.close()
    
    def clear_existing_data(self):
        print("清空现有数据...")
        self.cursor.execute("DELETE FROM document_chunks WHERE \"documentId\" LIKE 'pubmed_%' OR \"documentId\" LIKE 'guideline_%' OR \"documentId\" LIKE 'tcm_%'")
        self.cursor.execute("DELETE FROM knowledge_documents WHERE id LIKE 'pubmed_%' OR id LIKE 'guideline_%' OR id LIKE 'tcm_%'")
        self.conn.commit()
        print("  ✓ 已清空")
    
    def batch_insert(self, query: str, data: List[tuple], batch_size: int = 500):
        """批量插入数据"""
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            for row in batch:
                self.cursor.execute(query, row)
            self.conn.commit()
            if i + batch_size < len(data):
                print(f"    进度: {min(i + batch_size, len(data))}/{len(data)}")
    
    def import_pubmed_articles(self):
        print("\n导入PubMed文献...")
        pubmed_dir = DATA_DIR / 'pubmed'
        
        if not pubmed_dir.exists():
            print("  ⚠ PubMed目录不存在")
            return
        
        all_articles = []
        for json_file in pubmed_dir.glob('*.json'):
            if json_file.name == 'collection_stats.json':
                continue
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_articles.extend(data)
                elif isinstance(data, dict) and 'articles' in data:
                    all_articles.extend(data['articles'])
        
        print(f"  发现 {len(all_articles)} 篇文献")
        
        documents = []
        chunks = []
        
        for i, article in enumerate(all_articles):
            doc_id = f"pubmed_{article.get('pmid', i)}"
            title = article.get('title', 'Untitled')
            abstract = article.get('abstract', '')
            content = f"{title}\n\n{abstract}"
            
            metadata = {
                'pmid': article.get('pmid', ''),
                'authors': article.get('authors', []),
                'journal': article.get('journal', ''),
                'publication_date': article.get('publication_date', ''),
                'keywords': article.get('keywords', []),
                'doi': article.get('doi', '')
            }
            
            documents.append((
                doc_id,
                title,
                content,
                'pubmed',
                article.get('disease_category', 'general'),
                json.dumps(metadata, ensure_ascii=False)
            ))
            
            chunk_size = 500
            overlap = 50
            chunk_idx = 0
            for j in range(0, len(content), chunk_size - overlap):
                chunk_content = content[j:j + chunk_size]
                if len(chunk_content.strip()) > 50:
                    chunks.append((
                        str(uuid.uuid4()),
                        doc_id,
                        chunk_idx,
                        chunk_content,
                        len(chunk_content) // 4,
                        json.dumps({'position': j}, ensure_ascii=False)
                    ))
                    chunk_idx += 1
        
        if documents:
            print(f"  插入 {len(documents)} 篇文档...")
            doc_query = """
                INSERT INTO knowledge_documents 
                (id, title, content, source, category, metadata, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """
            self.batch_insert(doc_query, documents)
            self.imported_count['documents'] += len(documents)
        
        if chunks:
            print(f"  插入 {len(chunks)} 个分块...")
            chunk_query = """
                INSERT INTO document_chunks 
                (id, "documentId", "chunkIndex", content, "tokenCount", metadata, "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """
            self.batch_insert(chunk_query, chunks)
            self.imported_count['chunks'] += len(chunks)
        
        print(f"  ✓ 导入 {len(documents)} 篇文档, {len(chunks)} 个分块")
    
    def import_guidelines(self):
        print("\n导入临床指南...")
        guidelines_dir = DATA_DIR / 'guidelines'
        
        if not guidelines_dir.exists():
            print("  ⚠ 指南目录不存在")
            return
        
        all_guidelines = []
        for json_file in guidelines_dir.glob('*.json'):
            if 'stats' in json_file.name:
                continue
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_guidelines.extend(data)
                elif isinstance(data, dict) and 'guidelines' in data:
                    all_guidelines.extend(data['guidelines'])
        
        print(f"  发现 {len(all_guidelines)} 篇指南")
        
        documents = []
        chunks = []
        
        for i, guideline in enumerate(all_guidelines):
            doc_id = f"guideline_{guideline.get('id', i)}"
            title = guideline.get('title', guideline.get('name', 'Untitled'))
            content = guideline.get('content', guideline.get('summary', ''))
            
            if not content:
                content = f"{title}\n\n{guideline.get('description', '')}"
            
            metadata = {
                'organization': guideline.get('organization', ''),
                'year': guideline.get('year', ''),
                'version': guideline.get('version', ''),
                'external_id': guideline.get('id', str(i))
            }
            
            documents.append((
                doc_id,
                title,
                content,
                guideline.get('source', 'guideline'),
                'clinical_guideline',
                json.dumps(metadata, ensure_ascii=False)
            ))
            
            chunk_size = 500
            overlap = 50
            chunk_idx = 0
            for j in range(0, len(content), chunk_size - overlap):
                chunk_content = content[j:j + chunk_size]
                if len(chunk_content.strip()) > 50:
                    chunks.append((
                        str(uuid.uuid4()),
                        doc_id,
                        chunk_idx,
                        chunk_content,
                        len(chunk_content) // 4,
                        json.dumps({'position': j}, ensure_ascii=False)
                    ))
                    chunk_idx += 1
        
        if documents:
            print(f"  插入 {len(documents)} 篇文档...")
            doc_query = """
                INSERT INTO knowledge_documents 
                (id, title, content, source, category, metadata, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """
            self.batch_insert(doc_query, documents)
            self.imported_count['documents'] += len(documents)
        
        if chunks:
            print(f"  插入 {len(chunks)} 个分块...")
            chunk_query = """
                INSERT INTO document_chunks 
                (id, "documentId", "chunkIndex", content, "tokenCount", metadata, "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """
            self.batch_insert(chunk_query, chunks)
            self.imported_count['chunks'] += len(chunks)
        
        print(f"  ✓ 导入 {len(documents)} 篇文档, {len(chunks)} 个分块")
    
    def import_tcm_data(self):
        print("\n导入中医药数据...")
        tcm_dir = DATA_DIR / 'tcm'
        
        if not tcm_dir.exists():
            print("  ⚠ 中医药目录不存在")
            return
        
        documents = []
        chunks = []
        
        for json_file in tcm_dir.glob('*.json'):
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            data_type = json_file.stem.replace('tcm_', '')
            
            items = data if isinstance(data, list) else data.get('data', [])
            
            for i, item in enumerate(items):
                doc_id = f"tcm_{data_type}_{i}"
                
                if data_type == 'medicines':
                    title = item.get('name', 'Unknown')
                    content = f"{title}\n\n性味: {item.get('nature', '')}\n归经: {item.get('meridian', '')}\n功效: {item.get('effects', '')}"
                    category = 'tcm_medicine'
                elif data_type == 'formulas':
                    title = item.get('name', 'Unknown')
                    content = f"{title}\n\n组成: {item.get('composition', '')}\n功效: {item.get('effects', '')}\n主治: {item.get('indications', '')}"
                    category = 'tcm_formula'
                elif data_type == 'acupoints':
                    title = item.get('name', 'Unknown')
                    content = f"{title}\n\n定位: {item.get('location', '')}\n功效: {item.get('effects', '')}\n主治: {item.get('indications', '')}"
                    category = 'tcm_acupoint'
                else:
                    title = item.get('name', 'Unknown')
                    content = json.dumps(item, ensure_ascii=False)
                    category = f'tcm_{data_type}'
                
                metadata = {
                    'type': data_type,
                    'original_data': item
                }
                
                documents.append((
                    doc_id,
                    title,
                    content,
                    'tcm',
                    category,
                    json.dumps(metadata, ensure_ascii=False)
                ))
                
                chunk_size = 500
                overlap = 50
                chunk_idx = 0
                for j in range(0, len(content), chunk_size - overlap):
                    chunk_content = content[j:j + chunk_size]
                    if len(chunk_content.strip()) > 50:
                        chunks.append((
                            str(uuid.uuid4()),
                            doc_id,
                            chunk_idx,
                            chunk_content,
                            len(chunk_content) // 4,
                            json.dumps({'position': j}, ensure_ascii=False)
                        ))
                        chunk_idx += 1
        
        if documents:
            print(f"  插入 {len(documents)} 篇文档...")
            doc_query = """
                INSERT INTO knowledge_documents 
                (id, title, content, source, category, metadata, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            """
            self.batch_insert(doc_query, documents)
            self.imported_count['documents'] += len(documents)
        
        if chunks:
            print(f"  插入 {len(chunks)} 个分块...")
            chunk_query = """
                INSERT INTO document_chunks 
                (id, "documentId", "chunkIndex", content, "tokenCount", metadata, "createdAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            """
            self.batch_insert(chunk_query, chunks)
            self.imported_count['chunks'] += len(chunks)
        
        print(f"  ✓ 导入 {len(documents)} 篇文档, {len(chunks)} 个分块")
    
    def import_processed_entities(self):
        print("\n导入处理后的实体...")
        processed_dir = DATA_DIR / 'processed'
        
        if not processed_dir.exists():
            print("  ⚠ 处理结果目录不存在")
            return
        
        entities_files = list(processed_dir.glob('processed_entities_*.json'))
        if entities_files:
            latest = max(entities_files, key=lambda p: p.stat().st_mtime)
            with open(latest, 'r', encoding='utf-8') as f:
                entities = json.load(f)
            
            print(f"  发现 {len(entities)} 个实体")
            self.imported_count['entities'] = len(entities)
        
        relations_files = list(processed_dir.glob('processed_relations_*.json'))
        if relations_files:
            latest = max(relations_files, key=lambda p: p.stat().st_mtime)
            with open(latest, 'r', encoding='utf-8') as f:
                relations = json.load(f)
            
            print(f"  发现 {len(relations)} 个关系")
            self.imported_count['relations'] = len(relations)
        
        print("  ✓ 实体和关系数据已统计")
    
    def print_summary(self):
        print("\n" + "="*50)
        print("导入完成！")
        print("="*50)
        print(f"文档数: {self.imported_count['documents']}")
        print(f"分块数: {self.imported_count['chunks']}")
        print(f"实体数: {self.imported_count['entities']}")
        print(f"关系数: {self.imported_count['relations']}")
        print("="*50)
        
        self.cursor.execute("SELECT COUNT(*) FROM knowledge_documents")
        doc_count = self.cursor.fetchone()[0]
        
        self.cursor.execute("SELECT COUNT(*) FROM document_chunks")
        chunk_count = self.cursor.fetchone()[0]
        
        print(f"\n数据库验证:")
        print(f"  knowledge_documents: {doc_count} 条")
        print(f"  document_chunks: {chunk_count} 条")
    
    def run(self):
        print("="*50)
        print("数据导入工具")
        print("="*50)
        print(f"数据库: {DB_URL.split('@')[-1] if '@' in DB_URL else DB_URL}")
        print(f"数据目录: {DATA_DIR}")
        
        self.clear_existing_data()
        
        self.import_pubmed_articles()
        self.import_guidelines()
        self.import_tcm_data()
        self.import_processed_entities()
        
        self.print_summary()


def main():
    try:
        importer = DataImporter(DB_URL)
        try:
            importer.run()
        finally:
            importer.close()
    except Exception as e:
        print(f"\n❌ 导入失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
