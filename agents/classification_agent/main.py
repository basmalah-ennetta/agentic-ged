from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel  # fdefining request body structure
import uvicorn
import sys
import os

# Add the parent directory to Python's path so we can import from shared/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import check_ollama_health

app = FastAPI(
    title="Classification Agent",
    description="Classifies HR documents into categories using Ollama AI",
    version="1.0.0"
)

# ── REQUEST BODY MODEL ─────────────────────────────────────────────────────
class ClassificationRequest(BaseModel):
    text: str          # the extracted text
    contract_id: str   # MongoDB ID of the contract (for reference)


# ── HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent": "classification_agent",
        "status": "running",
        "port": 8002,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve"
    })


# ── PROCESS ENDPOINT ───────────────────────────────────────────────────────
@app.post("/process")
async def process(request: ClassificationRequest):
    """
    Receives extracted text and classifies what type of HR document it is.
    Full implementation later.
    """
    return JSONResponse(content={
        "success": True,
        "agent": "classification_agent",
        "message": "Classification agent is ready. Full implementation later.",
        "contract_id": request.contract_id
    })


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)