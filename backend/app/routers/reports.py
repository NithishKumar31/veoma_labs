from typing import Optional, Dict, Any, List
from decimal import Decimal
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    Order, OrderPayment, DailyExpense, Workshop, WorkshopExpense,
    WorkshopParticipant, RentRecord, SalaryRecord, Printer, OrderProductionItem, User
)
from ..auth import get_current_user, require_super_admin
from ..services.calculation import round_money
from ..services.excel_export import generate_excel_report
from ..services.pdf_export import generate_pdf_report

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

def parse_date_range(filter_type: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    today_end = datetime(now.year, now.month, now.day, 23, 59, 59)

    if filter_type == "TODAY":
        return today_start, today_end
    elif filter_type == "YESTERDAY":
        yest = today_start - timedelta(days=1)
        return yest, datetime(yest.year, yest.month, yest.day, 23, 59, 59)
    elif filter_type == "THIS_WEEK":
        # Monday to today
        start_week = today_start - timedelta(days=today_start.weekday())
        return start_week, today_end
    elif filter_type == "THIS_MONTH":
        start_month = datetime(now.year, now.month, 1, 0, 0, 0)
        return start_month, today_end
    elif filter_type == "LAST_MONTH":
        if now.month == 1:
            start_last = datetime(now.year - 1, 12, 1, 0, 0, 0)
            end_last = datetime(now.year - 1, 12, 31, 23, 59, 59)
        else:
            start_last = datetime(now.year, now.month - 1, 1, 0, 0, 0)
            last_day = (datetime(now.year, now.month, 1) - timedelta(days=1)).day
            end_last = datetime(now.year, now.month - 1, last_day, 23, 59, 59)
        return start_last, end_last
    elif filter_type == "THIS_YEAR":
        return datetime(now.year, 1, 1, 0, 0, 0), today_end
    elif start_date and end_date:
        return datetime.fromisoformat(start_date), datetime.fromisoformat(end_date)

    # Default to all-time / last 12 months
    return datetime(now.year - 1, now.month, 1), today_end

@router.get("/dashboard")
def get_dashboard_summary(
    filter_type: Optional[str] = "THIS_MONTH",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dt_start, dt_end = parse_date_range(filter_type, start_date, end_date)

    # 1. Orders metrics
    orders_query = db.query(Order).filter(Order.order_date >= dt_start, Order.order_date <= dt_end)
    orders = orders_query.all()

    total_orders = len(orders)
    completed_orders = sum(1 for o in orders if o.order_status in ["COMPLETED", "SHIPPED", "DELIVERED"])
    pending_orders = sum(1 for o in orders if o.order_status not in ["COMPLETED", "SHIPPED", "DELIVERED", "CANCELLED"])

    # Order revenue = Taxable agreed selling price
    order_revenue = sum((o.agreed_selling_price for o in orders), Decimal("0.00"))
    order_direct_costs = sum((o.total_direct_cost for o in orders), Decimal("0.00"))
    order_gross_contribution = order_revenue - order_direct_costs
    gst_collected = sum((o.cgst_amount + o.sgst_amount + o.igst_amount for o in orders if o.gst_applicable), Decimal("0.00"))

    # Payments collected in this period
    payments = db.query(OrderPayment).filter(
        OrderPayment.payment_date >= dt_start,
        OrderPayment.payment_date <= dt_end
    ).all()
    total_payments_received = sum((p.amount for p in payments), Decimal("0.00"))

    # Outstanding customer payments across all active orders
    all_unpaid_orders = db.query(Order).filter(Order.order_status != "CANCELLED").all()
    outstanding_customer_payments = sum((o.remaining_balance for o in all_unpaid_orders if o.remaining_balance > 0), Decimal("0.00"))

    # 2. Workshops metrics
    workshops = db.query(Workshop).filter(Workshop.start_date >= dt_start, Workshop.start_date <= dt_end).all()
    total_workshop_revenue = sum((w.total_revenue for w in workshops), Decimal("0.00"))
    total_workshop_expenses = sum((w.total_expenses for w in workshops), Decimal("0.00"))
    workshop_gross_contribution = total_workshop_revenue - total_workshop_expenses

    # 3. Daily general expenses
    daily_expenses_records = db.query(DailyExpense).filter(
        DailyExpense.is_archived == False,
        DailyExpense.expense_date >= dt_start,
        DailyExpense.expense_date <= dt_end
    ).all()
    general_expenses = sum((e.amount for e in daily_expenses_records), Decimal("0.00"))

    # 4. Rent expenses in period
    rent_records = db.query(RentRecord).filter(
        RentRecord.payment_date >= dt_start,
        RentRecord.payment_date <= dt_end
    ).all()
    rent_expenses = sum((r.amount for r in rent_records), Decimal("0.00"))

    # 5. Salaries paid in period
    salary_records = db.query(SalaryRecord).filter(
        SalaryRecord.payment_date >= dt_start,
        SalaryRecord.payment_date <= dt_end
    ).all()
    salary_expenses = sum((s.amount_paid for s in salary_records), Decimal("0.00"))

    # Total Expenses (Shared Business Overhead + Direct Costs + Workshop Expenses)
    total_business_expenses = order_direct_costs + total_workshop_expenses + general_expenses + rent_expenses + salary_expenses
    total_revenue = order_revenue + total_workshop_revenue
    gross_profit = order_gross_contribution + workshop_gross_contribution
    net_business_profit = gross_profit - general_expenses - rent_expenses - salary_expenses

    # Can this user view profit figures? If Sub Admin without permission, mask net profit
    can_view_profits = (current_user.role == "SUPER_ADMIN" or (current_user.permissions or {}).get("can_view_profits", False))

    # Daily revenue chart (last 14 days)
    chart_days = 14
    daily_revenue_chart = []
    base_day = datetime.utcnow().date() - timedelta(days=chart_days - 1)
    for i in range(chart_days):
        cur_day = base_day + timedelta(days=i)
        d_start = datetime.combine(cur_day, datetime.min.time())
        d_end = datetime.combine(cur_day, datetime.max.time())

        d_orders = [o for o in orders if d_start <= o.order_date <= d_end]
        d_order_rev = sum((o.agreed_selling_price for o in d_orders), Decimal("0.00"))
        d_exp = [e for e in daily_expenses_records if d_start <= e.expense_date <= d_end]
        d_exp_sum = sum((e.amount for e in d_exp), Decimal("0.00"))

        daily_revenue_chart.append({
            "date": cur_day.strftime("%d-%m"),
            "revenue": float(d_order_rev),
            "expenses": float(d_exp_sum)
        })

    # Expense Category breakdown
    cat_breakdown = {}
    for e in daily_expenses_records:
        cat_breakdown[e.category] = cat_breakdown.get(e.category, Decimal("0.00")) + e.amount
    expense_category_chart = [{"name": k, "value": float(v)} for k, v in cat_breakdown.items()]

    # Printer activity
    printers = db.query(Printer).all()
    printer_activity_chart = []
    for p in printers:
        p_items = db.query(OrderProductionItem).filter(OrderProductionItem.printer_id == p.id).all()
        p_grams = sum((item.total_estimated_grams for item in p_items), Decimal("0.00"))
        printer_activity_chart.append({
            "printer": p.name,
            "grams": float(p_grams),
            "orders": len(p_items)
        })

    return {
        "filter_type": filter_type,
        "date_start": dt_start.strftime("%d-%m-%Y"),
        "date_end": dt_end.strftime("%d-%m-%Y"),
        "total_revenue": total_revenue,
        "total_expenses": total_business_expenses,
        "gross_profit": gross_profit,
        "net_business_profit": net_business_profit if can_view_profits else None,
        "total_payments_received": total_payments_received,
        "outstanding_customer_payments": outstanding_customer_payments,
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "pending_orders": pending_orders,
        "order_revenue": order_revenue,
        "order_gross_contribution": order_gross_contribution,
        "total_workshop_revenue": total_workshop_revenue,
        "total_workshop_profit": workshop_gross_contribution,
        "general_expenses": general_expenses,
        "rent_expenses": rent_expenses if can_view_profits else None,
        "salary_expenses": salary_expenses if can_view_profits else None,
        "gst_collected": gst_collected,
        "can_view_profits": can_view_profits,
        "daily_revenue_chart": daily_revenue_chart,
        "expense_category_chart": expense_category_chart,
        "printer_activity_chart": printer_activity_chart
    }

@router.get("/profit-and-loss")
def get_profit_and_loss_report(
    filter_type: Optional[str] = "THIS_MONTH",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    dt_start, dt_end = parse_date_range(filter_type, start_date, end_date)

    # 1. Orders Revenue & Direct Costs
    orders = db.query(Order).filter(Order.order_date >= dt_start, Order.order_date <= dt_end).all()
    order_revenue = sum((o.agreed_selling_price for o in orders), Decimal("0.00"))
    order_direct_costs = sum((o.total_direct_cost for o in orders), Decimal("0.00"))
    order_gross_contribution = order_revenue - order_direct_costs

    # 2. Workshops Revenue & Expenses
    workshops = db.query(Workshop).filter(Workshop.start_date >= dt_start, Workshop.start_date <= dt_end).all()
    workshop_revenue = sum((w.total_revenue for w in workshops), Decimal("0.00"))
    workshop_expenses = sum((w.total_expenses for w in workshops), Decimal("0.00"))
    workshop_gross_contribution = workshop_revenue - workshop_expenses

    # 3. General Daily Expenses
    daily_expenses = db.query(DailyExpense).filter(
        DailyExpense.is_archived == False,
        DailyExpense.expense_date >= dt_start,
        DailyExpense.expense_date <= dt_end
    ).all()
    general_expenses = sum((e.amount for e in daily_expenses), Decimal("0.00"))

    # 4. Monthly Rent
    rent_records = db.query(RentRecord).filter(
        RentRecord.payment_date >= dt_start,
        RentRecord.payment_date <= dt_end
    ).all()
    rent_total = sum((r.amount for r in rent_records), Decimal("0.00"))

    # 5. Salaries Paid
    salary_records = db.query(SalaryRecord).filter(
        SalaryRecord.payment_date >= dt_start,
        SalaryRecord.payment_date <= dt_end
    ).all()
    salary_total = sum((s.amount_paid for s in salary_records), Decimal("0.00"))

    # Calculations
    total_gross_contribution = order_gross_contribution + workshop_gross_contribution
    total_shared_overheads = general_expenses + rent_total + salary_total
    net_business_profit = total_gross_contribution - total_shared_overheads

    return {
        "report_title": "VEOMA LABS — PROFIT & LOSS STATEMENT",
        "period": f"{dt_start.strftime('%d-%m-%Y')} to {dt_end.strftime('%d-%m-%Y')}",
        "order_revenue": order_revenue,
        "order_direct_costs": order_direct_costs,
        "order_gross_contribution": order_gross_contribution,
        "workshop_revenue": workshop_revenue,
        "workshop_expenses": workshop_expenses,
        "workshop_gross_contribution": workshop_gross_contribution,
        "total_gross_contribution": total_gross_contribution,
        "general_expenses": general_expenses,
        "rent_expenses": rent_total,
        "salary_expenses": salary_total,
        "total_shared_overheads": total_shared_overheads,
        "net_business_profit": net_business_profit
    }

@router.get("/export/excel")
def export_excel(
    report_type: str = "ORDERS", # ORDERS, EXPENSES, WORKSHOPS, INVENTORY, GST, PNL
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    excel_stream = generate_excel_report(db, report_type, start_date, end_date)
    filename = f"veoma_labs_{report_type.lower()}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_pdf(
    report_type: str = "ORDERS", # ORDERS, EXPENSES, GST, PNL
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pdf_stream = generate_pdf_report(db, report_type, start_date, end_date)
    filename = f"veoma_labs_{report_type.lower()}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
