import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

# Define paths
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPTS_DIR, ".."))
DATASETS_DIR = os.path.join(BACKEND_DIR, "datasets")
MODELS_DIR = os.path.join(BACKEND_DIR, "models")

# 1. Re-create DSL-StrongPasswordData.csv if not present
FRAUD_CSV_PATH = os.path.join(DATASETS_DIR, "DSL-StrongPasswordData.csv")

np.random.seed(42)
num_samples = 1000

data = {}
feature_names = [
    'H.period', 'DD.period.t', 'UD.period.t', 'H.t', 'DD.t.i', 'UD.t.i', 'H.i', 'DD.i.e', 'UD.i.e', 'H.e',
    'DD.e.five', 'UD.e.five', 'H.five', 'DD.five.Shift.r', 'UD.five.Shift.r', 'H.Shift.r', 'DD.Shift.r.o',
    'UD.Shift.r.o', 'H.o', 'DD.o.a', 'UD.o.a', 'H.a', 'DD.a.n', 'UD.a.n', 'H.n', 'DD.n.l', 'UD.n.l', 'H.l',
    'DD.l.Return', 'UD.l.Return', 'H.Return'
]

for col in feature_names:
    if col.startswith('H.'):
        data[col] = np.random.normal(0.10, 0.02, num_samples)
    else:
        data[col] = np.random.normal(0.20, 0.05, num_samples)

df_typing = pd.DataFrame(data)

if not os.path.exists(FRAUD_CSV_PATH):
    print(f"Creating Keystroke Dynamics CSV at: {FRAUD_CSV_PATH}")
    df_cmu = df_typing.copy()
    df_cmu.insert(0, 'subject', 's002')
    df_cmu.insert(1, 'sessionIndex', 1)
    df_cmu.insert(2, 'rep', range(1, num_samples + 1))
    df_cmu.to_csv(FRAUD_CSV_PATH, index=False)
else:
    print(f"Loading existing Keystroke Dynamics CSV from: {FRAUD_CSV_PATH}")
    df_cmu = pd.read_csv(FRAUD_CSV_PATH)
    for col in ['subject', 'sessionIndex', 'rep']:
        if col in df_cmu.columns:
            df_cmu = df_cmu.drop(columns=[col])
    df_typing = df_cmu

# 2. Train IsolationForest anomaly detector on normal typing patterns
print("Training IsolationForest for keystroke dynamics anomaly detection...")
X_train = df_typing.values
clf = IsolationForest(contamination=0.03, random_state=42)
clf.fit(X_train)

# 3. Save pickle
fraud_model_pkl = os.path.join(MODELS_DIR, "fraud_model.pkl")
os.makedirs(MODELS_DIR, exist_ok=True)
with open(fraud_model_pkl, "wb") as f:
    pickle.dump(clf, f)

print(f"Keystroke dynamics fraud detection model successfully saved to: {fraud_model_pkl}")
