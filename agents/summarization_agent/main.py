from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import check_ollama_health

app = FastAPI(
    title="Summarization Agent",
    description="Generates human-readable summaries of HR contracts using Ollama AI",
    version="1.0.0"
)

class SummarizationRequest(BaseModel):
    text: str             # the full extracted text
    contract_id: str      # MongoDB ID of the contract
    document_type: str    # type of document
    extracted_info: dict  # the key fields already extracted


@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent": "summarization_agent",
        "status": "running",
        "port": 8004,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve"
    })


@app.post("/process")
async def process(request: SummarizationRequest):
    """
    Receives all contract data and generates a clean summary.
    Full implementation later.
    """
    return JSONResponse(content={
        "success": True,
        "agent": "summarization_agent",
        "message": "Summarization agent is ready. Full implementation later.",
        "contract_id": request.contract_id
    })


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)