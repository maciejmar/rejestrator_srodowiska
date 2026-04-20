from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import AIModel
from ..schemas import AIModelOut, AIModelStatusUpdate

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=List[AIModelOut])
def list_models(db: Session = Depends(get_db)):
    return db.query(AIModel).order_by(AIModel.name).all()


@router.get("/{model_id}", response_model=AIModelOut)
def get_model(model_id: str, db: Session = Depends(get_db)):
    m = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    return m


@router.patch("/{model_id}/status", response_model=AIModelOut)
def update_status(model_id: str, body: AIModelStatusUpdate, db: Session = Depends(get_db)):
    m = db.query(AIModel).filter(AIModel.id == model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    if body.status not in ("available", "busy", "maintenance"):
        raise HTTPException(status_code=400, detail="Invalid status")
    m.status = body.status
    db.commit()
    db.refresh(m)
    return m
