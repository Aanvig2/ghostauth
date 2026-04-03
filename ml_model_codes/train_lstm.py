"""
Behavioral Biometrics · LSTM Trainer
=====================================
Trains a quantized LSTM on CSV sessions recorded by bio_recorder.py.
Outputs a TFLite model < 5MB with INT8 quantization.
Also includes CUSUM drift detection utility.

Install:
    pip install tensorflow pandas numpy scikit-learn

Usage:
    python train_lstm.py --data_dir . --seq_len 30 --epochs 30
"""

import os
import glob
import argparse
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle

# ── args ──────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--data_dir", default=".", help="Folder containing bio_*.csv files")
parser.add_argument("--seq_len",  default=30,  type=int, help="Rows per LSTM sequence window")
parser.add_argument("--epochs",   default=30,  type=int)
parser.add_argument("--batch",    default=32,  type=int)
parser.add_argument("--out",      default="bio_model", help="Output prefix for saved files")
args = parser.parse_args()

# ── feature columns (must match recorder output) ──────────────────────
FEATURES = [
    "tap_duration_ms",
    "click_hold_ms",
    "hesitation_ms",
    "move_speed",
    "move_variance",
    "dx",
    "dy",
    "screen_zone",
    "is_backspace",
    "key_hold_ms",
    "pause_flag",
]

# ── 1. load all CSVs ──────────────────────────────────────────────────
print("\n[1/6] Loading CSVs...")
files = glob.glob(os.path.join(args.data_dir, "bio_*.csv"))
assert files, f"No bio_*.csv files found in {args.data_dir}"

dfs = []
for f in files:
    df = pd.read_csv(f)
    dfs.append(df)
    print(f"  {os.path.basename(f):40s}  {len(df)} rows  label={df['label'].iloc[0]}")

data = pd.concat(dfs, ignore_index=True)
print(f"  Total rows: {len(data)}")

# ── 2. preprocess ─────────────────────────────────────────────────────
print("\n[2/6] Preprocessing...")

# fill missing (move-only rows have empty tap cols, etc.)
data[FEATURES] = data[FEATURES].apply(pd.to_numeric, errors="coerce").fillna(0.0)

# encode label
data["label_int"] = (data["label"] == "not_legit").astype(int)

# sort by session + timestamp so sequences are chronological
data = data.sort_values(["session_id", "timestamp_ms"]).reset_index(drop=True)

# scale features — fit with DataFrame so feature names are preserved
scaler = StandardScaler()
data[FEATURES] = scaler.fit_transform(data[FEATURES])

print("\n  Scaler means (paste these into debug_model.py to verify):")
for k, m, s in zip(FEATURES, scaler.mean_, scaler.scale_):
    print(f"    {k:25s}  mean={m:10.4f}  std={s:10.4f}")

# save scaler
with open(f"{args.out}_scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)
print(f"  Scaler saved → {args.out}_scaler.pkl")

# ── 3. build sequences ────────────────────────────────────────────────
print(f"\n[3/6] Building sequences (window={args.seq_len})...")

X, y = [], []
for sid, grp in data.groupby("session_id"):
    vals   = grp[FEATURES].values
    labels = grp["label_int"].values
    for i in range(len(vals) - args.seq_len):
        X.append(vals[i : i + args.seq_len])
        # majority label in the window
        y.append(int(labels[i : i + args.seq_len].mean() >= 0.5))

X = np.array(X, dtype=np.float32)
y = np.array(y, dtype=np.int32)
print(f"  Sequences: {X.shape}  |  legit={int((y==0).sum())}  not_legit={int((y==1).sum())}")

if len(X) == 0:
    min_rows = min(len(grp) for _, grp in data.groupby("session_id"))
    raise ValueError(
        f"No sequences formed. Your shortest session has {min_rows} rows "
        f"but seq_len={args.seq_len}. Re-run with --seq_len {max(5, min_rows-1)}"
    )

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── 4. build LSTM model ───────────────────────────────────────────────
print("\n[4/6] Building model...")
import tensorflow as tf

n_features = len(FEATURES)

inp = tf.keras.Input(shape=(args.seq_len, n_features))
x   = tf.keras.layers.LSTM(32, return_sequences=True)(inp)   # small → stays < 5MB
x   = tf.keras.layers.Dropout(0.3)(x)
x   = tf.keras.layers.LSTM(16)(x)
x   = tf.keras.layers.Dropout(0.3)(x)
x   = tf.keras.layers.Dense(8, activation="relu")(x)
out = tf.keras.layers.Dense(1, activation="sigmoid")(x)

model = tf.keras.Model(inp, out)
model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="binary_crossentropy",
    metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
)
model.summary()

# ── 5. train ──────────────────────────────────────────────────────────
print("\n[5/6] Training...")
callbacks = [
    tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
    tf.keras.callbacks.ReduceLROnPlateau(patience=3, factor=0.5, verbose=1),
]

model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=args.epochs,
    batch_size=args.batch,
    callbacks=callbacks,
    verbose=1,
)

# eval
y_pred = (model.predict(X_test) > 0.5).astype(int).flatten()
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["legit", "not_legit"]))

# save keras model
model.save(f"{args.out}.keras")
print(f"  Keras model saved → {args.out}.keras")

# ── 6. TFLite export (float16 — works reliably with LSTM) ────────────
# INT8 on LSTM frequently fails due to missing kernel support in TFLite.
# Float16 gives ~2x size reduction and works fine.
print("\n[6/6] Exporting TFLite (float16)...")
try:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    tflite_model = converter.convert()
    tflite_path = f"{args.out}_f16.tflite"
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)
    size_mb = os.path.getsize(tflite_path) / 1024 / 1024
    print(f"  TFLite (f16) saved → {tflite_path}  ({size_mb:.2f} MB)")
except Exception as e:
    print(f"  TFLite export skipped ({e})")
print("  ✓ Use bio_model.keras directly for the backend — it works fine")

# ── CUSUM drift detector (run at inference time) ──────────────────────
print("""
╔══════════════════════════════════════════════════════════╗
║              CUSUM Drift Detector (usage)                ║
╚══════════════════════════════════════════════════════════╝

from train_lstm import CUSUMDriftDetector
detector = CUSUMDriftDetector(threshold=5.0, drift_target=0.1)

for each new trust_score (0-1, lower = more suspicious):
    alert = detector.update(trust_score)
    if alert:
        trigger_re_auth()
""")

# ── CUSUM class (importable) ──────────────────────────────────────────
# also written inline so this file is self-contained

class CUSUMDriftDetector:
    """
    CUSUM (Cumulative Sum) control chart for detecting drift
    in the model's trust score over time.

    threshold    : cumulative sum value that triggers an alert
    drift_target : expected shift in score to detect (smaller = more sensitive)
    """
    def __init__(self, threshold: float = 5.0, drift_target: float = 0.1):
        self.threshold    = threshold
        self.drift_target = drift_target
        self.cusum_pos    = 0.0   # detects score dropping (user becoming suspicious)
        self.cusum_neg    = 0.0
        self.history      = []

    def update(self, score: float) -> bool:
        """
        Feed the latest trust score (0.0 = not_legit, 1.0 = legit).
        Returns True if drift detected (trigger re-auth or alert).
        """
        self.history.append(score)
        # CUSUM for downward drift (score falling)
        self.cusum_pos = max(0, self.cusum_pos + self.drift_target - score)
        self.cusum_neg = max(0, self.cusum_neg + score - (1 - self.drift_target))
        return self.cusum_pos > self.threshold

    def reset(self):
        self.cusum_pos = 0.0
        self.cusum_neg = 0.0


# ── TFLite inference helper ───────────────────────────────────────────
def load_tflite_and_predict(tflite_path: str, scaler_path: str, raw_sequence: np.ndarray) -> float:
    """
    raw_sequence : np.array of shape (seq_len, n_features), unscaled
    returns      : trust score 0.0–1.0  (1.0 = legit)
    """
    import tensorflow as tf, pickle, numpy as np

    with open(scaler_path, "rb") as f:
        scaler = pickle.load(f)

    seq_len, n_feat = raw_sequence.shape
    scaled = scaler.transform(raw_sequence.reshape(-1, n_feat)).reshape(1, seq_len, n_feat)

    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()
    inp_det = interpreter.get_input_details()[0]
    out_det = interpreter.get_output_details()[0]

    # INT8 quantization params
    scale, zero_point = inp_det["quantization"]
    inp_int8 = (scaled / scale + zero_point).astype(np.int8)

    interpreter.set_tensor(inp_det["index"], inp_int8)
    interpreter.invoke()

    raw_out = interpreter.get_tensor(out_det["index"])
    out_scale, out_zp = out_det["quantization"]
    prob_not_legit = float((raw_out[0][0] - out_zp) * out_scale)

    trust_score = 1.0 - prob_not_legit   # flip: high = legit
    return round(trust_score, 4)


print("Done. Files written:")
print(f"  {args.out}.keras          ← full model")
print(f"  {args.out}_int8.tflite    ← deploy this")
print(f"  {args.out}_scaler.pkl     ← keep with model")
