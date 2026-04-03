from fastapi import APIRouter

router = APIRouter()

@router.post("/api/alerts/fraud")
async def fraud_alert(payload: dict):
    print("🚨 FRAUD ALERT:", payload)
    return {"status": "received"}