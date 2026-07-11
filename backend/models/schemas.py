import uuid
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Any, Optional, List, Dict
from datetime import datetime

class APIResponse(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None

def success_response(data=None) -> dict:
    return {"success": True, "data": data, "error": None}

import logging
logger = logging.getLogger(__name__)

def error_response(msg: str) -> dict:
    from django.conf import settings
    # Mask database and server trace details in production (when DEBUG is False)
    is_debug = getattr(settings, "DEBUG", False)
    if not is_debug and ("Server error:" in msg or "database" in msg.lower() or "traceback" in msg.lower() or "line" in msg.lower() or "exception" in msg.lower()):
        correlation_id = uuid.uuid4().hex[:8]
        logger.error(f"[Correlation ID: {correlation_id}] Internal server error suppressed: {msg}")
        return {
            "success": False,
            "data": {
                "correlation_id": correlation_id
            },
            "error": "An internal server error occurred. Please contact support."
        }
    return {"success": False, "data": None, "error": msg}

class BaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator('*', mode='before', check_fields=False)
    @classmethod
    def convert_types(cls, v):
        if v is None:
            return v
        if isinstance(v, uuid.UUID):
            return str(v)
        if isinstance(v, datetime):
            return v.isoformat()
        return v

# --- Company ---
class CompanyCreate(BaseModel):
    name: str
    email: str
    password: str
    tier: Optional[str] = "free"

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    tier: Optional[str] = None
    is_active: Optional[bool] = None

class CompanyResponse(BaseResponse):
    id: str
    name: str
    email: str
    tier: str
    is_active: bool
    created_at: str

# --- API Key ---
class APIKeyCreate(BaseModel):
    company_id: str
    key_name: Optional[str] = "Default Key"
    environment: Optional[str] = "production"

class APIKeyUpdate(BaseModel):
    key_name: Optional[str] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None

class APIKeyResponse(BaseResponse):
    id: str
    company_id: str
    key_name: str
    secret_key: str
    public_key: str
    environment: str
    is_active: bool
    last_used_at: Optional[str] = None
    created_at: str

# --- Session ---
class SessionCreate(BaseModel):
    company_id: str
    name: str
    job_title: str
    job_description: str
    rounds: Optional[List[Any]] = []
    status: Optional[str] = "active"
    criteria: Optional[Dict[str, Any]] = {}

class SessionUpdate(BaseModel):
    name: Optional[str] = None
    job_title: Optional[str] = None
    job_description: Optional[str] = None
    rounds: Optional[List[Any]] = None
    current_round_index: Optional[int] = None
    status: Optional[str] = None
    criteria: Optional[Dict[str, Any]] = None
    inferred_skills: Optional[List[Any]] = None
    gmail_tokens: Optional[Dict[str, Any]] = None
    gdrive_tokens: Optional[Dict[str, Any]] = None
    gdrive_folder_id: Optional[str] = None
    gmail_address: Optional[str] = None

class SessionResponse(BaseResponse):
    id: str
    company_id: str
    name: str
    job_title: str
    job_description: str
    rounds: List[Any]
    current_round_index: int
    status: str
    criteria: Dict[str, Any]
    inferred_skills: List[Any]
    gmail_tokens: Optional[Dict[str, Any]] = None
    gdrive_tokens: Optional[Dict[str, Any]] = None
    gdrive_folder_id: Optional[str] = None
    gmail_address: Optional[str] = None
    created_at: str
    updated_at: str

# --- Candidate ---
class CandidateCreate(BaseModel):
    session_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    raw_resume_path: Optional[str] = None
    status: Optional[str] = "active"
    source: Optional[str] = "upload"

class CandidateUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    raw_resume_path: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    normalized_skills: Optional[List[Any]] = None
    match_score: Optional[float] = None
    skill_score: Optional[float] = None
    experience_score: Optional[float] = None
    location_score: Optional[float] = None
    matched_skills: Optional[List[Any]] = None
    missing_skills: Optional[List[Any]] = None
    recommendation: Optional[str] = None
    total_experience_years: Optional[float] = None
    current_round_index: Optional[int] = None
    status: Optional[str] = None
    source: Optional[str] = None

class CandidateResponse(BaseResponse):
    id: str
    session_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    photo_url: Optional[str] = None
    raw_resume_path: Optional[str] = None
    parsed_data: Dict[str, Any]
    normalized_skills: List[Any]
    match_score: Optional[float] = None
    skill_score: Optional[float] = None
    experience_score: Optional[float] = None
    location_score: Optional[float] = None
    matched_skills: List[Any]
    missing_skills: List[Any]
    recommendation: Optional[str] = None
    total_experience_years: float
    current_round_index: int
    status: str
    source: str
    created_at: str

# --- Skill Taxonomy ---
class SkillTaxonomyCreate(BaseModel):
    skill_name: str
    canonical_name: str
    category: Optional[str] = None
    parent_category: Optional[str] = None
    synonyms: Optional[List[str]] = []

class SkillTaxonomyUpdate(BaseModel):
    skill_name: Optional[str] = None
    canonical_name: Optional[str] = None
    category: Optional[str] = None
    parent_category: Optional[str] = None
    synonyms: Optional[List[str]] = None

class SkillTaxonomyResponse(BaseResponse):
    id: str
    skill_name: str
    canonical_name: str
    category: Optional[str] = None
    parent_category: Optional[str] = None
    synonyms: List[str]
    created_at: str

# --- Chat History ---
class ChatHistoryCreate(BaseModel):
    session_id: str
    role: str
    content: str
    referenced_candidate_ids: Optional[List[str]] = []

class ChatHistoryUpdate(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None
    referenced_candidate_ids: Optional[List[str]] = None

class ChatHistoryResponse(BaseResponse):
    id: str
    session_id: str
    role: str
    content: str
    referenced_candidate_ids: List[str]
    created_at: str

# --- Ingest Job ---
class IngestJobCreate(BaseModel):
    session_id: str
    job_type: str
    status: Optional[str] = "pending"
    total_files: Optional[int] = 0

class IngestJobUpdate(BaseModel):
    status: Optional[str] = None
    total_files: Optional[int] = None
    processed_files: Optional[int] = None
    failed_files: Optional[int] = None
    error_log: Optional[List[Any]] = None
    completed_at: Optional[str] = None

class IngestJobResponse(BaseResponse):
    id: str
    session_id: str
    job_type: str
    status: str
    total_files: int
    processed_files: int
    failed_files: int
    error_log: List[Any]
    created_at: str
    completed_at: Optional[str] = None

# --- Developer Account ---
class DeveloperAccountCreate(BaseModel):
    company_name: str
    email: str
    password: str
    tier: Optional[str] = "free"
    allowed_domains: Optional[List[str]] = []

class DeveloperAccountUpdate(BaseModel):
    company_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    tier: Optional[str] = None
    is_verified: Optional[bool] = None
    verification_token: Optional[str] = None
    billing_customer_id: Optional[str] = None
    website_url: Optional[str] = None
    allowed_domains: Optional[List[str]] = None

class DeveloperAccountResponse(BaseResponse):
    id: str
    company_name: str
    email: str
    tier: str
    is_verified: bool
    verification_token: Optional[str] = None
    billing_customer_id: Optional[str] = None
    website_url: Optional[str] = None
    allowed_domains: List[str]
    created_at: str

# --- Developer API Key ---
class DeveloperAPIKeyCreate(BaseModel):
    developer_id: str
    key_name: str
    environment: Optional[str] = "test"

class DeveloperAPIKeyUpdate(BaseModel):
    key_name: Optional[str] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None

class DeveloperAPIKeyResponse(BaseResponse):
    id: str
    developer_id: str
    key_name: str
    secret_key: str
    public_key: str
    environment: str
    is_active: bool
    last_used_at: Optional[str] = None
    created_at: str

# --- API Usage Log ---
class APIUsageLogCreate(BaseModel):
    developer_id: Optional[str] = None
    api_key_id: Optional[str] = None
    endpoint: Optional[str] = None
    action_type: Optional[str] = None
    status_code: Optional[int] = None
    latency_ms: Optional[int] = None
    metadata_: Optional[Dict[str, Any]] = None

class APIUsageLogUpdate(BaseModel):
    status_code: Optional[int] = None
    latency_ms: Optional[int] = None
    metadata_: Optional[Dict[str, Any]] = None

class APIUsageLogResponse(BaseResponse):
    id: str
    developer_id: Optional[str] = None
    api_key_id: Optional[str] = None
    endpoint: Optional[str] = None
    action_type: Optional[str] = None
    status_code: Optional[int] = None
    latency_ms: Optional[int] = None
    timestamp: Optional[str] = None
    metadata_: Optional[Dict[str, Any]] = None

# --- Monthly Usage Summary ---
class MonthlyUsageSummaryCreate(BaseModel):
    developer_id: str
    year_month: str
    parse_count: Optional[int] = 0
    match_count: Optional[int] = 0
    chat_count: Optional[int] = 0
    export_count: Optional[int] = 0
    total_calls: Optional[int] = 0

class MonthlyUsageSummaryUpdate(BaseModel):
    parse_count: Optional[int] = None
    match_count: Optional[int] = None
    chat_count: Optional[int] = None
    export_count: Optional[int] = None
    total_calls: Optional[int] = None

class MonthlyUsageSummaryResponse(BaseResponse):
    id: str
    developer_id: str
    year_month: str
    parse_count: int
    match_count: int
    chat_count: int
    export_count: int
    total_calls: int

# --- Webhook ---
class WebhookCreate(BaseModel):
    developer_id: str
    url: str
    events: Optional[List[str]] = []
    secret: str

class WebhookUpdate(BaseModel):
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    is_active: Optional[bool] = None
    failure_count: Optional[int] = None

class WebhookResponse(BaseResponse):
    id: str
    developer_id: str
    url: str
    events: List[str]
    secret: str
    is_active: bool
    last_triggered_at: Optional[str] = None
    failure_count: int
    created_at: str

# --- Webhook Delivery Log ---
class WebhookDeliveryLogCreate(BaseModel):
    webhook_id: str
    event: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    success: Optional[bool] = False

class WebhookDeliveryLogUpdate(BaseModel):
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    success: Optional[bool] = None

class WebhookDeliveryLogResponse(BaseResponse):
    id: str
    webhook_id: str
    event: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    response_body: Optional[str] = None
    delivered_at: str
    success: bool

# --- Billing Subscription ---
class BillingSubscriptionCreate(BaseModel):
    developer_id: str
    plan: Optional[str] = "free"
    razorpay_subscription_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    status: Optional[str] = "active"

class BillingSubscriptionUpdate(BaseModel):
    plan: Optional[str] = None
    razorpay_subscription_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    status: Optional[str] = None
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None

class BillingSubscriptionResponse(BaseResponse):
    id: str
    developer_id: str
    plan: str
    razorpay_subscription_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    status: str
    current_period_start: Optional[str] = None
    current_period_end: Optional[str] = None
    created_at: str

# --- Embed Token ---
class EmbedTokenCreate(BaseModel):
    developer_id: str
    allowed_domain: str
    permissions: Optional[List[str]] = ["read"]

class EmbedTokenUpdate(BaseModel):
    allowed_domain: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None
    expires_at: Optional[str] = None

class EmbedTokenResponse(BaseResponse):
    id: str
    developer_id: str
    token: str
    allowed_domain: str
    permissions: List[str]
    is_active: bool
    expires_at: Optional[str] = None
    created_at: str
