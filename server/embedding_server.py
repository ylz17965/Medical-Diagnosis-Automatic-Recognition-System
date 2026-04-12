#!/usr/bin/env python3
"""
BGE-M3 嵌入服务
提供 HTTP API 供 Node.js 调用
"""

import os
import time
from typing import List
from contextlib import asynccontextmanager

# 设置 HuggingFace 镜像和本地缓存
os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
os.environ['HF_HOME'] = 'E:/jsjsj_exercise_2/server/.cache/huggingface'
os.environ['TRANSFORMERS_CACHE'] = 'E:/jsjsj_exercise_2/server/.cache/huggingface/transformers'

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print("正在加载 BAAI/bge-m3 模型...")
    
    # 使用本地缓存的模型
    local_model_path = 'E:/jsjsj_exercise_2/server/.cache/huggingface/transformers/models--BAAI--bge-m3/snapshots/5617a9f61b028005a4858fdac845db406aefb181'
    
    try:
        model = SentenceTransformer(local_model_path)
        print("[OK] 模型加载完成！")
    except Exception as e:
        print(f"[ERR] 模型加载失败: {e}")
        raise
    
    yield
    print("服务关闭")

app = FastAPI(
    title="BGE-M3 嵌入服务",
    description="多语言文本嵌入 API，支持中英文跨语言检索",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmbedRequest(BaseModel):
    texts: List[str]
    normalize: bool = True

class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int
    count: int

class SimilarityRequest(BaseModel):
    text1: str
    text2: str

class SimilarityResponse(BaseModel):
    similarity: float
    text1_embedding: List[float]
    text2_embedding: List[float]

@app.get("/")
async def root():
    return {
        "service": "BGE-M3 嵌入服务",
        "model": "BAAI/bge-m3",
        "dimension": 1024,
        "languages": "100+",
        "status": "ready"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: EmbedRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    if not request.texts:
        raise HTTPException(status_code=400, detail="texts 不能为空")
    
    if len(request.texts) > 100:
        raise HTTPException(status_code=400, detail="单次最多处理 100 条文本")
    
    start_time = time.time()
    
    embeddings = model.encode(
        request.texts,
        normalize_embeddings=request.normalize,
        convert_to_numpy=True
    )
    
    elapsed = time.time() - start_time
    
    return EmbedResponse(
        embeddings=embeddings.tolist(),
        dimension=embeddings.shape[1],
        count=len(request.texts)
    )

@app.post("/similarity", response_model=SimilarityResponse)
async def compute_similarity(request: SimilarityRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    embeddings = model.encode(
        [request.text1, request.text2],
        normalize_embeddings=True,
        convert_to_numpy=True
    )
    
    emb1, emb2 = embeddings[0], embeddings[1]
    similarity = float((emb1 @ emb2) / (len(emb1) ** 0.5 * len(emb2) ** 0.5))
    
    return SimilarityResponse(
        similarity=similarity,
        text1_embedding=emb1.tolist(),
        text2_embedding=emb2.tolist()
    )

@app.post("/cross_lingual_test")
async def cross_lingual_test():
    """测试跨语言能力"""
    if model is None:
        raise HTTPException(status_code=503, detail="模型未加载")
    
    test_pairs = [
        ("头痛怎么治疗", "How to treat headache"),
        ("肺癌早期症状", "Early symptoms of lung cancer"),
        ("高血压饮食注意事项", "Dietary precautions for hypertension"),
    ]
    
    results = []
    for zh, en in test_pairs:
        embeddings = model.encode([zh, en], normalize_embeddings=True)
        similarity = float(embeddings[0] @ embeddings[1])
        results.append({
            "chinese": zh,
            "english": en,
            "similarity": round(similarity, 4)
        })
    
    return {"test_results": results}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("EMBEDDING_SERVICE_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)
