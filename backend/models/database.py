import os
from dotenv import load_dotenv
load_dotenv()

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB

Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@postgres:5432/vishleshan")

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Synchronous engine for Celery workers (cannot use asyncpg with asyncio.run)
SYNC_DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
from sqlalchemy import create_engine
from sqlalchemy.orm import Session as SyncSession
sync_engine = create_engine(SYNC_DATABASE_URL, echo=False, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(bind=sync_engine, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(500), nullable=False)
    tier = Column(String(50), default="free")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"))
    key_name = Column(String(255), default="Default Key")
    secret_key = Column(String(500), unique=True, nullable=False)
    public_key = Column(String(500), unique=True, nullable=False)
    environment = Column(String(20), default="production")
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class Session(Base):
    __tablename__ = "sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    job_title = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=False)
    rounds = Column(JSONB, default=list)
    current_round_index = Column(Integer, default=0)
    status = Column(String(50), default="active")
    criteria = Column(JSONB, default=dict)
    inferred_skills = Column(JSONB, default=list)
    gmail_tokens = Column(JSONB, nullable=True)
    gdrive_tokens = Column(JSONB, nullable=True)
    gdrive_folder_id = Column(String(255), nullable=True)
    gmail_address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    resume_photo_path = Column(String(500), nullable=True)
    resume_file_path = Column(String(500), nullable=True)
    raw_resume_data = Column(JSONB, default=dict)
    normalized_skills = Column(JSONB, default=list)
    match_score = Column(Float, nullable=True)
    match_details = Column(JSONB, default=dict)
    recommendation = Column(String(100), nullable=True)
    total_experience_years = Column(Float, default=0.0)
    current_round_index = Column(Integer, default=0)
    status = Column(String(50), default="new")
    source = Column(String(50), default="upload")
    created_at = Column(DateTime, default=func.now())

class SkillTaxonomy(Base):
    __tablename__ = "skill_taxonomy"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skill_name = Column(String(255), nullable=False)
    canonical_name = Column(String(255), nullable=False)
    category = Column(String(255), nullable=True)
    parent_category = Column(String(255), nullable=True)
    synonyms = Column(JSONB, default=list)
    created_at = Column(DateTime, default=func.now())

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    referenced_candidate_ids = Column(JSONB, default=list)
    created_at = Column(DateTime, default=func.now())

class IngestJob(Base):
    __tablename__ = "ingest_jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"))
    type = Column(String(50), nullable=False)
    status = Column(String(50), default="pending")
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    error_log = Column(JSONB, default=list)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)

class DeveloperAccount(Base):
    __tablename__ = "developer_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(500), nullable=False)
    tier = Column(String(50), default="free")
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(500), nullable=True)
    billing_customer_id = Column(String(255), nullable=True)
    website_url = Column(String(500), nullable=True)
    allowed_domains = Column(JSONB, default=list)
    created_at = Column(DateTime, default=func.now())

class DeveloperAPIKey(Base):
    __tablename__ = "developer_api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    key_name = Column(String(255), nullable=False)
    secret_key = Column(String(500), unique=True, nullable=False)
    public_key = Column(String(500), unique=True, nullable=False)
    environment = Column(String(20), default="test")
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class APIUsageLog(Base):
    __tablename__ = "api_usage_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developer_accounts.id"), nullable=True)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("developer_api_keys.id"), nullable=True)
    endpoint = Column(String(255))
    action_type = Column(String(50))
    status_code = Column(Integer)
    latency_ms = Column(Integer)
    timestamp = Column(DateTime, default=func.now())
    metadata_ = Column("metadata", JSONB, nullable=True)

class MonthlyUsageSummary(Base):
    __tablename__ = "monthly_usage_summary"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    year_month = Column(String(7))
    parse_count = Column(Integer, default=0)
    match_count = Column(Integer, default=0)
    chat_count = Column(Integer, default=0)
    export_count = Column(Integer, default=0)
    total_api_calls = Column(Integer, default=0)
    
    __table_args__ = (
        UniqueConstraint('developer_id', 'year_month', name='uq_developer_year_month'),
    )

class Webhook(Base):
    __tablename__ = "webhooks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    url = Column(String(500), nullable=False)
    events = Column(JSONB, default=list)
    secret = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime, nullable=True)
    failure_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    webhook_id = Column(UUID(as_uuid=True), ForeignKey("webhooks.id", ondelete="CASCADE"))
    event_type = Column(String(255))
    payload = Column(JSONB)
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

class BillingSubscription(Base):
    __tablename__ = "billing_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    plan = Column(String(50), default="free")
    payment_id = Column(String(255), nullable=True)
    status = Column(String(50), default="active")
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class EmbedToken(Base):
    __tablename__ = "embed_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    developer_id = Column(UUID(as_uuid=True), ForeignKey("developer_accounts.id", ondelete="CASCADE"))
    token = Column(String(500), unique=True, nullable=False)
    allowed_domain = Column(String(255), nullable=False)
    permissions = Column(JSONB, default=["read"])
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
