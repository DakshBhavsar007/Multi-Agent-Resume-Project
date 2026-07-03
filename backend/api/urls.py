"""
API URL Configuration
Wires all Django views to their HTTP routes,
mirroring the original FastAPI router layout.
"""
from django.urls import path
from api.views import (
    recruiter_auth,
    sessions,
    candidates,
    chat,
    export,
    ingest,
    apikey_auth,
    jobs,
    protection,
    seeker_auth,
    seeker_resume,
    seeker_jobs,
    parse,
    google_auth,
    github_auth,
    companies,
    seeker_resume_builder,
    recruiter_billing,
    seeker_billing,
    password_reset,
    round_views,
    ml_views,
)
from api.views.developer import (
    auth as dev_auth,
    keys as dev_keys,
    usage as dev_usage,
    billing as dev_billing,
    webhooks as dev_webhooks,
    embed as dev_embed,
)

urlpatterns = [
    # ── Health Check ──────────────────────────────────────────────────────────
    path('health', recruiter_auth.health_check, name='health-check'),

    # ── Recruiter Auth ─────────────────────────────────────────────────────────
    path('api/v1/auth/register', recruiter_auth.register, name='auth-register'),
    path('api/v1/auth/login', recruiter_auth.login, name='auth-login'),
    path('api/v1/auth/login-google', google_auth.recruiter_auth_google, name='auth-login-google'),
    path('api/v1/auth/login-github', github_auth.recruiter_auth_github, name='auth-login-github'),
    path('api/v1/auth/cross-login', recruiter_auth.cross_portal_login, name='auth-cross-login'),
    path('api/v1/auth/me', recruiter_auth.me, name='auth-me'),
    path('api/v1/auth/logout', recruiter_auth.logout, name='auth-logout'),
    path('api/v1/auth/change-password', recruiter_auth.change_password, name='auth-change-password'),
    path('api/v1/auth/update-profile', recruiter_auth.update_profile, name='auth-update-profile'),
    path('api/v1/auth/upload-logo', recruiter_auth.upload_logo, name='auth-upload-logo'),
    path('api/v1/auth/notifications', recruiter_auth.get_recruiter_notifications, name='auth-notifications'),
    path('api/v1/auth/notifications/read-all', recruiter_auth.mark_all_recruiter_notifications_read, name='auth-notifications-read-all'),
    path('api/v1/auth/notifications/<str:notif_id>/read', recruiter_auth.mark_recruiter_notification_read, name='auth-notification-read'),
    path('api/v1/auth/forgot-password', password_reset.forgot_password_recruiter, name='auth-forgot-password'),
    path('api/v1/auth/reset-password', password_reset.reset_password_recruiter, name='auth-reset-password'),

    # Recruiter portal API-key management
    # Frontend calls: POST /auth/api-keys/generate, GET /auth/api-keys, DELETE /auth/api-keys/{id}
    path('api/v1/auth/api-keys/generate', recruiter_auth.generate_api_key, name='auth-api-keys-generate'),
    path('api/v1/auth/api-keys', recruiter_auth.get_api_keys, name='auth-get-api-keys'),
    path('api/v1/auth/api-keys/<str:key_id>', recruiter_auth.revoke_api_key, name='auth-revoke-api-key'),

    # ── API Key ↔ JWT Auth ─────────────────────────────────────────────────────
    path('api/v1/auth/generate-key', apikey_auth.generate_key_endpoint, name='auth-generate-key'),
    path('api/v1/auth/token-from-key', apikey_auth.token_from_key, name='auth-token-from-key'),
    path('api/v1/auth/verify', apikey_auth.verify_token, name='auth-verify-token'),

    # ── Sessions ───────────────────────────────────────────────────────────────
    # session_root handles both GET (list) and POST (create)
    path('api/v1/sessions', sessions.session_root, name='sessions-root'),
    # session_detail handles GET (retrieve), PATCH (update), DELETE (archive)
    path('api/v1/sessions/<str:session_id>', sessions.session_detail, name='sessions-detail'),
    path('api/v1/sessions/<str:session_id>/criteria', sessions.set_criteria, name='sessions-criteria'),
    path('api/v1/sessions/<str:session_id>/infer-skills', sessions.infer_skills, name='sessions-infer-skills'),
    # Frontend calls: POST /sessions/{id}/match-all
    path('api/v1/sessions/<str:session_id>/match-all', sessions.trigger_match_all, name='sessions-match-all'),
    path('api/v1/sessions/generate-jd', sessions.generate_jd, name='sessions-generate-jd'),

    # ── Candidates ─────────────────────────────────────────────────────────────
    path('api/v1/sessions/<str:session_id>/candidates',
         candidates.list_candidates, name='candidates-list'),
    path('api/v1/sessions/<str:session_id>/candidates/bulk-reject',
         candidates.bulk_reject, name='candidates-bulk-reject'),
    # Frontend: GET /candidates/{id} → get_candidate, DELETE /candidates/{id} → delete_candidate
    # Both handled in get_candidate view (dispatches by method)
    path('api/v1/sessions/<str:session_id>/candidates/<str:cand_id>',
         candidates.get_candidate, name='candidates-get'),
    path('api/v1/sessions/<str:session_id>/candidates/<str:cand_id>/action',
         candidates.candidate_action, name='candidates-action'),

    path('api/v1/candidates',
         candidates.list_candidates_no_session, name='candidates-list-no-session'),
    path('api/v1/candidates/<str:cand_id>',
         candidates.get_candidate_no_session, name='candidates-get-no-session'),

    # ── Chat ───────────────────────────────────────────────────────────────────
    path('api/v1/sessions/<str:session_id>/chat', chat.chat, name='chat'),
    # Frontend: GET /chat/history → get history, DELETE /chat/history → clear history
    # Both handled in get_chat_history view (dispatches by method)
    path('api/v1/sessions/<str:session_id>/chat/history', chat.get_chat_history, name='chat-history'),

    # ── Export ─────────────────────────────────────────────────────────────────
    # Frontend calls: /sessions/{id}/export/candidates and /sessions/{id}/export/report
    path('api/v1/sessions/<str:session_id>/export/candidates', export.export_candidates, name='export-candidates'),
    path('api/v1/sessions/<str:session_id>/export/report', export.export_report, name='export-report'),

    # ── Ingest / Upload ────────────────────────────────────────────────────────
    path('api/v1/ingest/upload', ingest.upload_resumes, name='ingest-upload'),
    path('api/v1/ingest/zip', ingest.upload_zip, name='ingest-zip'),
    path('api/v1/ingest/gmail/connect', ingest.gmail_connect, name='ingest-gmail-connect'),
    path('api/v1/ingest/gmail/sync', ingest.gmail_sync, name='ingest-gmail-sync'),
    path('api/v1/ingest/gmail', ingest.gmail_sync, name='ingest-gmail-sync-direct'),
    path('api/v1/ingest/gdrive/connect', ingest.gdrive_connect, name='ingest-gdrive-connect'),
    path('api/v1/ingest/gdrive/sync', ingest.gdrive_sync, name='ingest-gdrive-sync'),
    path('api/v1/ingest/drive', ingest.gdrive_sync, name='ingest-gdrive-sync-direct'),
    path('api/v1/ingest/google-form', ingest.google_form, name='ingest-google-form'),
    path('api/v1/ingest/ats-import', ingest.ats_import, name='ingest-ats-import'),
    path('api/v1/ingest/ats', ingest.ats_import, name='ingest-ats-import-direct'),
    path('api/v1/ingest/oauth/google/url', ingest.get_google_oauth_url, name='ingest-oauth-url'),
    path('api/v1/ingest/status/<str:job_id>', ingest.get_job_status, name='ingest-status'),

    # ── Developer Portal — Auth ────────────────────────────────────────────────
    path('api/developer/auth/register', dev_auth.register, name='dev-auth-register'),
    path('api/developer/auth/login', dev_auth.login, name='dev-auth-login'),
    path('api/developer/auth/login-google', google_auth.developer_auth_google, name='dev-auth-login-google'),
    path('api/developer/auth/login-github', github_auth.developer_auth_github, name='dev-auth-login-github'),
    path('api/developer/auth/me', dev_auth.get_me, name='dev-auth-me'),
    path('api/developer/auth/profile', dev_auth.patch_me, name='dev-auth-patch-me'),
    path('api/developer/auth/forgot-password', password_reset.forgot_password_developer, name='dev-auth-forgot-password'),
    path('api/developer/auth/reset-password', password_reset.reset_password_developer, name='dev-auth-reset-password'),

    # ── Developer Portal — API Keys ────────────────────────────────────────────
    path('api/developer/keys', dev_keys.keys_root, name='dev-keys-root'),
    path('api/developer/keys/generate', dev_keys.keys_root, name='dev-keys-generate'),
    path('api/developer/keys/<str:key_id>', dev_keys.key_operations, name='dev-keys-ops'),
    path('api/developer/keys/<str:key_id>/rotate', dev_keys.rotate_key, name='dev-keys-rotate'),
    path('api/developer/keys/<str:key_id>/usage', dev_keys.key_usage, name='dev-keys-usage'),

    # ── Developer Portal — Usage ───────────────────────────────────────────────
    path('api/developer/usage', dev_usage.usage_summary, name='dev-usage-summary'),
    path('api/developer/usage/summary', dev_usage.usage_summary, name='dev-usage-summary-alias'),
    path('api/developer/usage/timeline', dev_usage.usage_timeline, name='dev-usage-timeline'),
    path('api/developer/usage/endpoints', dev_usage.usage_endpoints, name='dev-usage-endpoints'),
    path('api/developer/usage/history', dev_usage.usage_history, name='dev-usage-history'),

    # ── Developer Portal — Billing ─────────────────────────────────────────────
    path('api/developer/billing/plans', dev_billing.get_plans, name='dev-billing-plans'),
    path('api/developer/billing/subscribe', dev_billing.subscribe, name='dev-billing-subscribe'),
    path('api/developer/billing/verify-payment', dev_billing.verify_payment, name='dev-billing-verify'),
    path('api/developer/billing/subscription', dev_billing.current_subscription, name='dev-billing-subscription'),
    path('api/developer/billing/current', dev_billing.current_subscription, name='dev-billing-current'),
    path('api/developer/billing/cancel', dev_billing.cancel_subscription, name='dev-billing-cancel'),

    # ── Recruiter Billing ──────────────────────────────────────────────────────
    path('api/v1/billing/plans', recruiter_billing.get_plans, name='recruiter-billing-plans'),
    path('api/v1/billing/subscribe', recruiter_billing.subscribe, name='recruiter-billing-subscribe'),
    path('api/v1/billing/verify-payment', recruiter_billing.verify_payment, name='recruiter-billing-verify'),
    path('api/v1/billing/subscription', recruiter_billing.current_subscription, name='recruiter-billing-subscription'),
    path('api/v1/billing/current', recruiter_billing.current_subscription, name='recruiter-billing-current'),
    path('api/v1/billing/cancel', recruiter_billing.cancel_subscription, name='recruiter-billing-cancel'),


    # ── Developer Portal — Webhooks ────────────────────────────────────────────
    path('api/developer/webhooks', dev_webhooks.webhooks_root, name='dev-webhooks-root'),
    path('api/developer/webhooks/<str:webhook_id>', dev_webhooks.webhook_operations, name='dev-webhooks-ops'),
    path('api/developer/webhooks/<str:webhook_id>/test', dev_webhooks.test_webhook, name='dev-webhooks-test'),
    path('api/developer/webhooks/<str:webhook_id>/logs', dev_webhooks.webhook_logs, name='dev-webhooks-logs'),

    # ── Developer Portal — Embed ───────────────────────────────────────────────
    path('api/developer/embed/tokens', dev_embed.tokens_root, name='dev-embed-tokens'),
    path('api/developer/embed/tokens/<str:token_id>', dev_embed.revoke_embed_token, name='dev-embed-revoke-direct'),
    path('api/developer/embed/tokens/<str:token_id>/revoke', dev_embed.revoke_embed_token, name='dev-embed-revoke'),
    path('api/developer/embed/validate', dev_embed.validate_embed_token, name='dev-embed-validate'),

    # ── Public Job Seeker Portal ───────────────────────────────────────────────
    path('api/v1/public/jobs', jobs.list_public_jobs, name='public-jobs-list'),
    path('api/v1/public/jobs/scan-safety', jobs.scan_safety_arbitrary_public, name='public-jobs-scan-safety'),
    path('api/v1/public/jobs/<str:session_id>', jobs.get_public_job, name='public-jobs-detail'),
    path('api/v1/public/jobs/<str:session_id>/apply', jobs.apply_public_job, name='public-jobs-apply'),
    path('api/v1/public/jobs/<str:session_id>/safety-check', jobs.scan_job_safety_public, name='public-jobs-safety-check'),

    # ── Protection & Fraud Detection ──────────────────────────────────────────
    path('api/v1/parse', parse.parse_resume, name='api-parse'),
    path('api/v1/match', parse.global_match, name='api-global-match'),
    path('api/v1/chat', parse.global_chat, name='api-global-chat'),
    path('api/v1/protection/scan', protection.scan_portfolio, name='protection-scan'),
    path('api/v1/protection/history', protection.get_scan_history, name='protection-history'),

    # ── Job Seeker Auth ────────────────────────────────────────────────────────
    path('api/v1/seeker/auth/register', seeker_auth.register, name='seeker-auth-register'),
    path('api/v1/seeker/auth/login', seeker_auth.login, name='seeker-auth-login'),
    path('api/v1/seeker/auth/login-google', google_auth.seeker_auth_google, name='seeker-auth-login-google'),
    path('api/v1/seeker/auth/login-github', github_auth.seeker_auth_github, name='seeker-auth-login-github'),
    path('api/v1/seeker/auth/me', seeker_auth.me, name='seeker-auth-me'),
    path('api/v1/seeker/auth/profile', seeker_auth.update_profile, name='seeker-auth-profile'),
    path('api/v1/seeker/auth/upload-avatar', seeker_auth.upload_avatar, name='seeker-auth-upload-avatar'),
    path('api/v1/seeker/auth/forgot-password', password_reset.forgot_password_seeker, name='seeker-auth-forgot-password'),
    path('api/v1/seeker/auth/reset-password', password_reset.reset_password_seeker, name='seeker-auth-reset-password'),

    # ── Job Seeker Resume ──────────────────────────────────────────────────────
    path('api/v1/seeker/resume', seeker_resume.get_resume, name='seeker-resume-get'),
    path('api/v1/seeker/resume/upload', seeker_resume.upload_resume, name='seeker-resume-upload'),
    path('api/v1/seeker/resume/enhance', seeker_resume.enhance_resume, name='seeker-resume-enhance'),
    path('api/v1/seeker/resume/download', seeker_resume.download_enhanced_resume_file, name='seeker-resume-download'),
    path('api/v1/seeker/resume/check-ats', seeker_resume.check_ats_score, name='seeker-resume-check-ats'),

    # ── Job Seeker Jobs & Applications ─────────────────────────────────────────
    path('api/v1/seeker/jobs', seeker_jobs.list_jobs, name='seeker-jobs-list'),
    path('api/v1/seeker/jobs/saved', seeker_jobs.get_saved_jobs, name='seeker-jobs-saved'),
    path('api/v1/seeker/jobs/generate-cover-letter', seeker_jobs.generate_cover_letter, name='seeker-generate-cover-letter'),
    path('api/v1/seeker/jobs/<str:session_id>', seeker_jobs.job_detail, name='seeker-jobs-detail'),
    path('api/v1/seeker/jobs/<str:session_id>/save', seeker_jobs.save_job, name='seeker-jobs-save'),
    path('api/v1/seeker/jobs/<str:session_id>/apply', seeker_jobs.apply_job, name='seeker-jobs-apply'),
    path('api/v1/seeker/applications', seeker_jobs.my_applications, name='seeker-applications'),
    path('api/v1/seeker/applications/<str:app_id>/accept', seeker_jobs.accept_offer, name='seeker-applications-accept'),

    # ── Job Seeker Notifications ───────────────────────────────────────────────
    path('api/v1/seeker/notifications', seeker_jobs.get_notifications, name='seeker-notifications'),
    path('api/v1/seeker/notifications/read-all', seeker_jobs.mark_all_notifications_read, name='seeker-notifications-read-all'),
    path('api/v1/seeker/notifications/<str:notif_id>/read', seeker_jobs.mark_notification_read, name='seeker-notification-read'),

    # ── Public Companies ──────────────────────────────────────────────────────
    path('api/v1/public/companies', companies.public_list_companies, name='public-companies-list'),
    path('api/v1/public/companies/<str:company_id>', companies.public_get_company, name='public-companies-detail'),
    path('api/v1/public/market-trends', companies.public_market_trends, name='public-market-trends'),

    # ── Job Seeker Companies ──────────────────────────────────────────────────
    path('api/v1/seeker/companies', companies.seeker_list_companies, name='seeker-companies-list'),
    path('api/v1/seeker/companies/following', companies.seeker_following_companies, name='seeker-companies-following'),
    path('api/v1/seeker/companies/<str:company_id>', companies.seeker_get_company, name='seeker-companies-detail'),
    path('api/v1/seeker/companies/<str:company_id>/follow', companies.seeker_follow_company, name='seeker-companies-follow'),

    # ── Seeker Resume Builder Additions ───────────────────────────────────────
    path('api/agents/ats-check', seeker_resume_builder.ats_check, name='seeker-ats-check'),
    path('api/v1/seeker/resume/drafts', seeker_resume_builder.manage_drafts, name='seeker-drafts-root'),
    path('api/v1/seeker/resume/drafts/optimize', seeker_resume_builder.optimize_resume_draft, name='seeker-draft-optimize'),
    path('api/v1/seeker/resume/drafts/enhance', seeker_resume_builder.enhance_resume_draft, name='seeker-resume-draft-enhance'),
    path('api/v1/seeker/resume/drafts/import-file', seeker_resume_builder.import_file_draft, name='seeker-draft-import-file'),
    path('api/v1/seeker/resume/drafts/<str:draft_id>', seeker_resume_builder.draft_detail, name='seeker-drafts-detail'),
    path('api/v1/seeker/resume/drafts/<str:draft_id>/activate', seeker_resume_builder.activate_draft, name='seeker-draft-activate'),
    path('api/v1/seeker/resume/drafts/<str:draft_id>/export-pdf', seeker_resume_builder.export_draft_pdf, name='seeker-draft-export-pdf'),
    path('api/v1/seeker/resume/drafts/<str:draft_id>/versions', seeker_resume_builder.manage_versions, name='seeker-draft-versions-root'),
    path('api/v1/seeker/resume/drafts/<str:draft_id>/versions/<str:version_id>/restore', seeker_resume_builder.restore_version, name='seeker-draft-version-restore'),
    path('api/v1/seeker/resume/recommend-templates', seeker_resume_builder.recommend_templates, name='seeker-recommend-templates'),
    path('api/debug/project-relevance', seeker_resume_builder.debug_project_relevance, name='debug-project-relevance'),

    # ── Seeker Billing ─────────────────────────────────────────────────────────
    path('api/v1/seeker/billing/plans', seeker_billing.get_plans, name='seeker-billing-plans'),
    path('api/v1/seeker/billing/subscribe', seeker_billing.subscribe, name='seeker-billing-subscribe'),
    path('api/v1/seeker/billing/verify-payment', seeker_billing.verify_payment, name='seeker-billing-verify'),
    path('api/v1/seeker/billing/current', seeker_billing.current_subscription, name='seeker-billing-current'),
    path('api/v1/seeker/billing/cancel', seeker_billing.cancel_subscription, name='seeker-billing-cancel'),

    # ── Assessment Rounds ──
    # Company side
    path('api/v1/sessions/<str:session_id>/recommend-rounds', round_views.recommend_rounds),
    path('api/v1/sessions/<str:session_id>/rounds', round_views.create_session_rounds),
    path('api/v1/sessions/<str:session_id>/get-rounds', round_views.get_session_rounds),
    path('api/v1/sessions/<str:session_id>/applicant-results', round_views.get_applicant_results),
    path('api/v1/sessions/<str:session_id>/rounds/<str:round_id>/generate-questions', round_views.generate_interview_questions),
    path('api/v1/sessions/<str:session_id>/generate-test-links', round_views.generate_test_links),
    path('api/v1/sessions/upload-question-paper', round_views.upload_question_paper),

    # Candidate side
    path('api/v1/test/validate-token', round_views.validate_test_token),
    path('api/v1/test/mcq-questions', round_views.get_mcq_questions),
    path('api/v1/test/submit-mcq', round_views.submit_mcq),
    path('api/v1/test/coding-problems', round_views.get_coding_problems),
    path('api/v1/test/run-code', round_views.run_code),
    path('api/v1/test/submit-coding', round_views.submit_coding),
    path('api/v1/test/interview-questions', round_views.get_interview_questions),
    path('api/v1/test/submit-interview-answer', round_views.submit_interview_answer),
    path('api/v1/test/finalize-interview', round_views.finalize_interview),
    path('api/v1/test/transcribe-audio', round_views.transcribe_audio),
    path('api/v1/test/proctoring-flag', round_views.save_proctoring_flag),
    path('api/v1/test/mock-submit', round_views.mock_submit),
    path('api/v1/test/mock-switch-round', round_views.mock_switch_round),

    # Seeker Mock Practice Portal
    path('api/v1/seeker/mock-interview/create', round_views.create_mock_attempt),
    path('api/v1/seeker/mock-interview/list', round_views.list_mock_attempts),
    path('api/v1/seeker/mock-interview/<str:attempt_id>', round_views.get_mock_attempt),
    path('api/v1/seeker/mock-interview/<str:attempt_id>/submit', round_views.submit_mock_attempt),
    path('api/v1/seeker/mock-interview/transcribe-audio', round_views.seeker_transcribe_audio),

    # ── Machine Learning (scikit-learn) endpoints ─────────────────────────────
    path('api/v1/seeker/predict-salary', ml_views.predict_salary_view, name='seeker-predict-salary'),
    path('api/v1/seeker/recommendations', ml_views.recommend_jobs_view, name='seeker-recommendations'),
    path('api/v1/seeker/ats-score', ml_views.ats_score_view, name='seeker-ats-score'),
    path('api/v1/recruiter/cluster-skills', ml_views.cluster_skills_view, name='recruiter-cluster-skills'),
]

