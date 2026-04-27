-- Enable pgvector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing index if exists
DROP INDEX IF EXISTS document_chunks_embedding_idx;

-- Create HNSW index for fast vector similarity search
-- HNSW is faster than IVFFlat for small datasets and provides better recall
-- M = 16: number of connections per node (balance between speed and accuracy)
-- ef_construction = 64: build time accuracy (higher = better quality but slower build)
CREATE INDEX document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (M = 16, ef_construction = 64);

-- Add comment
COMMENT ON INDEX document_chunks_embedding_idx IS 'HNSW index for fast cosine similarity search on embeddings';
