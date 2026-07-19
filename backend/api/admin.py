from django.contrib import admin
from api.models import (
    SubscriptionPlan, MarketRegionConfig, SalaryTimelineConfig,
    GrowthSkillFallback, LocationLookup, Company, JobSeekerAccount,
    Candidate, Session
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
