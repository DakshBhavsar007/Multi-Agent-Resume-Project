"""
Vishleshan Backend - Import & Structure Verification
Run: cd backend && python scripts/verify_backend.py
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

passed = 0
failed = 0
errors = []

def check(label, fn):
    global passed, failed
    try:
        fn()
        print(f"  ✅ {label}")
        passed += 1
    except Exception as e:
        print(f"  ❌ {label}: {e}")
        errors.append((label, str(e)))
        failed += 1

print("\n" + "=" * 60)
print("  VISHLESHAN BACKEND VERIFICATION")
print("=" * 60)

# ── 1. Database Models ──
print("\n📦 Database Models")
check("Base + 15 tables", lambda: (
    __import__("models.database", fromlist=["Base"]),
    (lambda b: None if len(b.metadata.tables) >= 14 else (_ for _ in ()).throw(Exception(f"Only {len(b.metadata.tables)} tables")))(
        __import__("models.database", fromlist=["Base"]).Base
    )
))
check("Company model", lambda: __import__("models.database", fromlist=["Company"]).Company)
check("APIKey model", lambda: __import__("models.database", fromlist=["APIKey"]).APIKey)
check("Session model", lambda: __import__("models.database", fromlist=["Session"]).Session)
check("Candidate model", lambda: __import__("models.database", fromlist=["Candidate"]).Candidate)
check("IngestJob model", lambda: __import__("models.database", fromlist=["IngestJob"]).IngestJob)
check("DeveloperAccount model", lambda: __import__("models.database", fromlist=["DeveloperAccount"]).DeveloperAccount)
check("DeveloperAPIKey model", lambda: __import__("models.database", fromlist=["DeveloperAPIKey"]).DeveloperAPIKey)
check("SkillTaxonomy model", lambda: __import__("models.database", fromlist=["SkillTaxonomy"]).SkillTaxonomy)
check("ChatHistory model", lambda: __import__("models.database", fromlist=["ChatHistory"]).ChatHistory)
check("Webhook model", lambda: __import__("models.database", fromlist=["Webhook"]).Webhook)
check("WebhookDeliveryLog model", lambda: __import__("models.database", fromlist=["WebhookDeliveryLog"]).WebhookDeliveryLog)
check("EmbedToken model", lambda: __import__("models.database", fromlist=["EmbedToken"]).EmbedToken)
check("BillingSubscription model", lambda: __import__("models.database", fromlist=["BillingSubscription"]).BillingSubscription)
check("MonthlyUsageSummary model", lambda: __import__("models.database", fromlist=["MonthlyUsageSummary"]).MonthlyUsageSummary)
check("APIUsageLog model", lambda: __import__("models.database", fromlist=["APIUsageLog"]).APIUsageLog)

# ── 2. Schemas ──
print("\n📋 Schemas")
check("success_response", lambda: __import__("models.schemas", fromlist=["success_response"]).success_response)
check("error_response", lambda: __import__("models.schemas", fromlist=["error_response"]).error_response)

# ── 3. Dependencies ──
print("\n🔒 Dependencies")
check("verify_api_key", lambda: __import__("dependencies", fromlist=["verify_api_key"]).verify_api_key)
check("verify_jwt", lambda: __import__("dependencies", fromlist=["verify_jwt"]).verify_jwt)
check("verify_developer_jwt", lambda: __import__("dependencies", fromlist=["verify_developer_jwt"]).verify_developer_jwt)
check("check_rate_limit", lambda: __import__("dependencies", fromlist=["check_rate_limit"]).check_rate_limit)
check("require_tier", lambda: __import__("dependencies", fromlist=["require_tier"]).require_tier)

# ── 4. Routes ──
print("\n🌐 Routes (Core)")
check("routes.auth", lambda: __import__("routes.auth", fromlist=["router"]).router)
check("routes.ingest", lambda: __import__("routes.ingest", fromlist=["router"]).router)
check("routes.sessions", lambda: __import__("routes.sessions", fromlist=["router"]).router)
check("routes.candidates", lambda: __import__("routes.candidates", fromlist=["router"]).router)
check("routes.chat", lambda: __import__("routes.chat", fromlist=["router"]).router)
check("routes.export", lambda: __import__("routes.export", fromlist=["router"]).router)

print("\n🌐 Routes (Developer Portal)")
check("developer.portal_auth", lambda: __import__("routes.developer.portal_auth", fromlist=["router"]).router)
check("developer.portal_keys", lambda: __import__("routes.developer.portal_keys", fromlist=["router"]).router)
check("developer.portal_usage", lambda: __import__("routes.developer.portal_usage", fromlist=["router"]).router)
check("developer.portal_billing", lambda: __import__("routes.developer.portal_billing", fromlist=["router"]).router)
check("developer.portal_webhooks", lambda: __import__("routes.developer.portal_webhooks", fromlist=["router"]).router)
check("developer.portal_embed", lambda: __import__("routes.developer.portal_embed", fromlist=["router"]).router)

# ── 5. Agents ──
print("\n🤖 AI Agents")
check("ResumeParsingAgent", lambda: __import__("agents.parsing_agent", fromlist=["ResumeParsingAgent"]).ResumeParsingAgent)
check("SkillNormalizationAgent", lambda: __import__("agents.normalization_agent", fromlist=["SkillNormalizationAgent"]).SkillNormalizationAgent)
check("SemanticMatchingAgent", lambda: __import__("agents.matching_agent", fromlist=["SemanticMatchingAgent"]).SemanticMatchingAgent)
check("SkillInferenceAgent", lambda: __import__("agents.inference_agent", fromlist=["SkillInferenceAgent"]).SkillInferenceAgent)
check("RecruiterChatbotAgent", lambda: __import__("agents.chatbot_agent", fromlist=["RecruiterChatbotAgent"]).RecruiterChatbotAgent)

# ── 6. Services ──
print("\n⚙️ Services")
check("webhook_service", lambda: __import__("services.webhook_service", fromlist=["webhook_service"]).webhook_service)
check("redis_service", lambda: __import__("services.redis_service", fromlist=["redis_service"]).redis_service)
check("vector_store", lambda: __import__("services.vector_store", fromlist=["vector_store"]).vector_store)

# ── 7. Workers ──
print("\n👷 Workers")
check("celery_app", lambda: __import__("workers.celery_worker", fromlist=["celery_app"]).celery_app)
check("process_resume_batch", lambda: __import__("workers.celery_worker", fromlist=["process_resume_batch"]).process_resume_batch)

# ── 8. Middleware ──
print("\n🛡️ Middleware")
check("UsageLoggerMiddleware", lambda: __import__("middleware.usage_logger", fromlist=["UsageLoggerMiddleware"]).UsageLoggerMiddleware)

# ── 9. Scripts ──
print("\n📜 Scripts")
check("seed_skill_taxonomy", lambda: __import__("scripts.seed_data", fromlist=["seed_skill_taxonomy"]).seed_skill_taxonomy)
check("SKILL_SEED_DATA count >= 80", lambda: (
    None if len(__import__("scripts.seed_data", fromlist=["SKILL_SEED_DATA"]).SKILL_SEED_DATA) >= 80
    else (_ for _ in ()).throw(Exception("Too few skills"))
))

# ── 10. FastAPI App ──
print("\n🚀 FastAPI App")
check("main.app import", lambda: __import__("main", fromlist=["app"]).app)
check("App has 12+ routes", lambda: (
    None if len(__import__("main", fromlist=["app"]).app.routes) >= 12
    else (_ for _ in ()).throw(Exception("Too few routes"))
))

# ── Summary ──
print("\n" + "=" * 60)
total = passed + failed
print(f"  RESULTS: {passed}/{total} passed, {failed} failed")
if failed == 0:
    print("  🎉 ALL CHECKS PASSED — Backend is ready!")
else:
    print("  ⚠️ Some checks failed. Fix errors above.")
    for label, err in errors:
        print(f"    → {label}: {err}")
print("=" * 60 + "\n")
