#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BGE-M3 向量生成脚本
使用 sentence-transformers 运行 BAAI/bge-m3 模型

安装依赖:
    pip install sentence-transformers psycopg[binary] python-dotenv

运行:
    python generate_embeddings_bge_m3.py
    python generate_embeddings_bge_m3.py --reset
"""

import os
import sys
import time
import argparse

# 使用 HuggingFace 镜像和项目目录缓存
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
os.environ['HF_HOME'] = 'E:/jsjsj_exercise_2/server/.cache/huggingface'
os.environ['HF_HUB_CACHE'] = 'E:/jsjsj_exercise_2/server/.cache/huggingface/hub'
os.environ['TRANSFORMERS_CACHE'] = 'E:/jsjsj_exercise_2/server/.cache/huggingface/transformers'

try:
    import psycopg
    from sentence_transformers import SentenceTransformer
    from dotenv import load_dotenv
except ImportError as e:
    print(f"请安装依赖: pip install sentence-transformers 'psycopg[binary]' python-dotenv")
    print(f"缺失: {e}")
    sys.exit(1)

load_dotenv()

DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/medical_ai')
BATCH_SIZE = 64
DELAY_BETWEEN_BATCHES = 0.05

def parse_db_url(url):
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return {
        'host': parsed.hostname or 'localhost',
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/').split('?')[0],
        'user': parsed.username or 'postgres',
        'password': parsed.password or 'postgres'
    }

def main():
    parser = argparse.ArgumentParser(description='BGE-M3 向量生成工具')
    parser.add_argument('--reset', action='store_true', help='清除现有向量')
    args = parser.parse_args()

    print("=" * 60)
    print("BGE-M3 多语言向量生成工具 (Python)")
    print("   模型: BAAI/bge-m3 (1024维)")
    print("   支持: 100+ 语言（中英文跨语言检索）")
    print("=" * 60)

    print("\n正在加载 BAAI/bge-m3 模型...")
    print("   首次加载需下载约 2GB，请耐心等待...")
    
    model = SentenceTransformer('BAAI/bge-m3')
    print("[OK] 模型加载完成！")

    db_params = parse_db_url(DB_URL)
    conn = psycopg.connect(
        host=db_params['host'],
        port=db_params['port'],
        dbname=db_params['database'],
        user=db_params['user'],
        password=db_params['password']
    )

    try:
        if args.reset:
            print("\n[!] 重置模式: 清除现有向量...")
            conn.execute("UPDATE document_chunks SET embedding = NULL")
            conn.commit()
            print("[OK] 现有向量已清除")

        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM document_chunks WHERE embedding IS NULL")
            total_chunks = cursor.fetchone()[0]
        
        print(f"\n待处理分块数: {total_chunks}")

        if total_chunks == 0:
            print("[OK] 所有分块已有嵌入，无需处理")
            return

        processed = 0
        errors = 0
        start_time = time.time()

        while True:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, content FROM document_chunks 
                    WHERE embedding IS NULL 
                    LIMIT %s
                """, (BATCH_SIZE,))
                
                rows = cursor.fetchall()
            
            if not rows:
                break

            try:
                ids = [row[0] for row in rows]
                texts = [row[1][:8192] if row[1] else "" for row in rows]

                embeddings = model.encode(texts, normalize_embeddings=True)

                with conn.cursor() as cursor:
                    for chunk_id, embedding in zip(ids, embeddings):
                        emb_str = '[' + ','.join(map(str, embedding)) + ']'
                        cursor.execute("""
                            UPDATE document_chunks 
                            SET embedding = %s::vector(1024)
                            WHERE id = %s
                        """, (emb_str, chunk_id))

                conn.commit()
                processed += len(rows)

                elapsed = time.time() - start_time
                rate = processed / elapsed if elapsed > 0 else 0
                remaining = (total_chunks - processed) / rate if rate > 0 else 0

                percent = (processed / total_chunks) * 100
                print(f"\r[OK] 进度: {processed}/{total_chunks} ({percent:.1f}%) | "
                      f"速度: {processed/elapsed:.2f}/s | "
                      f"剩余: {int(remaining//60)}分{int(remaining%60)}秒   ", end='', flush=True)

                time.sleep(DELAY_BETWEEN_BATCHES)

            except Exception as e:
                errors += len(rows)
                print(f"\n[ERR] 错误: {e}")
                conn.rollback()
                
                if errors >= BATCH_SIZE * 3:
                    print("\n[!] 连续多次错误，任务暂停")
                    break
                
                time.sleep(2)

        total_time = time.time() - start_time
        print(f"\n\n[OK] 完成！")
        print(f"   本次处理: {processed} 个分块")
        print(f"   剩余待处理: {total_chunks - processed} 个分块")
        print(f"   耗时: {int(total_time//60)}分{int(total_time%60)}秒")

    finally:
        conn.close()

if __name__ == '__main__':
    main()
