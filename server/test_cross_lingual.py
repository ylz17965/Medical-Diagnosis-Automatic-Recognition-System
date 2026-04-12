#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BGE-M3 跨语言检索测试
"""

import os
import psycopg
from sentence_transformers import SentenceTransformer

# 设置缓存目录
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
os.environ['HF_HOME'] = 'E:/jsjsj_exercise_2/server/.cache/huggingface'

def main():
    print("=" * 60)
    print("BGE-M3 跨语言检索测试")
    print("=" * 60)
    
    print("\n加载模型...")
    model = SentenceTransformer('E:/jsjsj_exercise_2/server/.cache/huggingface/transformers/models--BAAI--bge-m3/snapshots/5617a9f61b028005a4858fdac845db406aefb181')
    print("[OK] 模型加载完成")
    
    conn = psycopg.connect(
        host='localhost',
        port=5432,
        dbname='zhiliao',
        user='postgres',
        password='ylz1799951751'
    )
    
    test_queries = [
        ('头痛怎么治疗', 'How to treat headache'),
        ('肺癌早期症状', 'Early symptoms of lung cancer'),
        ('高血压饮食注意事项', 'Dietary precautions for hypertension'),
        ('糖尿病并发症', 'Diabetes complications'),
    ]
    
    print("\n" + "=" * 60)
    print("跨语言相似度测试")
    print("=" * 60)
    
    for zh, en in test_queries:
        embeddings = model.encode([zh, en], normalize_embeddings=True)
        similarity = float(embeddings[0] @ embeddings[1])
        status = '(优秀)' if similarity > 0.8 else '(良好)' if similarity > 0.6 else '(一般)'
        print(f"\n中文: {zh}")
        print(f"英文: {en}")
        print(f"相似度: {similarity:.4f} {status}")
    
    print("\n" + "=" * 60)
    print("向量检索测试")
    print("=" * 60)
    
    for zh, en in test_queries:
        print(f"\n查询: {zh}")
        
        query_emb = model.encode([zh], normalize_embeddings=True)[0]
        query_vec = '[' + ','.join(map(str, query_emb)) + ']'
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    content,
                    1 - (embedding <=> %s::vector(1024)) as similarity
                FROM document_chunks
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector(1024)
                LIMIT 3
            """, (query_vec, query_vec))
            
            results = cursor.fetchall()
        
        print(f"  找到 {len(results)} 条结果:")
        for i, row in enumerate(results):
            content = row[0][:100] if row[0] else '无内容'
            sim = float(row[1]) * 100
            print(f"  [{i+1}] 相似度: {sim:.1f}%")
            print(f"      内容: {content}...")
    
    print("\n测试完成!")
    print("=" * 60)

    conn.close()

if __name__ == '__main__':
    main()
