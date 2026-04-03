

import os
import pickle
import numpy as np

FEATURE_KEYS = [
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

N_FEATURES = len(FEATURE_KEYS)
MODEL_DIR   = os.path.dirname(__file__)
KERAS_PATH  = os.path.join(MODEL_DIR, "bio_model.keras")
SCALER_PATH = os.path.join(MODEL_DIR, "bio_model_scaler.pkl")


class LSTMBehaviorModel:
    def __init__(self):
        self.keras_model = None
        self.scaler      = None
        self.seq_len     = 30
        self._load()

    def _load(self):
        missing = []
        if not os.path.exists(KERAS_PATH):
            missing.append(f"  bio_model.keras  → copy from where you ran train_lstm.py")
        if not os.path.exists(SCALER_PATH):
            missing.append(f"  bio_model_scaler.pkl  → copy from where you ran train_lstm.py")

        if missing:
            print("[LSTMModel] ⚠ Model files not found — running in neutral mode (score=70)")
            print("[LSTMModel] Missing files (place in backend/ml/):")
            for m in missing:
                print(m)
            return

        import tensorflow as tf
        self.keras_model = tf.keras.models.load_model(KERAS_PATH)

        # seq_len from model input shape: (None, seq_len, n_features)
        self.seq_len = self.keras_model.input_shape[1]

        with open(SCALER_PATH, "rb") as f:
            self.scaler = pickle.load(f)

        print(f"[LSTMModel] ✓ Loaded  seq_len={self.seq_len}  features={N_FEATURES}")

    @property
    def ready(self):
        return self.keras_model is not None and self.scaler is not None

    def predict_trust_score(self, feature_rows: list) -> float:
        """
        feature_rows : list of dicts with FEATURE_KEYS.
        Returns      : trust score 0–100  (100 = definitely legit)
        """
        if not self.ready:
            return 70.0  # neutral fallback — model not loaded

        if len(feature_rows) < self.seq_len:
            return 70.0  # still buffering

        rows = feature_rows[-self.seq_len:]
        raw = np.array(
            [[float(r.get(k) or 0.0) for k in FEATURE_KEYS] for r in rows],
            dtype=np.float32,
        )  # (seq_len, n_features)

        scaled = self.scaler.transform(raw).reshape(1, self.seq_len, N_FEATURES)

        # Output: P(not_legit) → flip to trust score
        prob_not_legit = float(self.keras_model.predict(scaled, verbose=0)[0][0])
        prob_not_legit = max(0.0, min(1.0, prob_not_legit))
        return round((1.0 - prob_not_legit) * 100.0, 1)


model = LSTMBehaviorModel()
