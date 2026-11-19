from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Employee, SalaryRecord, RentRecord, RecurringExpense, User, CompanySetting
from ..schemas import (
    EmployeeCreate, EmployeeResponse, SalaryRecordCreate, SalaryRecordResponse,
    RentRecordCreate, RentRecordResponse, RecurringExpenseCreate, RecurringExpenseResponse
)
from ..auth import get_current_user, require_super_admin, check_permission, log_audit
from ..services.calculation import round_money

router = APIRouter(prefix="/api/finance", tags=["Salaries, Rent & Recurring Expenses"])

# ----------------- Employees -----------------
@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    return db.query(Employee).order_by(Employee.created_at.desc()).all()

@router.post("/employees", response_model=EmployeeResponse)
def add_employee(
    emp_in: EmployeeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    if db.query(Employee).filter(Employee.employee_id == emp_in.employee_id.strip()).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    emp = Employee(
        employee_id=emp_in.employee_id.strip(),
        full_name=emp_in.full_name.strip(),
        designation=emp_in.designation.strip(),
        phone=emp_in.phone.strip(),
        email=emp_in.email.strip() if emp_in.email else None,
        base_salary=emp_in.base_salary,
        joining_date=emp_in.joining_date or datetime.utcnow(),
        is_active=True
    )
    db.add(emp)
    db.flush()

    log_audit(
        db=db,
        user=admin,
        action="CREATE",
        module="SALARIES",
        record_id=emp.id,
        new_value={"name": emp.full_name, "emp_id": emp.employee_id, "salary": str(emp.base_salary)},
        remarks=f"Added employee {emp.full_name}"
    )
    db.commit()
    db.refresh(emp)
    return emp

# ----------------- Month-wise Salaries -----------------
@router.get("/salaries", response_model=List[SalaryRecordResponse])
def list_salaries(
    month: Optional[str] = None, # Format: YYYY-MM
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    query = db.query(SalaryRecord).join(Employee)
    if month:
        query = query.filter(SalaryRecord.salary_month == month)
    if employee_id:
        query = query.filter(SalaryRecord.employee_id == employee_id)

    records = query.order_by(SalaryRecord.salary_month.desc()).all()
    results = []
    for r in records:
        resp = SalaryRecordResponse.from_orm(r)
        resp.employee_name = r.employee.full_name if r.employee else None
        results.append(resp)
    return results

@router.post("/salaries", response_model=SalaryRecordResponse)
def record_salary_entry(
    sal_in: SalaryRecordCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    emp = db.query(Employee).filter(Employee.id == sal_in.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check duplicate salary record for same employee and month
    existing = db.query(SalaryRecord).filter(
        SalaryRecord.employee_id == emp.id,
        SalaryRecord.salary_month == sal_in.salary_month
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Salary record already exists for {emp.full_name} for {sal_in.salary_month}")

    total_payable = round_money(sal_in.base_salary + sal_in.additional_payments - sal_in.deductions)
    amount_paid = round_money(sal_in.amount_paid)
    balance = total_payable - amount_paid

    status = "PAID" if amount_paid >= total_payable else ("PARTIAL" if amount_paid > Decimal("0.00") else "UNPAID")

    record = SalaryRecord(
        employee_id=emp.id,
        salary_month=sal_in.salary_month,
        base_salary=sal_in.base_salary,
        additional_payments=sal_in.additional_payments,
        deductions=sal_in.deductions,
        total_payable=total_payable,
        amount_paid=amount_paid,
        remaining_balance=balance,
        payment_status=status,
        payment_date=sal_in.payment_date if amount_paid > 0 else None,
        payment_method=sal_in.payment_method,
        notes=sal_in.notes,
        recorded_by=admin.id
    )
    db.add(record)
    db.flush()

    log_audit(
        db=db,
        user=admin,
        action="CREATE",
        module="SALARIES",
        record_id=record.id,
        new_value={"emp": emp.full_name, "month": record.salary_month, "paid": str(record.amount_paid)},
        remarks=f"Recorded salary of ₹{record.amount_paid} for {emp.full_name} ({record.salary_month})"
    )
    db.commit()
    db.refresh(record)

    resp = SalaryRecordResponse.from_orm(record)
    resp.employee_name = emp.full_name
    return resp

# ----------------- Fixed Monthly Rent -----------------
@router.get("/rent", response_model=List[RentRecordResponse])
def list_rent_records(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    return db.query(RentRecord).order_by(RentRecord.rent_month.desc()).all()

@router.post("/rent", response_model=RentRecordResponse)
def record_rent_payment(
    rent_in: RentRecordCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    # Enforce strictly: Avoid creating duplicate rent records for the same month!
    existing = db.query(RentRecord).filter(RentRecord.rent_month == rent_in.rent_month.strip()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Rent for month {rent_in.rent_month} has already been recorded (Amount: ₹{existing.amount}). Duplicate rent entries are prohibited."
        )

    rent = RentRecord(
        rent_month=rent_in.rent_month.strip(),
        amount=rent_in.amount,
        payment_date=rent_in.payment_date or datetime.utcnow(),
        payment_method=rent_in.payment_method,
        paid_to=rent_in.paid_to,
        notes=rent_in.notes,
        recorded_by=admin.id
    )
    db.add(rent)
    db.flush()

    log_audit(
        db=db,
        user=admin,
        action="CREATE",
        module="RENT",
        record_id=rent.id,
        new_value={"month": rent.rent_month, "amount": str(rent.amount)},
        remarks=f"Recorded monthly rent of ₹{rent.amount} for {rent.rent_month}"
    )
    db.commit()
    db.refresh(rent)
    return rent

# ----------------- Recurring Expenses -----------------
@router.get("/recurring", response_model=List[RecurringExpenseResponse])
def list_recurring_expenses(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    return db.query(RecurringExpense).all()

@router.post("/recurring", response_model=RecurringExpenseResponse)
def add_recurring_expense(
    rec_in: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    rec = RecurringExpense(
        name=rec_in.name.strip(),
        category=rec_in.category.strip(),
        monthly_amount=rec_in.monthly_amount,
        default_day_of_month=rec_in.default_day_of_month,
        is_active=True,
        notes=rec_in.notes
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
