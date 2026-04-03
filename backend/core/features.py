

import math
import time

PHONE_W = 360
PHONE_H = 740
PAUSE_THRESHOLD_MS = 1500
BUCKET_MS = 100 


def screen_zone(x, y):
    col = min(int(x / (PHONE_W / 3)), 2)
    row = min(int(y / (PHONE_H / 3)), 2)
    return row * 3 + col + 1


class FeatureBuffer:
    def __init__(self, maxlen=512):
        self.rows         = []
        self.maxlen       = maxlen
        self._last_ts     = None
        self._prev_move   = None      
        self._click_ts    = None      
        self._move_speeds = []        
        self._bucket_ts   = None     

    def _hesitation(self, ts):
        gap = 0.0 if self._last_ts is None else ts - self._last_ts
        pause = 1 if gap > PAUSE_THRESHOLD_MS else 0
        self._last_ts = ts
        return round(gap, 2), pause

    def _push(self, row):
        clean = {k: (0.0 if v is None else v) for k, v in row.items()}
        self.rows.append(clean)
        if len(self.rows) > self.maxlen:
            self.rows.pop(0)

    def ingest(self, event: dict):
        ts    = float(event.get("ts") or (time.time() * 1000))
        etype = event.get("type", "")

        if etype == "move":
            x = float(event.get("x") or 0)
            y = float(event.get("y") or 0)
            dx = float(event.get("dx") or 0)
            dy = float(event.get("dy") or 0)

            speed = 0.0
            if self._prev_move:
                px, py, pt = self._prev_move
                ddx = x - px
                ddy = y - py
                dt  = max(ts - pt, 1.0)
                speed = math.sqrt(ddx**2 + ddy**2) / dt

            self._prev_move = (x, y, ts)

            if self._bucket_ts is None:
                self._bucket_ts = ts
            self._move_speeds.append(speed)

            if ts - self._bucket_ts >= BUCKET_MS:
                speeds = self._move_speeds
                mean_s = sum(speeds) / len(speeds)
                var_s  = sum((s - mean_s) ** 2 for s in speeds) / len(speeds)
                hes, pause = self._hesitation(ts)

                self._push({
                    "tap_duration_ms": 0.0,
                    "click_hold_ms":   0.0,
                    "hesitation_ms":   hes,
                    "move_speed":      round(mean_s, 4),
                    "move_variance":   round(var_s, 4),
                    "dx":              round(abs(dx), 2),
                    "dy":              round(abs(dy), 2),
                    "screen_zone":     screen_zone(x, y),
                    "is_backspace":    0,
                    "key_hold_ms":     0.0,
                    "pause_flag":      pause,
                })

                self._move_speeds = []
                self._bucket_ts   = ts

        elif etype in ("click", "tap"):
            x = float(event.get("x") or 0)
            y = float(event.get("y") or 0)
            hes, pause = self._hesitation(ts)

            hold = 0.0
            if self._click_ts is not None:
                raw_hold = ts - self._click_ts
                hold = min(raw_hold, 2000.0)
            self._click_ts = ts

            self._push({
                "tap_duration_ms": round(hold, 2),
                "click_hold_ms":   round(hold, 2),
                "hesitation_ms":   hes,
                "move_speed":      0.0,
                "move_variance":   0.0,
                "dx":              0.0,
                "dy":              0.0,
                "screen_zone":     screen_zone(x, y),
                "is_backspace":    0,
                "key_hold_ms":     0.0,
                "pause_flag":      pause,
            })

        elif etype == "key":
            is_bs = 1 if event.get("is_backspace") else 0
            hold  = float(event.get("hold_ms") or 0)
            hes, pause = self._hesitation(ts)

            self._push({
                "tap_duration_ms": 0.0,
                "click_hold_ms":   0.0,
                "hesitation_ms":   hes,
                "move_speed":      0.0,
                "move_variance":   0.0,
                "dx":              0.0,
                "dy":              0.0,
                "screen_zone":     0.0,
                "is_backspace":    float(is_bs),
                "key_hold_ms":     round(hold, 2),
                "pause_flag":      pause,
            })

    def reset(self):
        self.rows         = []
        self._last_ts     = None
        self._prev_move   = None
        self._click_ts    = None
        self._move_speeds = []
        self._bucket_ts   = None
