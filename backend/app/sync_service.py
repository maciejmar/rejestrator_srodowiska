import os
import re
import httpx
from sqlalchemy.orm import Session
from .models import AIModel

OLLAMA_URL      = os.getenv("OLLAMA_URL", "").rstrip("/")
LLM_GATEWAY_URL = os.getenv("LLM_GATEWAY_URL", "").rstrip("/")

MANAGED_VENDORS = {"Ollama", "Gateway", "vLLM"}


def _model_id(name: str) -> str:
    return re.sub(r"[^a-z0-9\-]", "-", name.lower().replace(":", "-")).strip("-")


def _strip_provider(name: str) -> str:
    """'ollama/llama3.1:70b' → 'llama3.1:70b'"""
    return name.split("/", 1)[1] if "/" in name else name


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
    if gb > 40: return 2
    if gb > 15: return 3
    if gb > 5:  return 6
    return 12


def _fetch_ollama() -> list[dict]:
    if not OLLAMA_URL:
        return []
    try:
        resp = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=8.0)
        resp.raise_for_status()
        result = []
        for m in resp.json().get("models", []):
            name    = m["name"]
            details = m.get("details", {})
            result.append({
                "id":                   _model_id(name),
                "name":                 name,
                "type":                 _detect_type(name),
                "parameters":           _detect_params(name, details),
                "max_concurrent_users": _max_concurrent(m.get("size", 0)),
                "vendor":               "Ollama",
            })
        return result
    except Exception as e:
        print(f"[sync] Ollama error: {e}")
        return []


def _fetch_gateway() -> list[dict]:
    if not LLM_GATEWAY_URL:
        return []
    try:
        resp = httpx.get(f"{LLM_GATEWAY_URL}/v1/models", timeout=8.0)
        resp.raise_for_status()
        result = []
        for m in resp.json().get("data", []):
            raw_name = m.get("id", "")
            name     = _strip_provider(raw_name)
            owned_by = m.get("owned_by", "")
            vendor   = owned_by.capitalize() if owned_by and owned_by.lower() not in ("openai", "") else "Gateway"
            result.append({
                "id":                   _model_id(name),
                "name":                 name,
                "type":                 _detect_type(name),
                "parameters":           "?",
                "max_concurrent_users": 6,
                "vendor":               vendor,
            })
        return result
    except Exception as e:
        print(f"[sync] LLM Gateway error: {e}")
        return []


def sync_from_ollama(db: Session) -> dict:
    ollama_models  = _fetch_ollama()
    gateway_models = _fetch_gateway()

    if not ollama_models and not gateway_models:
        return {"synced": 0, "ollama": 0, "gateway": 0,
                "error": "Brak odpowiedzi z Ollama i LLM Gateway"}

    # Merge: gateway jako baza, Ollama nadpisuje gdy model jest w obu
    # (Ollama ma dokładniejsze dane: rozmiar, parametry)
    merged: dict[str, dict] = {}
    for m in gateway_models:
        merged[m["id"]] = m
    for m in ollama_models:
        merged[m["id"]] = m

    # Oznacz zarządzane modele jako maintenance przed re-synciem
    db.query(AIModel).filter(AIModel.vendor.in_(MANAGED_VENDORS)).update(
        {"status": "maintenance"}, synchronize_session=False
    )

    count = 0
    for mid, data in merged.items():
        existing = db.query(AIModel).filter(AIModel.id == mid).first()
        if existing:
            existing.name                 = data["name"]
            existing.type                 = data["type"]
            existing.parameters           = data["parameters"]
            existing.status               = "available"
            existing.vendor               = data["vendor"]
            existing.max_concurrent_users = data["max_concurrent_users"]
        else:
            db.add(AIModel(
                id                   = mid,
                name                 = data["name"],
                description          = f"Model {data['name']} ({data['vendor']}).",
                type                 = data["type"],
                parameters           = data["parameters"],
                status               = "available",
                max_concurrent_users = data["max_concurrent_users"],
                vendor               = data["vendor"],
            ))
        count += 1

    db.commit()
    return {"synced": count, "ollama": len(ollama_models), "gateway": len(gateway_models)}
