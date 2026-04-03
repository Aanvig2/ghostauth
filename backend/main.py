import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import stream, enroll, fraud

app = FastAPI(title="GhostAuth Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stream.router)
app.include_router(enroll.router)
app.include_router(fraud.router)

@app.get("/")
def root():
    return {"status": "GhostAuth backend running"}
