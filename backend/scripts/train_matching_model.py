import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Define paths
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPTS_DIR, ".."))
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

# 1. Generate synthetic historical decisions (1000 samples)
# Features: [skill_score, experience_score, location_score]
np.random.seed(42)
num_samples = 1000

skills = np.random.uniform(30, 100, num_samples)
experience = np.random.uniform(20, 100, num_samples)
location = np.random.uniform(30, 100, num_samples)

X_synthetic = np.column_stack([skills, experience, location])
y = []

for i in range(num_samples):
    p = 0.1
    s = skills[i]
    e = experience[i]
    l = location[i]
    
    if s >= 85 and e >= 80:
        p += 0.55
    elif s >= 70 and e >= 60:
        p += 0.35
    elif s >= 50:
        p += 0.15
        
    if l >= 80:
        p += 0.15
    elif l <= 40:
        p -= 0.05
        
    if s > 90 and e > 90:
        p += 0.20
        
    p = max(0.01, min(0.99, p))
    label = np.random.choice([0, 1], p=[1 - p, p])
    y.append(label)

# 2. Train model
print("Training RandomForestClassifier for hiring probability...")
clf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
clf.fit(X_synthetic, y)

# 3. Save pickle
matching_model_pkl = os.path.join(MODELS_DIR, "matching_model.pkl")
os.makedirs(MODELS_DIR, exist_ok=True)
with open(matching_model_pkl, "wb") as f:
    pickle.dump(clf, f)

print(f"Matching decision model successfully saved to: {matching_model_pkl}")
