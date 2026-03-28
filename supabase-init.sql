-- ===========================================
-- 智疗助手 Supabase 数据库初始化脚本
-- ===========================================

-- 启用 pgvector 扩展
create extension if not exists vector;

-- 验证扩展安装
select * from pg_extension where extname = 'vector';

-- ===========================================
-- 枚举类型
-- ===========================================

create type "UserStatus" as enum ('ACTIVE', 'SUSPENDED', 'DELETED');
create type "ConversationType" as enum ('CHAT', 'SEARCH', 'REPORT', 'DRUG');
create type "MessageRole" as enum ('USER', 'ASSISTANT', 'SYSTEM');
create type "RecordType" as enum ('REPORT', 'PRESCRIPTION', 'EXAM');
create type "PlanType" as enum ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');
create type "SubscriptionStatus" as enum ('ACTIVE', 'CANCELLED', 'EXPIRED');
create type "PaymentStatus" as enum ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');
create type "CodeType" as enum ('PHONE', 'EMAIL');
create type "CodePurpose" as enum ('REGISTER', 'LOGIN', 'RESET_PASSWORD');

-- ===========================================
-- 用户表
-- ===========================================

create table "users" (
  "id" uuid primary key default gen_random_uuid(),
  "email" text unique,
  "phone" text unique not null,
  "passwordHash" text not null,
  "nickname" text not null,
  "avatarUrl" text,
  "status" "UserStatus" default 'ACTIVE',
  "emailVerified" boolean default false,
  "phoneVerified" boolean default false,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now(),
  "lastLoginAt" timestamptz
);

-- ===========================================
-- 刷新令牌表
-- ===========================================

create table "refresh_tokens" (
  "id" uuid primary key default gen_random_uuid(),
  "token" text unique not null,
  "userId" uuid not null references "users"("id") on delete cascade,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default now(),
  "revoked" boolean default false
);

create index "refresh_tokens_userId_idx" on "refresh_tokens"("userId");

-- ===========================================
-- 对话表
-- ===========================================

create table "conversations" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null references "users"("id") on delete cascade,
  "title" text,
  "type" "ConversationType" not null,
  "model" text default 'local-llm',
  "metadata" jsonb default '{}',
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create index "conversations_userId_idx" on "conversations"("userId");
create index "conversations_createdAt_idx" on "conversations"("createdAt" desc);

-- ===========================================
-- 消息表
-- ===========================================

create table "messages" (
  "id" uuid primary key default gen_random_uuid(),
  "conversationId" uuid not null references "conversations"("id") on delete cascade,
  "role" "MessageRole" not null,
  "content" text not null,
  "sources" jsonb,
  "tokensUsed" integer default 0,
  "createdAt" timestamptz default now()
);

create index "messages_conversationId_idx" on "messages"("conversationId");

-- ===========================================
-- 健康记录表
-- ===========================================

create table "health_records" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null references "users"("id") on delete cascade,
  "type" "RecordType" not null,
  "fileUrl" text not null,
  "fileName" text,
  "fileSize" integer,
  "parsedData" jsonb,
  "analysisResult" jsonb,
  "createdAt" timestamptz default now()
);

create index "health_records_userId_idx" on "health_records"("userId");
create index "health_records_type_idx" on "health_records"("type");

-- ===========================================
-- 订阅表
-- ===========================================

create table "subscriptions" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null references "users"("id") on delete cascade,
  "plan" "PlanType" not null,
  "status" "SubscriptionStatus" not null,
  "startDate" timestamptz not null,
  "endDate" timestamptz,
  "autoRenew" boolean default true,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create index "subscriptions_userId_idx" on "subscriptions"("userId");
create index "subscriptions_status_idx" on "subscriptions"("status");

-- ===========================================
-- 支付表
-- ===========================================

create table "payments" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null,
  "subscriptionId" uuid references "subscriptions"("id"),
  "amount" decimal(10, 2) not null,
  "currency" text default 'CNY',
  "status" "PaymentStatus" not null,
  "paymentMethod" text,
  "transactionId" text,
  "createdAt" timestamptz default now()
);

create index "payments_userId_idx" on "payments"("userId");
create index "payments_status_idx" on "payments"("status");

-- ===========================================
-- 验证码表
-- ===========================================

create table "verification_codes" (
  "id" uuid primary key default gen_random_uuid(),
  "target" text not null,
  "code" text not null,
  "type" "CodeType" not null,
  "purpose" "CodePurpose" not null,
  "expiresAt" timestamptz not null,
  "used" boolean default false,
  "createdAt" timestamptz default now()
);

create index "verification_codes_target_idx" on "verification_codes"("target");
create index "verification_codes_expiresAt_idx" on "verification_codes"("expiresAt");

-- ===========================================
-- 知识文档表
-- ===========================================

create table "knowledge_documents" (
  "id" uuid primary key default gen_random_uuid(),
  "title" text not null,
  "content" text not null,
  "source" text not null,
  "category" text not null,
  "metadata" jsonb default '{}',
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create index "knowledge_documents_category_idx" on "knowledge_documents"("category");

-- ===========================================
-- 文档块表（带向量）
-- ===========================================

create table "document_chunks" (
  "id" uuid primary key default gen_random_uuid(),
  "documentId" uuid not null references "knowledge_documents"("id") on delete cascade,
  "healthRecordId" uuid references "health_records"("id") on delete cascade,
  "content" text not null,
  "chunkIndex" integer not null,
  "embedding" vector(768),
  "tokenCount" integer default 0,
  "metadata" jsonb default '{}',
  "createdAt" timestamptz default now()
);

create index "document_chunks_documentId_idx" on "document_chunks"("documentId");
create index "document_chunks_healthRecordId_idx" on "document_chunks"("healthRecordId");

-- 向量索引（用于相似度搜索）
create index "document_chunks_embedding_idx" on "document_chunks" 
using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ===========================================
-- 更新时间触发器
-- ===========================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at
  before update on "users"
  for each row execute function update_updated_at();

create trigger update_conversations_updated_at
  before update on "conversations"
  for each row execute function update_updated_at();

create trigger update_subscriptions_updated_at
  before update on "subscriptions"
  for each row execute function update_updated_at();

create trigger update_knowledge_documents_updated_at
  before update on "knowledge_documents"
  for each row execute function update_updated_at();

-- ===========================================
-- 完成
-- ===========================================

-- 验证所有表已创建
select table_name from information_schema.tables 
where table_schema = 'public' 
order by table_name;
