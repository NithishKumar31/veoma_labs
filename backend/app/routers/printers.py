from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Printer, OrderProductionItem, Order, User
from ..schemas import PrinterCreate, PrinterUpdate, PrinterResponse
from ..auth import get_current_user, log_audit, require_super_admin

router = APIRouter(prefix="/api/printers", tags=["Printers"])

@router.get("")
def list_printers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    printers = db.query(Printer).all()
    results = []

    for p in printers:
        # Calculate stats for this printer
        items = db.query(OrderProductionItem).join(Order).filter(
            OrderProductionItem.printer_id == p.id
        ).all()

        completed_orders = set()
        total_grams = Decimal("0.00")
        total_prod_revenue = Decimal("0.00")

        for item in items:
            grams = item.actual_consumed_grams if item.actual_consumed_grams is not None else item.total_estimated_grams
            total_grams += grams
            total_prod_revenue += (item.production_cost + item.post_processing_cost)
            if item.order and item.order.order_status in ["COMPLETED", "SHIPPED", "DELIVERED"]:
                completed_orders.add(item.order_id)

        results.append({
            "id": p.id,
            "name": p.name,
            "model": p.model,
            "technology": p.technology,
            "purchase_date": p.purchase_date,
            "purchase_cost": p.purchase_cost,
            "status": p.status,
            "notes": p.notes,
            "created_at": p.created_at,
            "completed_orders_count": len(completed_orders),
            "total_grams_consumed": total_grams,
            "total_production_value": total_prod_revenue
        })

    return results

@router.post("", response_model=PrinterResponse)
def add_printer(
    printer_in: PrinterCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    printer = Printer(
        name=printer_in.name.strip(),
        model=printer_in.model.strip(),
        technology=printer_in.technology.upper().strip(),
        purchase_date=printer_in.purchase_date,
        purchase_cost=printer_in.purchase_cost,
        status=printer_in.status,
        notes=printer_in.notes
    )
    db.add(printer)
    db.flush()

    log_audit(
        db=db,
        user=admin,
        action="CREATE",
        module="PRINTERS",
        record_id=printer.id,
        new_value={"name": printer.name, "model": printer.model},
        remarks=f"Added printer {printer.name}"
    )
    db.commit()
    db.refresh(printer)
    return printer

@router.put("/{printer_id}", response_model=PrinterResponse)
def update_printer(
    printer_id: str,
    printer_up: PrinterUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    printer = db.query(Printer).filter(Printer.id == printer_id).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")

    prev = {"name": printer.name, "status": printer.status}
    if printer_up.name is not None:
        printer.name = printer_up.name
    if printer_up.model is not None:
        printer.model = printer_up.model
    if printer_up.technology is not None:
        printer.technology = printer_up.technology
    if printer_up.purchase_date is not None:
        printer.purchase_date = printer_up.purchase_date
    if printer_up.purchase_cost is not None:
        printer.purchase_cost = printer_up.purchase_cost
    if printer_up.status is not None:
        printer.status = printer_up.status
    if printer_up.notes is not None:
        printer.notes = printer_up.notes

    log_audit(
        db=db,
        user=admin,
        action="UPDATE",
        module="PRINTERS",
        record_id=printer.id,
        previous_value=prev,
        new_value={"name": printer.name, "status": printer.status},
        remarks=f"Updated printer {printer.name}"
    )
    db.commit()
    db.refresh(printer)
    return printer
