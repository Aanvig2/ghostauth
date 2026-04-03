# GhostAuth — Setup Guide

## 1. Train the model (if not done yet)
```bash
python bio_recorder.py   # record sessions, label legit/not_legit
python train_lstm.py --data_dir .
```

## 2. Copy model files into backend
```bash
cp bio_model_int8.tflite  ghostauth/backend/ml/
cp bio_model_scaler.pkl   ghostauth/backend/ml/
```

## 3. Start backend
```bash
cd ghostauth/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 4. Start frontend
```bash
cd ghostauth
npm install
npm run dev
```

## 5. Open http://localhost:5173
- Top bar shows **LSTM Backend ●** when connected (green) or **Backend ○** (orange = frontend-only mode)
- The monitor panel on the right shows:
  - Live feature values (hesitation, tremor, speed, pressure, navigation zone)
  - Aura Hash: SHA-256 of the real LSTM feature vector computed server-side
  - Trust score from your trained model (not dummy values)
- Attack simulator still works in frontend-only mode

## Feature vector (what the LSTM scores)
| Feature | Source |
|---|---|
| hesitation_ms | gap between events |
| move_speed | mouse velocity |
| move_variance | tremor (σ of speed) |
| click_hold_ms | how long button held |
| tap_duration_ms | tap duration |
| dx / dy | net displacement per bucket |
| screen_zone | 3×3 grid zone of clicks |
| is_backspace | 1 if backspace key |
| key_hold_ms | key hold duration |
| pause_flag | 1 if gap > 1500ms |
