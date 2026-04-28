import os
import re
import httpx
from sqlalchemy.orm import Session
from .models import AIModel

OLLAMA_URL = os.getenv("OLLAMA_URL", "").rstrip("/")


def _model_id(name: str) -> str:
    """'llama3.1:70b-instruct' → 'llama3.1-70b-instruct'"""
    return re.sub(r"[^a-z0-9\-]", "-", name.lower().replace(":", "-")).strip("-")


def _detect_type(name: str) -> str:
    n = name.lower()
    if any(k in n for k in ["embed", "bge-", "e5-", "minilm", "nomic-embed"]):
        return "Embedding"
    if any(k in n for k in ["llava", "moondream", "bakllava", "minicpm-v", "vision", "vl"]):
        return "Multimodal"
    if any(k in n for k in ["code", "coder", "starcoder", "deepseek-coder", "wizard-coder", "codellama"]):
        return "Code"
    return "LLM"


def _detect_params(name: str, details: dict) -> str:
    ps = details.get("parameter_size", "")
    if ps:
        return ps
    m = re.search(r"(\d+\.?\d*)\s*[bB]", name)
    return f"{m.group(1)}B" if m else "?"


def _max_concurrent(size_bytes: int) -> int:
    gb = size_bytes / 1e9
    if gb > 40:
        return 2
    if gb > 15:
        return 3
    if gb > 5:
        return 6
    return 12


def sync_from_ollama(db: Session) -> dict:
    if not OLLAMA_URL:
        return {"synced": 0, "source": "ollama", "error": "OLLAMA_URL not set"}

    try:
        resp = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=8.0)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        return {"synced": 0, "source": "ollama", "error": str(e)}

    ollama_models = data.get("models", [])

    # Oznacz wszystkie Ollama-modele jako maintenance — zostaną odświeżone poniżej
    db.query(AIModel).filter(AIModel.vendor == "Ollama").update({"status": "maintenance"})

    count = 0
    for m in ollama_models:
        name    = m["name"]
        details = m.get("details", {})
        mid     = _model_id(name)

        existing = db.query(AIModel).filter(AIModel.id == mid).first()
        if existing:
            existing.name               = name
            existing.type               = _detect_type(name)
            existing.parameters         = _detect_params(name, details)
            existing.status             = "available"
            existing.vendor             = "Ollama"
            existing.max_concurrent_users = _max_concurrent(m.get("size", 0))
        else:
            db.add(AIModel(
                id                  = mid,
                name                = name,
                description         = f"Model {name} serwowany przez Ollama.",
                type                = _detect_type(name),
                parameters          = _detect_params(name, details),
                status              = "available",
                max_concurrent_users= _max_concurrent(m.get("size", 0)),
                vendor              = "Ollama",
            ))
        count += 1

    db.commit()
    return {"synced": count, "source": "ollama"}
