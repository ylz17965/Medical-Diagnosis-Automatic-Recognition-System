#!/usr/bin/env python3
"""
预构建数据导入脚本
从导出的JSON文件导入数据到数据库
"""

import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

try:
    import pg8000
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("请安装依赖: pip install pg8000 python-dotenv")
    sys.exit(1)

DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/medical_ai')
EXPORT_DIR = Path(__file__).parent / 'data' / 'export'

def parse_db_url(url):
    parsed = urlparse(url)
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/').split('?')[0],
        'user': parsed.username or 'postgres',
        'password': parsed.password or 'postgres'
    }

def main():
    print("=" * 50)
    print("预构建数据导入工具")
    print("=" * 50)
    
    chunks_file = EXPORT_DIR / 'document_chunks.json'
    
    if not chunks_file.exists():
        print(f"\n错误: 数据文件不存在: {chunks_file}")
        print("\n请先下载预构建数据:")
        print("  1. 从项目Release页面下载数据包")
        print("  2. 解压到 scripts/data_collection/data/export/ 目录")
        return
    
    db_params = parse_db_url(DB_URL)
    conn = pg8000.connect(
        host=db_params['host'],
        port=db_params['port'],
        database=db_params['database'],
        user=db_params['user'],
        password=db_params['password']
    )
    cursor = conn.cursor()
    
    try:
        print(f"\n读取数据文件...")
        with open(chunks_file, 'r', encoding='utf-8') as f:
            chunks = json.load(f)
        
        print(f"发现 {len(chunks)} 条数据")
        
        print("\n清空现有数据...")
        cursor.execute("DELETE FROM document_chunks")
        conn.commit()
        
        print("导入数据...")
        imported = 0
        batch_size = 500
        
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            
            for chunk in batch:
                cursor.execute("""
                    INSERT INTO document_chunks 
                    (id, "documentId", content, "chunkIndex", "tokenCount", metadata, "createdAt")
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """, (
                    chunk['id'],
                    chunk['documentId'],
                    chunk['content'],
                    chunk['chunkIndex'],
                    chunk['tokenCount'],
                    json.dumps(chunk.get('metadata', {}))
                ))
            
            conn.commit()
            imported += len(batch)
            print(f"  进度: {imported}/{len(chunks)}")
        
        print("\n导入完成!")
        print(f"已导入: {imported} 条")
        print("\n下一步: 生成向量")
        print("  cd ../../server")
        print("  npx tsx generate-embeddings-m3.ts")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
