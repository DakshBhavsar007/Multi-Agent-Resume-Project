import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

# Define paths
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPTS_DIR, ".."))
DATASETS_DIR = os.path.join(BACKEND_DIR, "datasets")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

# 1. Re-create Kaggle Salary.csv data if not present
SALARY_CSV_PATH = os.path.join(DATASETS_DIR, "Salary.csv")

kaggle_data = {
    "YearsExperience": [
        1.1, 1.3, 1.5, 2.0, 2.2, 2.9, 3.0, 3.2, 3.2, 3.7,
        3.9, 4.0, 4.0, 4.1, 4.5, 4.9, 5.1, 5.3, 5.9, 6.0,
        6.8, 7.1, 7.9, 8.2, 8.7, 9.0, 9.5, 9.6, 10.3, 10.5
    ],
    "Salary": [
        39343, 46205, 37731, 43525, 39891, 56642, 60150, 54445, 64445, 57189,
        63218, 55794, 56957, 57081, 61111, 67938, 66029, 83088, 81363, 93940,
        91738, 98273, 101302, 113812, 109431, 105582, 116969, 112635, 122391, 121872
    ]
}

if not os.path.exists(SALARY_CSV_PATH):
    df_kaggle = pd.DataFrame(kaggle_data)
    df_kaggle.to_csv(SALARY_CSV_PATH, index=False)
else:
    df_kaggle = pd.read_csv(SALARY_CSV_PATH)

# Fit a simple linear model to Kaggle data to get the baseline regression parameters
from sklearn.linear_model import LinearRegression
X_k = df_kaggle[["YearsExperience"]].values
y_k = df_kaggle["Salary"].values
lr = LinearRegression()
lr.fit(X_k, y_k)
intercept = lr.intercept_
slope = lr.coef_[0]

# 2. Generate synthetic software engineering dataset in USD (thousands)
np.random.seed(42)
num_samples = 1500

experience = np.random.uniform(0, 15, num_samples)
is_remote = np.random.binomial(1, 0.4, num_samples)
is_bengaluru = np.random.binomial(1, 0.3, num_samples)
is_sf = np.random.binomial(1, 0.2, num_samples)
is_london = np.random.binomial(1, 0.15, num_samples)
has_ai_ml = np.random.binomial(1, 0.35, num_samples)
has_frontend = np.random.binomial(1, 0.4, num_samples)
has_backend = np.random.binomial(1, 0.5, num_samples)
has_devops = np.random.binomial(1, 0.25, num_samples)

# Make locations mutually exclusive
for i in range(num_samples):
    loc_sum = is_bengaluru[i] + is_sf[i] + is_london[i]
    if loc_sum > 1:
        chosen = np.random.choice(["bengaluru", "sf", "london"])
        is_bengaluru[i] = 1 if chosen == "bengaluru" else 0
        is_sf[i] = 1 if chosen == "sf" else 0
        is_london[i] = 1 if chosen == "london" else 0

X_synthetic = np.column_stack([
    experience, is_remote, is_bengaluru, is_sf, is_london,
    has_ai_ml, has_frontend, has_backend, has_devops
])

y_min = []
y_max = []

for i in range(num_samples):
    # Base USD salary in thousands from Kaggle model
    base = (intercept + slope * experience[i]) / 1000.0
    
    # USD adjustments (in thousands)
    adj = 0.0
    if is_remote[i]:
        adj += 5.0
    if is_sf[i]:
        adj += 30.0
    elif is_london[i]:
        adj += 10.0
    elif is_bengaluru[i]:
        adj -= 10.0
        
    if has_ai_ml[i]:
        adj += 20.0
    if has_devops[i]:
        adj += 10.0
    if has_backend[i]:
        adj += 6.0
    if has_frontend[i]:
        adj += 3.0
        
    noise = np.random.normal(0, 5.0)
    salary_min = max(40.0, base + adj + noise)
    salary_max = salary_min * np.random.uniform(1.25, 1.4)
    
    y_min.append(salary_min)
    y_max.append(salary_max)

# 3. Train models
model_min = RandomForestRegressor(n_estimators=100, random_state=42)
model_min.fit(X_synthetic, y_min)

model_max = RandomForestRegressor(n_estimators=100, random_state=42)
model_max.fit(X_synthetic, y_max)

# 4. Save pickle
salary_model_pkl = os.path.join(MODELS_DIR, "salary_model.pkl")
os.makedirs(MODELS_DIR, exist_ok=True)
with open(salary_model_pkl, "wb") as f:
    pickle.dump({
        "min_model": model_min,
        "max_model": model_max
    }, f)

print("Salary model successfully re-trained in USD thousands scale.")
