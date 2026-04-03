"""
Enroll endpoint — no longer needed for LSTM (model is pre-trained).
Kept as a stub so the router doesn't break.
Returns a 200 with a note.
"""
from fastapi import APIRouter

router = APIRouter()

@router.post("/enroll/{user_id}")
async def enroll(user_id: str):
    return {
        "status": "ok",
        "note": "LSTM model is pre-trained. Enrollment resets the user's CUSUM baseline only.",
        "user_id": user_id,
    }
