def get_trust_level(score):
    if score >= 86:
        return {"level": "TRUSTED", "action": "proceed"}
    if score >= 71:
        return {"level": "WATCH", "action": "silent_reauth"}
    if score >= 51:
        return {"level": "SUSPECT", "action": "otp"}
    return {"level": "THREAT", "action": "camouflage"}