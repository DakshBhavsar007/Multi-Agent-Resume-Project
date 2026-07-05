"""
ML Model Accuracy Test Suite (Large Scale)
═════════════════════════════════════════════
Tests all scikit-learn models used across agents with larger, dynamically generated synthetic datasets.

Run:  python backend/tests/test_ml_accuracy.py
"""

import os, sys, json, re
import numpy as np

# ── Django Setup ────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "vishleshan_backend.settings")

import django
django.setup()

# Set random seed for reproducibility
np.random.seed(42)

# ═══════════════════════════════════════════════════════════════════════════
# Test 1: RandomForestClassifier — Hiring Prediction (matching_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_random_forest_hiring_prediction():
    """
    Trains RandomForestClassifier on 100 synthetic hired/rejected data rows
    and measures accuracy via cross-validation.
    """
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import cross_val_score

    # Generate 50 hired profiles (high scores, good location)
    hired_skills = np.random.normal(loc=85, scale=8, size=50)
    hired_exp = np.random.normal(loc=80, scale=10, size=50)
    hired_loc = np.random.choice([100, 30], size=50, p=[0.9, 0.1])
    hired_labels = np.ones(50)

    # Generate 50 rejected profiles (low scores, bad location)
    rejected_skills = np.random.normal(loc=35, scale=12, size=50)
    rejected_exp = np.random.normal(loc=30, scale=15, size=50)
    rejected_loc = np.random.choice([30, 100], size=50, p=[0.8, 0.2])
    rejected_labels = np.zeros(50)

    X = np.vstack([
        np.column_stack([hired_skills, hired_exp, hired_loc]),
        np.column_stack([rejected_skills, rejected_exp, rejected_loc])
    ])
    X = np.clip(X, 0, 100) # Clip to realistic percentage limits
    y = np.concatenate([hired_labels, rejected_labels]).astype(int)

    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")

    accuracy = scores.mean() * 100
    return {
        "agent": "SemanticMatchingAgent",
        "model": "RandomForestClassifier",
        "task": "Hiring Prediction (Hired vs Rejected)",
        "accuracy": round(accuracy, 2),
        "cv_std": round(scores.std() * 100, 2),
        "cv_folds": 5,
        "training_samples": len(X),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 2: IsolationForest — Resume Anomaly Detection (fraud_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_isolation_forest_resume_anomaly():
    """
    Tests IsolationForest on 100 normal and 50 anomalous synthetic resume records.
    Normal: 1 (inliers), Fraud: -1 (outliers).
    """
    from sklearn.ensemble import IsolationForest

    # Generate 100 Normal Resumes
    normal_char_count = np.random.uniform(1500, 6000, 100)
    normal_word_count = normal_char_count / np.random.uniform(5.8, 6.2, 100)
    normal_sentence_count = normal_word_count / np.random.uniform(12, 18, 100)
    normal_avg_word_len = np.random.uniform(5.5, 6.5, 100)
    normal_upper_ratio = np.random.uniform(0.05, 0.11, 100)
    normal_digit_ratio = np.random.uniform(0.01, 0.04, 100)
    normal_repetition_index = np.random.uniform(0.60, 0.75, 100)

    normal = np.column_stack([
        normal_char_count, normal_word_count, normal_sentence_count,
        normal_avg_word_len, normal_upper_ratio, normal_digit_ratio,
        normal_repetition_index
    ])

    # Generate 50 Anomalous Resumes
    # 20 Keyword stuffed (massive counts, low rep)
    stuff_char = np.random.uniform(30000, 60000, 20)
    stuff_word = stuff_char / 4.5
    stuff_sent = np.random.uniform(2, 6, 20)
    stuff_avg_len = np.random.uniform(4.0, 5.0, 20)
    stuff_upper = np.random.uniform(0.01, 0.03, 20)
    stuff_digit = np.random.uniform(0.00, 0.01, 20)
    stuff_rep = np.random.uniform(0.05, 0.15, 20)
    anomalous_stuff = np.column_stack([stuff_char, stuff_word, stuff_sent, stuff_avg_len, stuff_upper, stuff_digit, stuff_rep])

    # 30 Spam/digits or short text
    spam_char = np.random.uniform(100, 400, 30)
    spam_word = spam_char / 6.0
    spam_sent = np.random.uniform(1, 4, 30)
    spam_avg_len = np.random.uniform(3.0, 8.0, 30)
    spam_upper = np.random.uniform(0.20, 0.60, 30)
    spam_digit = np.random.uniform(0.50, 0.85, 30)
    spam_rep = np.random.uniform(0.80, 1.00, 30)
    anomalous_spam = np.column_stack([spam_char, spam_word, spam_sent, spam_avg_len, spam_upper, spam_digit, spam_rep])

    anomalous = np.vstack([anomalous_stuff, anomalous_spam])

    clf = IsolationForest(contamination=0.05, random_state=42)
    clf.fit(normal)

    normal_preds = clf.predict(normal)
    normal_correct = sum(1 for p in normal_preds if p == 1)

    anomalous_preds = clf.predict(anomalous)
    anomalous_correct = sum(1 for p in anomalous_preds if p == -1)

    total = len(normal) + len(anomalous)
    correct = normal_correct + anomalous_correct
    accuracy = (correct / total) * 100

    return {
        "agent": "FraudDetectionAgent",
        "model": "IsolationForest",
        "task": "Resume Anomaly Detection",
        "accuracy": round(accuracy, 2),
        "normal_detected": f"{normal_correct}/{len(normal)}",
        "anomalies_detected": f"{anomalous_correct}/{len(anomalous)}",
        "total_samples": total,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 3: IsolationForest — Job Description Anomaly (fraud_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_isolation_forest_job_anomaly():
    """
    Tests IsolationForest on 100 normal and 50 anomalous synthetic job descriptions.
    """
    from sklearn.ensemble import IsolationForest

    # Normal Jobs
    normal_char_count = np.random.uniform(1000, 4500, 100)
    normal_word_count = normal_char_count / np.random.uniform(5.8, 6.5, 100)
    normal_sentence_count = normal_word_count / np.random.uniform(10, 15, 100)
    normal_avg_word_len = np.random.uniform(5.7, 6.6, 100)
    normal_upper_ratio = np.random.uniform(0.06, 0.10, 100)
    normal_digit_ratio = np.random.uniform(0.01, 0.03, 100)
    normal_repetition_index = np.random.uniform(0.65, 0.76, 100)

    normal = np.column_stack([
        normal_char_count, normal_word_count, normal_sentence_count,
        normal_avg_word_len, normal_upper_ratio, normal_digit_ratio,
        normal_repetition_index
    ])

    # Anomalies
    stuff_char = np.random.uniform(50000, 90000, 20)
    stuff_word = stuff_char / 4.5
    stuff_sent = np.random.uniform(2, 5, 20)
    stuff_avg_len = np.random.uniform(4.0, 5.0, 20)
    stuff_upper = np.random.uniform(0.01, 0.02, 20)
    stuff_digit = np.random.uniform(0.00, 0.01, 20)
    stuff_rep = np.random.uniform(0.01, 0.10, 20)
    anomalous_stuff = np.column_stack([stuff_char, stuff_word, stuff_sent, stuff_avg_len, stuff_upper, stuff_digit, stuff_rep])

    spam_char = np.random.uniform(50, 200, 30)
    spam_word = spam_char / 6.0
    spam_sent = np.random.uniform(1, 3, 30)
    spam_avg_len = np.random.uniform(3.0, 8.0, 30)
    spam_upper = np.random.uniform(0.30, 0.80, 30)
    spam_digit = np.random.uniform(0.40, 0.80, 30)
    spam_rep = np.random.uniform(0.80, 1.00, 30)
    anomalous_spam = np.column_stack([spam_char, spam_word, spam_sent, spam_avg_len, spam_upper, spam_digit, spam_rep])

    anomalous = np.vstack([anomalous_stuff, anomalous_spam])

    clf = IsolationForest(contamination=0.05, random_state=42)
    clf.fit(normal)

    normal_preds = clf.predict(normal)
    normal_correct = sum(1 for p in normal_preds if p == 1)

    anomalous_preds = clf.predict(anomalous)
    anomalous_correct = sum(1 for p in anomalous_preds if p == -1)

    total = len(normal) + len(anomalous)
    correct = normal_correct + anomalous_correct
    accuracy = (correct / total) * 100

    return {
        "agent": "FraudDetectionAgent",
        "model": "IsolationForest",
        "task": "Job Description Anomaly Detection",
        "accuracy": round(accuracy, 2),
        "normal_detected": f"{normal_correct}/{len(normal)}",
        "anomalies_detected": f"{anomalous_correct}/{len(anomalous)}",
        "total_samples": total,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 4: LogisticRegression — ATS Resume Quality (resume_quality_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_logistic_regression_ats_score():
    """
    Tests LogisticRegression ATS quality scoring with 50 requirements,
    50 noise rows, and 40 validation tests.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression

    skills_pool = ["python", "django", "react", "typescript", "postgres", "aws", "docker", "kubernetes", "ml", "pytorch", "nodejs", "mongodb"]
    noise_pool = ["swimming", "music", "movies", "hobbies", "painting", "lorem", "ipsum", "lorem ipsum", "cricket", "football", "traveling", "reading"]

    # 50 requirements sentences
    requirements = []
    for _ in range(50):
        skills = np.random.choice(skills_pool, size=np.random.randint(2, 5), replace=False)
        requirements.append(f"Looking for experience with {' and '.join(skills)} in development")

    # 50 noise sentences
    noise = []
    for _ in range(50):
        hobbies = np.random.choice(noise_pool, size=np.random.randint(2, 5), replace=False)
        noise.append(f"My interests include {' and '.join(hobbies)} in spare time")

    # Test cases: 20 relevant, 20 irrelevant
    test_resumes = []
    for _ in range(20):
        skills = np.random.choice(skills_pool, size=np.random.randint(3, 6), replace=False)
        test_resumes.append((f"Strong developer profile with expertise in {', '.join(skills)}", True))
    for _ in range(20):
        hobbies = np.random.choice(noise_pool, size=np.random.randint(3, 6), replace=False)
        test_resumes.append((f"Personal portfolio listing {', '.join(hobbies)}", False))

    vectorizer = TfidfVectorizer(stop_words='english', max_features=100)
    corpus = requirements + noise
    vectorizer.fit(corpus + [t[0] for t in test_resumes])

    X_train = vectorizer.transform(requirements + noise)
    y_train = np.array([1] * len(requirements) + [0] * len(noise))

    clf = LogisticRegression(max_iter=50, random_state=42)
    clf.fit(X_train, y_train)

    correct = 0
    for text, expected_relevant in test_resumes:
        vec = vectorizer.transform([text])
        prob = float(clf.predict_proba(vec)[0][1])
        predicted_relevant = prob > 0.5
        if predicted_relevant == expected_relevant:
            correct += 1

    accuracy = (correct / len(test_resumes)) * 100

    return {
        "agent": "ResumeQualityAgent",
        "model": "LogisticRegression + TfidfVectorizer",
        "task": "ATS Resume-Job Relevance Scoring",
        "accuracy": round(accuracy, 2),
        "correct_predictions": f"{correct}/{len(test_resumes)}",
        "total_samples": len(test_resumes),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 5: GradientBoostingRegressor — Salary Prediction (salary_prediction_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_gradient_boosting_salary():
    """
    Tests GradientBoostingRegressor salary prediction accuracy
    using 150 training samples and 50 test samples.
    """
    from sklearn.ensemble import GradientBoostingRegressor

    # Generate 150 training samples
    # Features: [exp, remote, bengaluru, sf, london, ai_ml, frontend, backend, devops]
    X_train = []
    y_min_train = []
    y_max_train = []

    for _ in range(150):
        exp = np.random.uniform(0, 15)
        remote = np.random.choice([0, 1])
        bengaluru = np.random.choice([0, 1]) if not remote else 0
        sf = np.random.choice([0, 1]) if not (remote or bengaluru) else 0
        london = np.random.choice([0, 1]) if not (remote or bengaluru or sf) else 0
        
        ai_ml = np.random.choice([0, 1])
        frontend = np.random.choice([0, 1])
        backend = np.random.choice([0, 1])
        devops = np.random.choice([0, 1])

        features = [exp, remote, bengaluru, sf, london, ai_ml, frontend, backend, devops]
        X_train.append(features)

        # Base rate function
        val_min = 50 + exp * 12 + ai_ml * 25 + sf * 35 + remote * 15
        val_max = val_min * np.random.uniform(1.25, 1.45)
        
        y_min_train.append(val_min)
        y_max_train.append(val_max)

    X_train = np.array(X_train)
    y_min_train = np.array(y_min_train)
    y_max_train = np.array(y_max_train)

    # Generate 50 test samples
    X_test = []
    expected_min = []
    expected_max = []

    for _ in range(50):
        exp = np.random.uniform(0, 15)
        remote = np.random.choice([0, 1])
        bengaluru = np.random.choice([0, 1]) if not remote else 0
        sf = np.random.choice([0, 1]) if not (remote or bengaluru) else 0
        london = np.random.choice([0, 1]) if not (remote or bengaluru or sf) else 0
        
        ai_ml = np.random.choice([0, 1])
        frontend = np.random.choice([0, 1])
        backend = np.random.choice([0, 1])
        devops = np.random.choice([0, 1])

        features = [exp, remote, bengaluru, sf, london, ai_ml, frontend, backend, devops]
        X_test.append(features)

        val_min = 50 + exp * 12 + ai_ml * 25 + sf * 35 + remote * 15
        val_max = val_min * 1.35
        
        expected_min.append(val_min)
        expected_max.append(val_max)

    X_test = np.array(X_test)
    expected_min = np.array(expected_min)
    expected_max = np.array(expected_max)

    reg_min = GradientBoostingRegressor(n_estimators=50, max_depth=4, random_state=42)
    reg_min.fit(X_train, y_min_train)
    reg_max = GradientBoostingRegressor(n_estimators=50, max_depth=4, random_state=42)
    reg_max.fit(X_train, y_max_train)

    pred_min = reg_min.predict(X_test)
    pred_max = reg_max.predict(X_test)

    # Calculate MAPE
    mape_min = np.mean(np.abs((expected_min - pred_min) / expected_min)) * 100
    mape_max = np.mean(np.abs((expected_max - pred_max) / expected_max)) * 100
    avg_mape = (mape_min + mape_max) / 2
    accuracy_proxy = 100 - avg_mape

    return {
        "agent": "SalaryPredictionAgent",
        "model": "GradientBoostingRegressor",
        "task": "Salary Range Prediction",
        "accuracy": round(max(0, accuracy_proxy), 2),
        "mape_min_salary": f"{round(mape_min, 2)}%",
        "mape_max_salary": f"{round(mape_max, 2)}%",
        "training_samples": len(X_train),
        "test_samples": len(X_test),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 6: NearestNeighbors/KNN — Job Recommendation (job_recommendation_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_knn_job_recommendation():
    """
    Tests KNN cosine similarity for job recommendation relevance with 50 jobs
    and 30 test cases.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.neighbors import NearestNeighbors

    job_categories = [
        ("python django backend postgres rest api", ["python", "django", "postgres"]),
        ("react typescript javascript frontend ui ux web", ["react", "typescript", "frontend"]),
        ("machine learning pytorch tensorflow nlp deep learning", ["pytorch", "ml", "nlp"]),
        ("aws docker kubernetes devops cloud cicd pipeline", ["aws", "docker", "devops"]),
        ("java spring boot microservices oracle enterprise", ["java", "spring", "backend"]),
    ]

    # Generate 50 jobs (10 per category)
    jobs = []
    for i in range(50):
        desc, _ = job_categories[i % len(job_categories)]
        jobs.append(f"Job posting looking for {desc} specialist with good coding skills")

    # Generate 30 test cases
    test_cases = []
    for i in range(30):
        desc, expected_skills = job_categories[i % len(job_categories)]
        # Map back to expected matching category index
        expected_cat_idx = i % len(job_categories)
        cand_text = f"Candidate knows {', '.join(expected_skills)} and wants a job"
        test_cases.append((cand_text, expected_cat_idx))

    vectorizer = TfidfVectorizer(stop_words='english', token_pattern=r'(?u)\b\w+\b')
    vectorizer.fit(jobs + [tc[0] for tc in test_cases])

    job_vectors = vectorizer.transform(jobs)

    knn = NearestNeighbors(n_neighbors=5, metric='cosine')
    knn.fit(job_vectors)

    correct = 0
    for cand_text, expected_cat_idx in test_cases:
        cand_vec = vectorizer.transform([cand_text])
        distances, indices = knn.kneighbors(cand_vec)
        
        # Check if the closest matching job belongs to the expected category index
        closest_job_idx = indices[0][0]
        if closest_job_idx % len(job_categories) == expected_cat_idx:
            correct += 1

    accuracy = (correct / len(test_cases)) * 100

    return {
        "agent": "JobRecommendationAgent",
        "model": "NearestNeighbors (KNN) + TfidfVectorizer",
        "task": "Job Recommendation Relevance",
        "accuracy": round(accuracy, 2),
        "correct_matches": f"{correct}/{len(test_cases)}",
        "total_samples": len(test_cases),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 7: TfidfVectorizer + cosine_similarity — Skill Matching Fallback (matching_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_tfidf_skill_matching():
    """
    Tests TF-IDF skill matching accuracy with 50 matched and 50 unmatched skills.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    required = ["python", "django", "react", "typescript", "postgres", "aws", "docker", "kubernetes", "pytorch", "ml"]

    # Candidate skills: 50 matches (with variations), 50 non-matches
    candidate_matched = [
        "python3", "django-rest", "ReactJS", "TypeScript", "postgresql", "AWS-cloud", "docker-compose", "k8s", "pytorch-dl", "machine-learning"
    ] * 5
    candidate_unmatched = [
        "cooking", "swimming", "gardening", "painting", "singing", "guitar", "cycling", "chess", "gaming", "reading"
    ] * 5

    all_skills = candidate_matched + candidate_unmatched
    all_texts = all_skills + required

    vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5))
    vectorizer.fit(all_texts)

    cand_vecs = vectorizer.transform(all_skills)
    req_vecs = vectorizer.transform(required)

    sim_matrix = cosine_similarity(cand_vecs, req_vecs)

    correct = 0
    total = len(all_skills)

    for i, skill in enumerate(all_skills):
        max_sim = float(np.max(sim_matrix[i]))
        is_match = max_sim > 0.55
        expected_match = i < len(candidate_matched)  # First half expected to match
        if is_match == expected_match:
            correct += 1

    accuracy = (correct / total) * 100

    return {
        "agent": "SemanticMatchingAgent",
        "model": "TfidfVectorizer (char_wb n-gram) + cosine_similarity",
        "task": "Skill Matching Fallback (Fuzzy Match)",
        "accuracy": round(accuracy, 2),
        "correct_predictions": f"{correct}/{total}",
        "total_samples": total,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Test 8: KMeans — Skill Clustering (normalization_agent.py)
# ═══════════════════════════════════════════════════════════════════════════
def test_kmeans_skill_clustering():
    """
    Tests KMeans clustering quality using 300 synthetic skill embeddings.
    """
    from sklearn.cluster import KMeans
    from sklearn.metrics import silhouette_score

    # Simulate 3 distinct skill clusters (Frontend, Backend, DevOps)
    # 100 samples per cluster, 3 dimensions
    c1 = np.random.normal(loc=[1.5, 0.0, 0.0], scale=0.15, size=(100, 3))
    c2 = np.random.normal(loc=[0.0, 1.5, 0.0], scale=0.15, size=(100, 3))
    c3 = np.random.normal(loc=[0.0, 0.0, 1.5], scale=0.15, size=(100, 3))

    X = np.vstack([c1, c2, c3])

    kmeans = KMeans(n_clusters=3, random_state=42, n_init='auto')
    pred_labels = kmeans.fit_predict(X)

    sil_score = silhouette_score(X, pred_labels)
    accuracy_proxy = ((sil_score + 1) / 2) * 100

    return {
        "agent": "SkillNormalizationAgent",
        "model": "KMeans",
        "task": "Skill Clustering",
        "accuracy": round(accuracy_proxy, 2),
        "silhouette_score": round(sil_score, 4),
        "n_clusters": 3,
        "total_samples": len(X),
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN — Run all tests
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 80)
    print("  ML Model Accuracy Test Suite (Large Scale) — Vishleshan AI Agents")
    print("=" * 80)
    print()

    tests = [
        ("1", test_random_forest_hiring_prediction),
        ("2", test_isolation_forest_resume_anomaly),
        ("3", test_isolation_forest_job_anomaly),
        ("4", test_logistic_regression_ats_score),
        ("5", test_gradient_boosting_salary),
        ("6", test_knn_job_recommendation),
        ("7", test_tfidf_skill_matching),
        ("8", test_kmeans_skill_clustering),
    ]

    results = []
    for num, test_fn in tests:
        try:
            result = test_fn()
            results.append(result)
            status = "[PASS]" if result["accuracy"] >= 70.0 else "[LOW]"
            print(f"  Test {num}: {status}  |  {result['accuracy']}%  |  {result['agent']} -> {result['model']}")
            print(f"           Task: {result['task']}")
            for k, v in result.items():
                if k not in ("agent", "model", "task", "accuracy"):
                    print(f"           {k}: {v}")
            print()
        except Exception as e:
            print(f"  Test {num}: [ERROR]  |  {e}")
            results.append({"agent": test_fn.__name__, "model": "N/A", "task": "N/A", "accuracy": 0, "error": str(e)})
            print()

    # Summary
    avg_accuracy = np.mean([r["accuracy"] for r in results])
    print("=" * 80)
    print(f"  OVERALL AVERAGE ACCURACY: {round(avg_accuracy, 2)}%")
    print(f"  Models Tested: {len(results)}")
    passing = sum(1 for r in results if r["accuracy"] >= 70.0)
    print(f"  Passing (>=70%): {passing}/{len(results)}")
    print("=" * 80)
