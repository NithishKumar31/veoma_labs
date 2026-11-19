from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Order, Customer, User
from ..auth import get_current_user, require_super_admin
from ..services.calculation import round_money

router = APIRouter(prefix="/api/gst", tags=["GST Management"])

@router.get("/sales-register")
def get_gst_sales_register(
    month: Optional[str] = None, # Format: YYYY-MM
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    query = db.query(Order).join(Customer).filter(Order.gst_applicable == True)

    if month:
        # e.g. 2026-11
        parts = month.split("-")
        y, m = int(parts[0]), int(parts[1])
        start_dt = datetime(y, m, 1)
        end_dt = datetime(y, m + 1, 1) if m < 12 else datetime(y + 1, 1, 1)
        query = query.filter(Order.order_date >= start_dt, Order.order_date < end_dt)
    if start_date:
        query = query.filter(Order.order_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Order.order_date <= datetime.fromisoformat(end_date))

    gst_orders = query.order_by(Order.order_date.desc()).all()

    total_taxable_value = Decimal("0.00")
    total_cgst = Decimal("0.00")
    total_sgst = Decimal("0.00")
    total_igst = Decimal("0.00")
    total_gst_collected = Decimal("0.00")
    total_invoice_value = Decimal("0.00")

    invoices = []
    for o in gst_orders:
        taxable = o.taxable_value
        cgst = o.cgst_amount
        sgst = o.sgst_amount
        igst = o.igst_amount
        tax_total = cgst + sgst + igst
        inv_total = o.total_invoice_amount

        total_taxable_value += taxable
        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst
        total_gst_collected += tax_total
        total_invoice_value += inv_total

        is_intra = (o.place_of_supply.strip().lower() == "tamil nadu" or "tamil" in o.place_of_supply.lower() or o.place_of_supply == "33")

        invoices.append({
            "order_id": o.order_id,
            "invoice_number": o.invoice_number or f"INV-{o.order_id}",
            "invoice_date": o.order_date.strftime("%d-%m-%Y"),
            "customer_name": o.customer.name,
            "customer_gstin": o.customer.gstin or "Unregistered / B2C",
            "place_of_supply": o.place_of_supply,
            "supply_type": "Intra-State (Tamil Nadu)" if is_intra else f"Inter-State ({o.place_of_supply})",
            "taxable_value": taxable,
            "gst_rate": o.gst_rate,
            "cgst_amount": cgst,
            "sgst_amount": sgst,
            "igst_amount": igst,
            "total_tax": tax_total,
            "total_invoice_amount": inv_total,
            "payment_status": o.payment_status
        })

    return {
        "report_title": "VEOMA LABS — GST SALES REGISTER",
        "generated_at": datetime.utcnow().strftime("%d-%m-%Y %H:%M"),
        "filter_month": month,
        "total_invoices_count": len(invoices),
        "total_taxable_value": total_taxable_value,
        "total_cgst": total_cgst,
        "total_sgst": total_sgst,
        "total_igst": total_igst,
        "total_gst_collected": total_gst_collected,
        "total_invoice_value": total_invoice_value,
        "disclaimer": "Note: Tax figures are generated for internal business records and accounting assistance. Final tax treatment and statutory return filings (GSTR-1, GSTR-3B) should be verified with your business's chartered accountant.",
        "invoices": invoices
    }
