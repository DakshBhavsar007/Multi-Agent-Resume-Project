from django.contrib import admin
from api.models import (
    Company, APIKey, Session, Candidate, SkillTaxonomy, ChatHistory, IngestJob,
    DeveloperAccount, DeveloperAPIKey, APIUsageLog, MonthlyUsageSummary, Webhook,
    WebhookDeliveryLog, BillingSubscription, EmbedToken, JobSeekerAccount,
    JobApplication, Notification, ResumeDraft, ResumeVersion, SavedJob,
    CompanyBillingSubscription, SeekerBillingSubscription, SessionRound,
    MCQQuestion, CodingProblem, ApplicantRoundAttempt, SeekerMockAttempt,
    SubscriptionPlan, MarketRegionConfig, SalaryTimelineConfig, GrowthSkillFallback,
    LocationLookup, SupportTicket, Review, AdminBanLog, GeminiProject,
    GeminiApiKey, AgentModelConfig, GroqApiKey, AdminAuditLog
)

# ─── Recruiter & Platform Core Models ──────────────────────────────────────────

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'tier', 'is_active', 'is_banned', 'created_at')
    list_filter = ('tier', 'is_active', 'is_banned')
    search_fields = ('name', 'email')

@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'key_name', 'environment', 'is_active', 'created_at')
    list_filter = ('environment', 'is_active')
    search_fields = ('key_name', 'secret_key', 'public_key')

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'name', 'job_title', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'job_title')

@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'name', 'email', 'match_score', 'recommendation', 'status', 'created_at')
    list_filter = ('status', 'recommendation', 'source')
    search_fields = ('name', 'email')

@admin.register(SkillTaxonomy)
class SkillTaxonomyAdmin(admin.ModelAdmin):
    list_display = ('id', 'skill_name', 'canonical_name', 'category', 'created_at')
    search_fields = ('skill_name', 'canonical_name', 'category')

@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'role', 'created_at')
    list_filter = ('role',)

@admin.register(IngestJob)
class IngestJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'type', 'status', 'total_files', 'processed_files', 'created_at')
    list_filter = ('type', 'status')


# ─── Developer Portal Models ───────────────────────────────────────────────────

@admin.register(DeveloperAccount)
class DeveloperAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'company_name', 'email', 'tier', 'is_verified', 'is_banned', 'created_at')
    list_filter = ('tier', 'is_verified', 'is_banned')
    search_fields = ('company_name', 'email', 'full_name')

@admin.register(DeveloperAPIKey)
class DeveloperAPIKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'key_name', 'environment', 'is_active', 'created_at')
    list_filter = ('environment', 'is_active')
    search_fields = ('key_name', 'secret_key')

@admin.register(APIUsageLog)
class APIUsageLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'endpoint', 'status_code', 'latency_ms', 'timestamp')
    list_filter = ('status_code',)
    search_fields = ('endpoint',)

@admin.register(MonthlyUsageSummary)
class MonthlyUsageSummaryAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'year_month', 'total_api_calls', 'parse_count', 'match_count')
    list_filter = ('year_month',)

@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'url', 'is_active', 'failure_count', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('url',)

@admin.register(WebhookDeliveryLog)
class WebhookDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'webhook', 'event_type', 'status_code', 'created_at')
    list_filter = ('status_code', 'event_type')

@admin.register(BillingSubscription)
class BillingSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'plan', 'status', 'created_at')
    list_filter = ('plan', 'status')

@admin.register(EmbedToken)
class EmbedTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'developer', 'token', 'allowed_domain', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('token', 'allowed_domain')


# ─── Job Seeker Portal & Recruitment Models ────────────────────────────────────

@admin.register(JobSeekerAccount)
class JobSeekerAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'email', 'headline', 'tier', 'is_active', 'is_banned', 'created_at')
    list_filter = ('tier', 'is_active', 'is_banned')
    search_fields = ('full_name', 'email')

@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('id', 'seeker', 'session', 'status', 'applied_at')
    list_filter = ('status',)
    search_fields = ('seeker__full_name', 'session__job_title')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
    search_fields = ('title', 'message')

@admin.register(ResumeDraft)
class ResumeDraftAdmin(admin.ModelAdmin):
    list_display = ('id', 'seeker', 'title', 'template_id', 'ats_score', 'is_active', 'created_at')
    list_filter = ('template_id', 'is_active')
    search_fields = ('title',)

@admin.register(ResumeVersion)
class ResumeVersionAdmin(admin.ModelAdmin):
    list_display = ('id', 'draft', 'title', 'ats_score', 'created_at')
    search_fields = ('title',)

@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'seeker', 'session', 'saved_at')

@admin.register(CompanyBillingSubscription)
class CompanyBillingSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'company', 'plan', 'status', 'created_at')
    list_filter = ('plan', 'status')

@admin.register(SeekerBillingSubscription)
class SeekerBillingSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'seeker', 'plan', 'status', 'created_at')
    list_filter = ('plan', 'status')

@admin.register(SessionRound)
class SessionRoundAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'round_number', 'name', 'round_type', 'is_active')
    list_filter = ('round_type', 'is_active')

@admin.register(MCQQuestion)
class MCQQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'category', 'question_text', 'correct_option', 'difficulty')
    list_filter = ('category', 'difficulty')
    search_fields = ('question_text',)

@admin.register(CodingProblem)
class CodingProblemAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug', 'title', 'difficulty')
    list_filter = ('difficulty',)
    search_fields = ('title', 'slug', 'description')

@admin.register(ApplicantRoundAttempt)
class ApplicantRoundAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'candidate', 'round', 'status', 'overall_score', 'started_at')
    list_filter = ('status',)

@admin.register(SeekerMockAttempt)
class SeekerMockAttemptAdmin(admin.ModelAdmin):
    list_display = ('id', 'seeker', 'attempt_type', 'status', 'score', 'created_at')
    list_filter = ('attempt_type', 'status')


# ─── System Configurations & AI Rotations ────────────────────────────────────

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'currency', 'period', 'target_portal', 'is_active')
    list_filter = ('target_portal', 'is_active')
    search_fields = ('name', 'id')

@admin.register(MarketRegionConfig)
class MarketRegionConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'fallback_value', 'color_hex', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(SalaryTimelineConfig)
class SalaryTimelineConfigAdmin(admin.ModelAdmin):
    list_display = ('year', 'salary_k', 'is_projection')
    list_filter = ('is_projection',)
    search_fields = ('year',)

@admin.register(GrowthSkillFallback)
class GrowthSkillFallbackAdmin(admin.ModelAdmin):
    list_display = ('name', 'growth_percentage', 'median_salary', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(LocationLookup)
class LocationLookupAdmin(admin.ModelAdmin):
    list_display = ('country', 'state', 'created_at')
    search_fields = ('country', 'state')

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'subject', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'email', 'subject')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_type', 'rating', 'is_featured', 'created_at')
    list_filter = ('user_type', 'rating', 'is_featured')
    search_fields = ('text',)

@admin.register(AdminBanLog)
class AdminBanLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'admin_email', 'target_type', 'target_id', 'action', 'timestamp')
    list_filter = ('target_type', 'action')
    search_fields = ('admin_email', 'target_id')


# ─── Gemini API Key Rotation & Agent Model Config ────────────────────────────

class GeminiApiKeyInline(admin.TabularInline):
    model = GeminiApiKey
    extra = 0
    fields = ('label', 'key', 'is_active', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(GeminiProject)
class GeminiProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'quota_display', 'rpm_limit', 'is_active', 'last_reset')
    list_filter = ('is_active',)
    search_fields = ('name',)
    readonly_fields = ('daily_usage', 'last_reset', 'created_at')
    inlines = [GeminiApiKeyInline]
    actions = ['reset_daily_usage', 'toggle_active']

    @admin.display(description='Quota (Used/Limit)')
    def quota_display(self, obj):
        pct = (obj.daily_usage / obj.daily_limit * 100) if obj.daily_limit > 0 else 0
        status = "🔴" if pct >= 100 else "🟡" if pct >= 75 else "🟢"
        return f"{status} {obj.daily_usage}/{obj.daily_limit} ({pct:.0f}%)"

    @admin.action(description='Reset daily usage to 0')
    def reset_daily_usage(self, request, queryset):
        queryset.update(daily_usage=0)

    @admin.action(description='Toggle active status')
    def toggle_active(self, request, queryset):
        for obj in queryset:
            obj.is_active = not obj.is_active
            obj.save(update_fields=['is_active'])

@admin.register(GeminiApiKey)
class GeminiApiKeyAdmin(admin.ModelAdmin):
    list_display = ('label', 'project', 'masked_key', 'is_active', 'created_at')
    list_filter = ('is_active', 'project')
    search_fields = ('label',)
    readonly_fields = ('created_at',)

    @admin.display(description='API Key (Masked)')
    def masked_key(self, obj):
        if len(obj.key) > 12:
            return obj.key[:8] + "..." + obj.key[-4:]
        return "***"

@admin.register(AgentModelConfig)
class AgentModelConfigAdmin(admin.ModelAdmin):
    list_display = ('agent_name', 'display_name', 'primary_provider', 'fallback_provider', 'is_active')
    list_filter = ('primary_provider', 'fallback_provider', 'is_active')
    list_editable = ('primary_provider', 'fallback_provider', 'is_active')
    search_fields = ('agent_name', 'display_name')

@admin.register(GroqApiKey)
class GroqApiKeyAdmin(admin.ModelAdmin):
    list_display = ('id', 'label', 'is_active', 'usage_count', 'last_used_at', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('label',)

@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'admin_email', 'admin_role', 'action', 'target_type', 'timestamp')
    list_filter = ('admin_role', 'action', 'target_type')
    search_fields = ('admin_email', 'action', 'target_id')
