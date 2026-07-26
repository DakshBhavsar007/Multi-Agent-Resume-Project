from django.contrib import admin
from api.models import (
    SubscriptionPlan, MarketRegionConfig, SalaryTimelineConfig,
    GrowthSkillFallback, LocationLookup, Company, JobSeekerAccount,
    Candidate, Session, SupportTicket,
    GeminiProject, GeminiApiKey, AgentModelConfig
)

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

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'tier', 'is_active', 'is_banned', 'created_at')
    list_filter = ('tier', 'is_active', 'is_banned')
    search_fields = ('name', 'email')

@admin.register(JobSeekerAccount)
class JobSeekerAccountAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'email', 'tier', 'is_active', 'is_banned', 'created_at')
    list_filter = ('tier', 'is_active', 'is_banned')
    search_fields = ('full_name', 'email')

@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'email', 'subject', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'email', 'subject')


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
