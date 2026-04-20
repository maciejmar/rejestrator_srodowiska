from sqlalchemy import (
    Column, String, Boolean, Date, Time,
    DateTime, Integer, Text, ForeignKey
)
from sqlalchemy.sql import func
from .database import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id                  = Column(String(50),  primary_key=True)
    name                = Column(String(100), nullable=False)
    description         = Column(Text)
    type                = Column(String(20))           # LLM | Code | Embedding | Multimodal | Image
    parameters          = Column(String(20))
    status              = Column(String(20),  default="available")  # available | busy | maintenance
    max_concurrent_users= Column(Integer,     default=4)
    context_window      = Column(String(20))
    vendor              = Column(String(50))


class Reservation(Base):
    __tablename__ = "reservations"

    id          = Column(String(50),  primary_key=True)   # UUID generowany przez API
    model_id    = Column(String(50),  ForeignKey("ai_models.id"), nullable=False, index=True)
    user_email  = Column(String(255), nullable=False)
    user_name   = Column(String(200), nullable=False)
    department  = Column(String(200), nullable=False)
    date        = Column(Date,        nullable=False, index=True)
    is_full_day = Column(Boolean,     nullable=False, default=False)
    start_time  = Column(Time,        nullable=True)
    end_time    = Column(Time,        nullable=True)
    purpose     = Column(Text,        nullable=False)
    status      = Column(String(20),  default="confirmed")  # confirmed | pending | cancelled
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
