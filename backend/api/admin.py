from django.contrib import admin
from api.models import (
    SubscriptionPlan, MarketRegionConfig, SalaryTimelineConfig,
    GrowthSkillFallback, LocationLookup, Company, JobSeekerAccount,
    Candidate, Session, SupportTicket
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
