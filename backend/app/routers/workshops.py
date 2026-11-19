from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Workshop, WorkshopParticipant, WorkshopExpense, User
from ..schemas import (
    WorkshopCreate, WorkshopResponse, WorkshopParticipantCreate, WorkshopParticipantResponse,
    WorkshopExpenseCreate, WorkshopExpenseResponse
)
from ..auth import get_current_user, check_permission, log_audit, require_super_admin
from ..services.calculation import round_money

router = APIRouter(prefix="/api/workshops", tags=["Workshops"])

def generate_workshop_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(Workshop).filter(Workshop.workshop_code.like(f"WS-{year}-%")).count()
    return f"WS-{year}-{count + 1:04d}"

@router.get("", response_model=List[WorkshopResponse])
def list_workshops(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Workshop)
    if category:
        query = query.filter(Workshop.category == category)
    if status:
        query = query.filter(Workshop.status == status)
    return query.order_by(Workshop.start_date.desc()).all()

@router.get("/{workshop_id}", response_model=WorkshopResponse)
def get_workshop(
    workshop_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ws = db.query(Workshop).filter((Workshop.id == workshop_id) | (Workshop.workshop_code == workshop_id)).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found")
    return ws

@router.post("", response_model=WorkshopResponse)
def create_workshop(
    ws_in: WorkshopCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("can_manage_workshops"))
):
    code = generate_workshop_code(db)
    ws = Workshop(
        workshop_code=code,
        name=ws_in.name.strip(),
        category=ws_in.category,
        start_date=ws_in.start_date,
        end_date=ws_in.end_date,
        location=ws_in.location.strip(),
        trainer_name=ws_in.trainer_name.strip(),
        registration_fee=ws_in.registration_fee,
        target_participants=ws_in.target_participants,
        total_participants=0,
        total_revenue=Decimal("0.00"),
        total_collected=Decimal("0.00"),
        pending_amount=Decimal("0.00"),
        total_expenses=Decimal("0.00"),
        net_profit=Decimal("0.00"),
        status="UPCOMING",
        notes=ws_in.notes
    )
    db.add(ws)
    db.flush()

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="WORKSHOPS",
        record_id=ws.id,
        new_value={"code": ws.workshop_code, "name": ws.name},
        remarks=f"Created workshop {ws.name}"
    )
    db.commit()
    db.refresh(ws)
    return ws

@router.post("/{workshop_id}/participants", response_model=WorkshopParticipantResponse)
def add_participant(
    workshop_id: str,
    part_in: WorkshopParticipantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("can_manage_workshops"))
):
    ws = db.query(Workshop).filter((Workshop.id == workshop_id) | (Workshop.workshop_code == workshop_id)).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found")

    balance = part_in.fee_agreed - part_in.amount_paid
    pay_status = "PAID" if part_in.amount_paid >= part_in.fee_agreed else ("PARTIAL" if part_in.amount_paid > 0 else "UNPAID")

    part = WorkshopParticipant(
        workshop_id=ws.id,
        participant_name=part_in.participant_name.strip(),
        phone=part_in.phone.strip(),
        email=part_in.email.strip() if part_in.email else None,
        fee_agreed=part_in.fee_agreed,
        amount_paid=part_in.amount_paid,
        balance=balance,
        payment_status=pay_status,
        notes=part_in.notes
    )
    db.add(part)
    db.flush()

    # Recalculate workshop metrics
    participants = db.query(WorkshopParticipant).filter(WorkshopParticipant.workshop_id == ws.id).all()
    ws.total_participants = len(participants)
    ws.total_revenue = sum((p.fee_agreed for p in participants), Decimal("0.00"))
    ws.total_collected = sum((p.amount_paid for p in participants), Decimal("0.00"))
    ws.pending_amount = ws.total_revenue - ws.total_collected
    ws.net_profit = ws.total_revenue - ws.total_expenses

    db.commit()
    db.refresh(part)
    return part

@router.post("/{workshop_id}/expenses", response_model=WorkshopExpenseResponse)
def add_workshop_expense(
    workshop_id: str,
    exp_in: WorkshopExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("can_manage_workshops"))
):
    ws = db.query(Workshop).filter((Workshop.id == workshop_id) | (Workshop.workshop_code == workshop_id)).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workshop not found")

    w_exp = WorkshopExpense(
        workshop_id=ws.id,
        expense_date=exp_in.expense_date or datetime.utcnow(),
        category=exp_in.category,
        description=exp_in.description.strip(),
        amount=exp_in.amount,
        payment_method=exp_in.payment_method,
        paid_to=exp_in.paid_to,
        notes=exp_in.notes
    )
    db.add(w_exp)
    db.flush()

    # Recalculate workshop expenses & profit
    expenses = db.query(WorkshopExpense).filter(WorkshopExpense.workshop_id == ws.id).all()
    ws.total_expenses = sum((e.amount for e in expenses), Decimal("0.00"))
    ws.net_profit = ws.total_revenue - ws.total_expenses

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="WORKSHOPS",
        record_id=w_exp.id,
        new_value={"workshop": ws.name, "amount": str(w_exp.amount), "category": w_exp.category},
        remarks=f"Recorded workshop expense of ₹{w_exp.amount} for {ws.name}"
    )
    db.commit()
    db.refresh(w_exp)
    return w_exp
