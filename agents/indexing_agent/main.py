from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os
import json
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import ask_ollama, check_ollama_health

app = FastAPI(
    title="Indexing Agent",
    description="Extracts keywords, entities and tags from document text",
    version="1.0.0"
)


class IndexRequest(BaseModel):
    text:           str
    document_id:    str
    document_type:  str
    extracted_fields: dict = {}
    file_name:      str = ""


def extract_index_data(text: str, document_type: str, extracted_fields: dict) -> dict:
    """
    Uses Ollama to extract keywords, named entities, and tags.
    Falls back to regex-based extraction if LLM fails.
    """

    system_prompt = """You are a document indexing specialist.
Your job is to analyze document text and extract structured index data.
You must respond with ONLY a valid JSON object, no extra text.

Required format:
{
  "keywords": ["list", "of", "5-15", "important", "keywords"],
  "entities": {
    "people": ["full names of people mentioned"],
    "organizations": ["company and organization names"],
    "dates": ["dates in any format found in document"],
    "amounts": ["monetary amounts and salaries"],
    "locations": ["cities, countries, addresses"]
  },
  "tags": ["category-tags", "for-filtering"]
}

Rules:
- keywords: most important terms that describe document content
- entities: only extract what is explicitly present in the text
- tags: 3-8 short lowercase tags useful for filtering
- all values must be arrays of strings
- if nothing found for a category, use empty array []"""

    user_prompt = f"""Extract index data from this {document_type} document.

Document text (first 2000 characters):
{text[:2000]}

Additional extracted fields already known:
{json.dumps(extracted_fields, indent=2)}

Return ONLY the JSON index object."""

    try:
        raw = ask_ollama(user_prompt, system_prompt)
        print(f"[Indexing Agent] Raw response: {raw[:200]}...")

        # Clean markdown wrapping if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            parts = cleaned.split("```")
            cleaned = parts[1] if len(parts) > 1 else cleaned
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]

        result = json.loads(cleaned.strip())

        # Validate and normalize structure
        keywords = result.get("keywords", [])
        entities = result.get("entities", {})
        tags     = result.get("tags", [])

        # Ensure all entity fields exist
        normalized_entities = {
            "people":        entities.get("people",        []),
            "organizations": entities.get("organizations", []),
            "dates":         entities.get("dates",         []),
            "amounts":       entities.get("amounts",       []),
            "locations":     entities.get("locations",     []),
        }

        # Add document_type as a tag automatically
        if document_type and document_type not in tags:
            tags.append(document_type.replace("_", "-"))

        return {
            "keywords": [str(k) for k in keywords if k],
            "entities": normalized_entities,
            "tags":     [str(t).lower() for t in tags if t],
        }

    except (json.JSONDecodeError, Exception) as e:
        print(f"[Indexing Agent] LLM parse failed: {e}, using regex fallback")
        return _regex_fallback(text, document_type, extracted_fields)


def _regex_fallback(text: str, document_type: str, extracted_fields: dict) -> dict:
    """
    Regex-based fallback when LLM fails.
    Extracts entities using pattern matching.
    """
    # Extract dates
    date_pattern = r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+ \d{1,2},?\s*\d{4}|' \
                   r'\d{4}-\d{2}-\d{2})\b'
    dates = list(set(re.findall(date_pattern, text)))[:10]

    # Extract monetary amounts
    amount_pattern = r'(?:[\$€£¥][\d,]+(?:\.\d{2})?|[\d,]+(?:\.\d{2})?\s*(?:TND|USD|EUR|GBP))'
    amounts = list(set(re.findall(amount_pattern, text)))[:10]

    # Use extracted fields as entities
    people = []
    orgs   = []
    if extracted_fields.get("employeeName"):
        people.append(extracted_fields["employeeName"])
    if extracted_fields.get("companyName"):
        orgs.append(extracted_fields["companyName"])

    # Build basic keywords from extracted fields
    keywords = []
    for v in extracted_fields.values():
        if isinstance(v, str) and len(v) > 2 and len(v) < 50:
            keywords.append(v)

    # Add document type words as keywords
    keywords.extend(document_type.replace("_", " ").split())

    tags = [document_type.replace("_", "-"), "auto-indexed", "fallback"]

    return {
        "keywords": list(set(keywords))[:15],
        "entities": {
            "people":        people,
            "organizations": orgs,
            "dates":         dates,
            "amounts":       amounts,
            "locations":     [],
        },
        "tags": tags,
    }


@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent":  "indexing_agent",
        "status": "running",
        "port":   8005,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve",
        "ready":  ollama_ok,
    })


@app.post("/process")
async def process(request: IndexRequest):
    print(f"\n[Indexing Agent] Indexing: {request.file_name} ({request.document_type})")

    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Text too short to index")

    try:
        result = extract_index_data(
            request.text,
            request.document_type,
            request.extracted_fields,
        )

        print(f"[Indexing Agent] Keywords: {result['keywords'][:5]}...")
        print(f"[Indexing Agent] Tags: {result['tags']}")

        return JSONResponse(content={
            "success":  True,
            "agent":    "indexing_agent",
            "document_id": request.document_id,
            "keywords": result["keywords"],
            "entities": result["entities"],
            "tags":     result["tags"],
        })

    except Exception as e:
        print(f"[Indexing Agent] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Indexing failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)