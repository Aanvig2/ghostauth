"""
WebSocket stream — tunable parameters at the top.
"""

import hashlib
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.features import FeatureBuffer
from core.cusum import CUSUMDetector
from core.risk_engine import get_trust_level
from ml.model import model, FEATURE_KEYS

router = APIRouter()

# ════════════════════════════════════════════════════════════════
#  TUNING KNOBS — adjust these to control score behaviour
# ════════════════════════════════════════════════════════════════

INITIAL_SCORE = 95.0   # score when session starts

# How fast the displayed score chases the target each inference tick.
# Lower = slower drop and recovery.
# 0.05 = very slow (takes ~60 ticks to fully land)
# 0.10 = slow      (takes ~30 ticks)
# 0.20 = medium    (~15 ticks)
# 0.30 = fast      (~8 ticks)
DECAY_RATE = 0.01

HES_FAST_MS   = 6       # mean - 1std
HES_NORMAL_LO = 6
HES_NORMAL_HI = 290     # mean + 1std
HES_SLOW_MS   = 575     # mean + 3std — truly frozen

TREMOR_LEGIT  = 0.155   # mean + 1std
TREMOR_MEDIUM = 0.285   # mean + 2std
TREMOR_BAD    = 0.415   # mean + 3std

SPEED_MIN = 0.001       # anything moving counts
SPEED_MAX = 0.835       # mean + 2std

PAUSE_MULTIPLIER = 2.0
BS_MULTIPLIER    = 3.0

W_HESITATION = 0.30
W_TREMOR     = 0.30
W_SPEED      = 0.20
W_PAUSE      = 0.10
W_BACKSPACE  = 0.10

CUSUM_PENALTY_THRESHOLD = 60
CUSUM_PENALTY = 0.05

# ════════════════════════════════════════════════════════════════

user_state: dict = {}


def _make_state():
    return {
        "buffer":       FeatureBuffer(maxlen=512),
        "cusum":        CUSUMDetector(),
        "smooth_score": INITIAL_SCORE,
    }


def _rule_score(rows: list) -> float:
    if not rows:
        return 80.0
    w = rows[-30:]

    def avg(k):
        vals = [float(r.get(k) or 0.0) for r in w]
        return sum(vals) / len(vals) if vals else 0.0

    hesitation    = avg("hesitation_ms")
    move_variance = avg("move_variance")
    move_speed    = avg("move_speed")
    pause_flag    = avg("pause_flag")
    is_backspace  = avg("is_backspace")

    # Hesitation
    if hesitation < HES_FAST_MS:
        hes_score = 0.7
    elif hesitation <= HES_NORMAL_HI:
        hes_score = 1.0
    elif hesitation <= HES_SLOW_MS:
        hes_score = 0.6
    else:
        hes_score = 0.2

    # Tremor
    if move_variance < TREMOR_LEGIT:
        tremor_score = 1.0
    elif move_variance < TREMOR_MEDIUM:
        tremor_score = 0.6
    elif move_variance < TREMOR_BAD:
        tremor_score = 0.3
    else:
        tremor_score = 0.1

    # Speed
    if SPEED_MIN <= move_speed <= SPEED_MAX:
        speed_score = 1.0
    elif move_speed < SPEED_MIN:
        speed_score = 0.6
    else:
        speed_score = 0.4

    # Pause and backspace
    pause_score = max(0.0, 1.0 - pause_flag * PAUSE_MULTIPLIER)
    bs_score    = max(0.0, 1.0 - is_backspace * BS_MULTIPLIER)

    raw = (
        hes_score    * W_HESITATION +
        tremor_score * W_TREMOR     +
        speed_score  * W_SPEED      +
        pause_score  * W_PAUSE      +
        bs_score     * W_BACKSPACE
    )
    return round(raw * 100.0, 1)


def _blend_score(rule: float, lstm: float) -> float:
    lstm_confidence = abs(lstm - 50) / 50.0
    if lstm_confidence < 0.2:
        return rule * 0.85 + lstm * 0.15
    else:
        return rule * 0.5 + lstm * 0.5


def _aura_hash(rows, salt="ghostauth-2025"):
    if not rows:
        return ""
    vec = [round(sum(float(r.get(k) or 0.0) for r in rows) / len(rows), 4) for k in FEATURE_KEYS]
    payload = json.dumps(vec, separators=(",", ":")) + "||" + salt
    return hashlib.sha256(payload.encode()).hexdigest()


def _display_vec(rows):
    if not rows:
        return {}
    w = rows[-30:]
    def avg(k):
        vals = [float(r.get(k) or 0.0) for r in w]
        return round(sum(vals) / len(vals), 4) if vals else 0.0
    return {
        "deltaTap":      avg("hesitation_ms"),
        "pAvgTouch":     avg("click_hold_ms"),
        "sigmaTremor":   avg("move_variance"),
        "vSwipe":        avg("move_speed"),
        "navOrder":      avg("screen_zone"),
        "avgJerk":       avg("move_variance"),
        "curvature":     avg("dx"),
        "hesitation_ms": avg("hesitation_ms"),
        "move_variance": avg("move_variance"),
        "move_speed":    avg("move_speed"),
        "pause_flag":    avg("pause_flag"),
        "is_backspace":  avg("is_backspace"),
    }


@router.websocket("/ws/{user_id}")
async def stream(websocket: WebSocket, user_id: str):
    await websocket.accept()
    user_state[user_id] = _make_state()
    state = user_state[user_id]

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "reset":
                user_state[user_id] = _make_state()
                state = user_state[user_id]
                await websocket.send_json({"score": int(INITIAL_SCORE), "reset": True})
                continue

            state["buffer"].ingest(data)
            rows = state["buffer"].rows

            if len(rows) < 5:
                await websocket.send_json({
                    "score":    int(state["smooth_score"]),
                    "level":    get_trust_level(int(state["smooth_score"]))["level"],
                    "action":   get_trust_level(int(state["smooth_score"]))["action"],
                    "auraHash": "", "vec": {}, "drift": False, "rowCount": len(rows),
                })
                continue

            rule = _rule_score(rows)

            if model.ready and len(rows) >= model.seq_len:
                lstm = model.predict_trust_score(rows)
            else:
                lstm = rule

            target = _blend_score(rule, lstm)

            prev = state["smooth_score"]
            state["smooth_score"] = prev + DECAY_RATE * (target - prev)
            smooth = state["smooth_score"]

            drift = state["cusum"].update(smooth)
            if drift and smooth < CUSUM_PENALTY_THRESHOLD:
                state["smooth_score"] = max(0.0, smooth - CUSUM_PENALTY)
                smooth = state["smooth_score"]

            score  = max(0, min(100, int(round(smooth))))
            result = get_trust_level(score)
            aura   = _aura_hash(rows[-model.seq_len:] if len(rows) >= model.seq_len else rows)
            vec    = _display_vec(rows)

            print(f"[score] rows={len(rows)} rule={rule:.1f} lstm={lstm:.1f} target={target:.1f} smooth={smooth:.1f} score={score} hes={avg_val(rows,'hesitation_ms'):.0f}ms spd={avg_val(rows,'move_speed'):.3f} var={avg_val(rows,'move_variance'):.4f}")

            await websocket.send_json({
                "score": score, "level": result["level"], "action": result["action"],
                "auraHash": aura, "vec": vec, "drift": drift,
                "rowCount": len(rows), "ruleRaw": round(rule, 1), "lstmRaw": round(lstm, 1),
            })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[stream] {user_id}: {e}")
        import traceback; traceback.print_exc()
        try:
            await websocket.close()
        except Exception:
            pass


def avg_val(rows, k):
    vals = [float(r.get(k) or 0.0) for r in rows[-30:]]
    return sum(vals) / len(vals) if vals else 0.0
