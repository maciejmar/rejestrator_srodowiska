from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class AIModelOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str
    parameters: str
    status: str
    max_concurrent_users: int
    context_window: Optional[str] = None
    vendor: Optional[str] = None

    model_config = {"from_attributes": True}


class AIModelStatusUpdate(BaseModel):
    status: str  # available | busy | maintenance


class ReservationCreate(BaseModel):
    model_id:   str
    user_email: str
    user_name:  str
    department: str
    date:       date
    is_full_day: bool
    start_time: Optional[str] = None   # "HH:MM"
    end_time:   Optional[str] = None   # "HH:MM"
    purpose:    str


class ReservationUpdate(BaseModel):
    date:       Optional[date] = None
    is_full_day: Optional[bool] = None
    start_time: Optional[str] = None
    end_time:   Optional[str] = None
    status:     Optional[str] = None   # confirmed | pending | cancelled


class ReservationOut(BaseModel):
    id:          str
    model_id:    str
    user_email:  str
    user_name:   str
    department:  str
    date:        date
    is_full_day: bool
    start_time:  Optional[str] = None
    end_time:    Optional[str] = None
    purpose:     str
    status:      str
    created_at:  datetime

    model_config = {"from_attributes": True}


class StatsOut(BaseModel):
    total:     int
    confirmed: int
    today:     int
    by_model:  dict[str, int]
