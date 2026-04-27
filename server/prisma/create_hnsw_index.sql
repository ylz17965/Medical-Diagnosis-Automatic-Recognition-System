-- Create HNSW index for fast vector cosine similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Set hnsw.ef_search for query performance (higher = more accurate but slower)
SET hnsw.ef_search = 64;

-- Verify index was created
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'document_chunks';
