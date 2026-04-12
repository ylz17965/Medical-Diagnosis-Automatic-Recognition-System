#!/usr/bin/env python3
"""
数据导出脚本
将数据库中的数据导出为JSON文件，供其他用户导入

运行方式：
    python export_data.py
    
输出：
    data/export/document_chunks.json - 文本块数据
    data/export/export_stats.json - 导出统计
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List

try:
    import pg8000
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("请安装依赖: pip install pg8000 python-dotenv")
    sys.exit(1)

DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/medical_ai')

EXPORT_DIR = Path(__file__).parent / 'data' / 'export'

def parse_db_url(url: str) -> Dict[str, Any]:
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/').split('?')[0],
        'user': parsed.username or 'postgres',
        'password': parsed.password or 'postgres'
    }

def export_data():
    print("=" * 50)
    print("数据导出工具")
    print("=" * 50)
    
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    
    db_params = parse_db_url(DB_URL)
    conn = pg8000.connect(
        host=db_params['host'],
        port=db_params['port'],
        database=db_params['database'],
        user=db_params['user'],
        password=db_params['password']
    )
    cursor = conn.cursor()
    
    stats = {
        'export_time': datetime.now().isoformat(),
        'chunks': 0,
        'documents': 0
    }
    
    try:
        print("\n导出文本块数据...")
        cursor.execute("""
            SELECT 
                id, 
                "documentId", 
                content, 
                "chunkIndex", 
                "tokenCount", 
                metadata
            FROM document_chunks
            ORDER BY "documentId", "chunkIndex"
        """)
        
        chunks = []
        batch_size = 10000
        total = 0
        
        while True:
            rows = cursor.fetchmany(batch_size)
            if not rows:
                break
            
            for row in rows:
                chunks.append({
                    'id': row[0],
                    'documentId': row[1],
                    'content': row[2],
                    'chunkIndex': row[3],
                    'tokenCount': row[4],
                    'metadata': row[5] if isinstance(row[5], dict) else json.loads(row[5]) if row[5] else {}
                })
            
            total += len(rows)
            print(f"  已导出: {total} 条")
        
        stats['chunks'] = total
        
        output_file = EXPORT_DIR / 'document_chunks.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(chunks, f, ensure_ascii=False, indent=2)
        
        print(f"  ✓ 保存到: {output_file}")
        
        print("\n统计文档数量...")
        cursor.execute('SELECT COUNT(DISTINCT "documentId") FROM document_chunks')
        stats['documents'] = cursor.fetchone()[0]
        
        print("\n导出统计信息...")
        stats_file = EXPORT_DIR / 'export_stats.json'
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        print(f"  ✓ 保存到: {stats_file}")
        
        print("\n" + "=" * 50)
        print("导出完成！")
        print("=" * 50)
        print(f"文本块: {stats['chunks']} 条")
        print(f"文档数: {stats['documents']} 篇")
        print(f"输出目录: {EXPORT_DIR}")
        print("\n可以将此目录打包分享给其他用户")
        
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    export_data()
