import os
import uuid
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import DailyExpense, ExpenseCategory, Order, Workshop, User
from ..schemas import DailyExpenseCreate, DailyExpenseResponse
from ..auth import get_current_user, log_audit, require_super_admin
from ..config import UPLOAD_DIR
from ..services.calculation import round_money

router = APIRouter(prefix="/api/expenses", tags=["Daily Expenses"])

def generate_expense_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(DailyExpense).filter(DailyExpense.expense_code.like(f"EXP-{year}-%")).count()
    return f"EXP-{year}-{count + 1:04d}"

@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    return db.query(ExpenseCategory).filter(ExpenseCategory.is_active == True).all()

@router.post("/categories")
def add_category(
    data: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    existing = db.query(ExpenseCategory).filter(ExpenseCategory.name.ilike(name)).first()
    if existing:
        return existing
    cat = ExpenseCategory(name=name, is_default=False, is_active=True)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("", response_model=List[DailyExpenseResponse])
def list_expenses(
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    include_archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(DailyExpense)
    if not include_archived:
        query = query.filter(DailyExpense.is_archived == False)
    if category:
        query = query.filter(DailyExpense.category == category)
    if start_date:
        query = query.filter(DailyExpense.expense_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(DailyExpense.expense_date <= datetime.fromisoformat(end_date))

    return query.order_by(DailyExpense.expense_date.desc()).all()

@router.post("", response_model=DailyExpenseResponse)
@router.post("/quick", response_model=DailyExpenseResponse)
def create_daily_expense(
    exp_in: DailyExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if exp_in.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Expense amount must be greater than zero")

    code = generate_expense_code(db)
    exp = DailyExpense(
        expense_code=code,
        expense_date=exp_in.expense_date or datetime.utcnow(),
        category=exp_in.category.strip(),
        description=exp_in.description.strip(),
        amount=exp_in.amount,
        payment_method=exp_in.payment_method,
        paid_by=exp_in.paid_by,
        receipt_url=exp_in.receipt_url,
        notes=exp_in.notes,
        is_archived=False,
        created_by=current_user.id
    )
    db.add(exp)
    db.flush()

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="EXPENSES",
        record_id=exp.id,
        new_value={"code": exp.expense_code, "category": exp.category, "amount": str(exp.amount)},
        remarks=f"Recorded expense of ₹{exp.amount} for {exp.category}"
    )
    db.commit()
    db.refresh(exp)
    return exp

@router.post("/upload-receipt")
def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"receipt_{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        f.write(file.file.read())
    return {"url": f"/uploads/{filename}", "filename": filename}

@router.get("/daily-summary")
def get_daily_summary(
    date: str, # Format: YYYY-MM-DD
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_date = datetime.strptime(date, "%Y-%m-%d").date()
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())

    # Daily expenses
    expenses = db.query(DailyExpense).filter(
        DailyExpense.is_archived == False,
        DailyExpense.expense_date >= start_dt,
        DailyExpense.expense_date <= end_dt
    ).all()
    total_expenses = sum((e.amount for e in expenses), Decimal("0.00"))

    # Expense breakdown by category
    cat_breakdown = {}
    for e in expenses:
        cat_breakdown[e.category] = cat_breakdown.get(e.category, Decimal("0.00")) + e.amount

    # Orders created on this date
    orders = db.query(Order).filter(
        Order.order_date >= start_dt,
        Order.order_date <= end_dt
    ).all()
    total_order_revenue = sum((o.agreed_selling_price for o in orders), Decimal("0.00"))
    total_order_direct_costs = sum((o.total_direct_cost for o in orders), Decimal("0.00"))
    order_contribution = total_order_revenue - total_order_direct_costs

    # Payments received on this date
    from ..models import OrderPayment
    payments = db.query(OrderPayment).filter(
        OrderPayment.payment_date >= start_dt,
        OrderPayment.payment_date <= end_dt
    ).all()
    total_payments_collected = sum((p.amount for p in payments), Decimal("0.00"))

    # Workshop revenue & expenses on this date
    from ..models import WorkshopExpense, WorkshopParticipant
    ws_expenses = db.query(WorkshopExpense).filter(
        WorkshopExpense.expense_date >= start_dt,
        WorkshopExpense.expense_date <= end_dt
    ).all()
    total_ws_expenses = sum((w.amount for w in ws_expenses), Decimal("0.00"))

    ws_participants = db.query(WorkshopParticipant).filter(
        WorkshopParticipant.created_at >= start_dt,
        WorkshopParticipant.created_at <= end_dt
    ).all()
    total_ws_revenue = sum((w.fee_agreed for w in ws_participants), Decimal("0.00"))
    ws_contribution = total_ws_revenue - total_ws_expenses

    # Net day result
    net_day_result = order_contribution + ws_contribution - total_expenses

    return {
        "date": date,
        "total_expenses": total_expenses,
        "category_breakdown": {k: float(v) for k, v in cat_breakdown.items()},
        "total_order_revenue": total_order_revenue,
        "total_order_direct_costs": total_order_direct_costs,
        "total_payments_collected": total_payments_collected,
        "workshop_revenue": total_ws_revenue,
        "workshop_expenses": total_ws_expenses,
        "order_contribution": order_contribution,
        "workshop_contribution": ws_contribution,
        "net_day_result": net_day_result,
        "expenses": [DailyExpenseResponse.from_orm(e) for e in expenses]
    }

@router.delete("/{expense_id}")
def archive_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    exp = db.query(DailyExpense).filter(DailyExpense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    exp.is_archived = True
    log_audit(
        db=db,
        user=admin,
        action="DELETE",
        module="EXPENSES",
        record_id=exp.id,
        remarks=f"Archived expense {exp.expense_code}"
    )
    db.commit()
    return {"message": "Expense archived"}
