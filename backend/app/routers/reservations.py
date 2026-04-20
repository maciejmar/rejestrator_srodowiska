from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, time
import uuid

from ..database import get_db
from ..models import Reservation
from ..schemas import ReservationCreate, ReservationUpdate, ReservationOut, StatsOut

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _time_str(t: Optional[time]) -> Optional[str]:
    return t.strftime("%H:%M") if t else None


def _to_out(r: Reservation) -> ReservationOut:
    return ReservationOut(
        id=r.id,
        model_id=r.model_id,
        user_email=r.user_email,
        user_name=r.user_name,
        department=r.department,
        date=r.date,
        is_full_day=r.is_full_day,
        start_time=_time_str(r.start_time),
        end_time=_time_str(r.end_time),
        purpose=r.purpose,
        status=r.status,
        created_at=r.created_at or datetime.utcnow(),
    )


@router.get("", response_model=List[ReservationOut])
def list_reservations(
    model_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to:   Optional[date] = Query(None),
    res_date:  Optional[date] = Query(None, alias="date"),
    status:    Optional[str]  = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Reservation)
    if model_id:
        q = q.filter(Reservation.model_id == model_id)
    if res_date:
        q = q.filter(Reservation.date == res_date)
    if date_from:
        q = q.filter(Reservation.date >= date_from)
    if date_to:
        q = q.filter(Reservation.date <= date_to)
    if status:
        q = q.filter(Reservation.status == status)
    else:
        q = q.filter(Reservation.status != "cancelled")
    return [_to_out(r) for r in q.order_by(Reservation.date, Reservation.start_time).all()]


@router.post("", response_model=ReservationOut, status_code=201)
def create_reservation(body: ReservationCreate, db: Session = Depends(get_db)):
    # Sprawdź konflikt
    existing = db.query(Reservation).filter(
        Reservation.model_id == body.model_id,
        Reservation.date == body.date,
        Reservation.status != "cancelled",
    ).all()

    for ex in existing:
        if ex.is_full_day or body.is_full_day:
            raise HTTPException(400, "Konflikt: wybrany dzień jest już w całości zarezerwowany")
        if body.start_time and ex.start_time:
            req_start = time.fromisoformat(body.start_time)
            if ex.start_time == req_start:
                raise HTTPException(400, f"Konflikt: godzina {body.start_time} jest już zajęta")

    start = time.fromisoformat(body.start_time) if body.start_time else None
    end   = time.fromisoformat(body.end_time)   if body.end_time   else None

    r = Reservation(
        id=str(uuid.uuid4()),
        model_id=body.model_id,
        user_email=body.user_email,
        user_name=body.user_name,
        department=body.department,
        date=body.date,
        is_full_day=body.is_full_day,
        start_time=start,
        end_time=end,
        purpose=body.purpose,
        status="confirmed",
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return _to_out(r)


@router.patch("/{reservation_id}", response_model=ReservationOut)
def update_reservation(
    reservation_id: str,
    body: ReservationUpdate,
    db: Session = Depends(get_db),
):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")

    if body.date is not None:
        r.date = body.date
    if body.is_full_day is not None:
        r.is_full_day = body.is_full_day
    if body.start_time is not None:
        r.start_time = time.fromisoformat(body.start_time) if body.start_time else None
    if body.end_time is not None:
        r.end_time = time.fromisoformat(body.end_time) if body.end_time else None
    if body.status is not None:
        r.status = body.status

    db.commit()
    db.refresh(r)
    return _to_out(r)


@router.delete("/{reservation_id}", status_code=204)
def cancel_reservation(reservation_id: str, db: Session = Depends(get_db)):
    r = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not r:
        raise HTTPException(404, "Reservation not found")
    r.status = "cancelled"
    db.commit()


@router.get("/stats/summary", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    active = db.query(Reservation).filter(Reservation.status != "cancelled")

    by_model: dict[str, int] = {}
    for r in active.all():
        by_model[r.model_id] = by_model.get(r.model_id, 0) + 1

    return StatsOut(
        total=active.count(),
        confirmed=active.filter(Reservation.status == "confirmed").count(),
        today=active.filter(Reservation.date == today).count(),
        by_model=by_model,
    )
