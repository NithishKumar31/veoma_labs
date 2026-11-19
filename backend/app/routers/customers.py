from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Customer, Order, User
from ..schemas import CustomerCreate, CustomerUpdate, CustomerResponse
from ..auth import get_current_user, log_audit

router = APIRouter(prefix="/api/customers", tags=["Customers"])

def generate_customer_code(db: Session) -> str:
    count = db.query(Customer).count()
    return f"CUST-{count + 1:04d}"

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Customer.name.ilike(search_filter)) |
            (Customer.phone.ilike(search_filter)) |
            (Customer.email.ilike(search_filter)) |
            (Customer.customer_code.ilike(search_filter))
        )
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type)
    return query.order_by(Customer.created_at.desc()).all()

@router.post("", response_model=CustomerResponse)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check duplicate phone
    existing = db.query(Customer).filter(Customer.phone == customer_in.phone.strip()).first()
    if existing:
        return existing

    code = generate_customer_code(db)
    customer = Customer(
        customer_code=code,
        name=customer_in.name.strip(),
        phone=customer_in.phone.strip(),
        email=customer_in.email.strip() if customer_in.email else None,
        address=customer_in.address,
        gstin=customer_in.gstin,
        customer_type=customer_in.customer_type,
        notes=customer_in.notes
    )
    db.add(customer)
    db.flush()

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="CUSTOMERS",
        record_id=customer.id,
        new_value={"code": customer.customer_code, "name": customer.name},
        remarks=f"Added customer {customer.name}"
    )
    db.commit()
    db.refresh(customer)
    return customer

@router.get("/{customer_id}")
def get_customer_details(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    orders = db.query(Order).filter(Order.customer_id == customer.id).order_by(Order.order_date.desc()).all()
    total_orders = len(orders)
    total_order_value = sum((o.agreed_selling_price for o in orders), Decimal("0.00"))
    total_payments = sum((o.total_paid for o in orders), Decimal("0.00"))
    outstanding_balance = sum((o.remaining_balance for o in orders), Decimal("0.00"))

    order_history = [{
        "id": o.id,
        "order_id": o.order_id,
        "model_name": o.model_name,
        "order_date": o.order_date,
        "order_status": o.order_status,
        "agreed_selling_price": o.agreed_selling_price,
        "total_paid": o.total_paid,
        "remaining_balance": o.remaining_balance,
        "payment_status": o.payment_status
    } for o in orders]

    return {
        "customer": CustomerResponse.from_orm(customer),
        "total_orders": total_orders,
        "total_order_value": total_order_value,
        "total_payments": total_payments,
        "outstanding_balance": outstanding_balance,
        "last_order_date": orders[0].order_date if orders else None,
        "orders": order_history
    }

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: str,
    customer_up: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    prev = {"name": customer.name, "phone": customer.phone, "address": customer.address}

    if customer_up.name is not None:
        customer.name = customer_up.name
    if customer_up.phone is not None:
        customer.phone = customer_up.phone
    if customer_up.email is not None:
        customer.email = customer_up.email
    if customer_up.address is not None:
        customer.address = customer_up.address
    if customer_up.gstin is not None:
        customer.gstin = customer_up.gstin
    if customer_up.customer_type is not None:
        customer.customer_type = customer_up.customer_type
    if customer_up.notes is not None:
        customer.notes = customer_up.notes

    log_audit(
        db=db,
        user=current_user,
        action="UPDATE",
        module="CUSTOMERS",
        record_id=customer.id,
        previous_value=prev,
        new_value={"name": customer.name, "phone": customer.phone},
        remarks=f"Updated customer {customer.name}"
    )
    db.commit()
    db.refresh(customer)
    return customer
