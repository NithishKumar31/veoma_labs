import io
from datetime import datetime
from decimal import Decimal
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from sqlalchemy.orm import Session
from ..models import Order, Customer, DailyExpense, Workshop

def generate_pdf_report(db: Session, report_type: str, start_date: str = None, end_date: str = None) -> io.BytesIO:
    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(letter),
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor("#1E3A8A"),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=15
    )

    elements = []
    elements.append(Paragraph("VEOMA LABS — BUSINESS MANAGEMENT SYSTEM", title_style))
    elements.append(Paragraph(
        f"Official Report: {report_type.upper()} | Date Generated: {datetime.utcnow().strftime('%d-%m-%Y %H:%M UTC')} | Currency: INR (₹)",
        subtitle_style
    ))

    table_data = []

    if report_type.upper() == "ORDERS":
        table_data.append(["Order ID", "Customer", "Phone", "Model Name", "Status", "Date", "Direct Cost", "Price", "Paid", "Balance"])
        orders = db.query(Order).join(Customer).order_by(Order.order_date.desc()).limit(50).all()

        total_cost = Decimal("0.00")
        total_rev = Decimal("0.00")
        total_paid = Decimal("0.00")
        total_bal = Decimal("0.00")

        for o in orders:
            table_data.append([
                o.order_id,
                (o.customer.name[:15] + '..') if o.customer and len(o.customer.name) > 15 else (o.customer.name if o.customer else ""),
                o.customer.phone if o.customer else "",
                (o.model_name[:18] + '..') if len(o.model_name) > 18 else o.model_name,
                o.order_status,
                o.order_date.strftime("%d-%m-%Y"),
                f"₹{o.total_direct_cost:,.2f}",
                f"₹{o.agreed_selling_price:,.2f}",
                f"₹{o.total_paid:,.2f}",
                f"₹{o.remaining_balance:,.2f}"
            ])
            total_cost += o.total_direct_cost
            total_rev += o.agreed_selling_price
            total_paid += o.total_paid
            total_bal += o.remaining_balance

        table_data.append([
            "TOTALS", "", "", "", "", "",
            f"₹{total_cost:,.2f}", f"₹{total_rev:,.2f}", f"₹{total_paid:,.2f}", f"₹{total_bal:,.2f}"
        ])

    elif report_type.upper() == "EXPENSES":
        table_data.append(["Code", "Date", "Category", "Description", "Amount", "Method", "Paid By"])
        expenses = db.query(DailyExpense).filter(DailyExpense.is_archived == False).order_by(DailyExpense.expense_date.desc()).limit(60).all()
        total_exp = Decimal("0.00")
        for e in expenses:
            table_data.append([
                e.expense_code,
                e.expense_date.strftime("%d-%m-%Y"),
                e.category,
                (e.description[:35] + '..') if len(e.description) > 35 else e.description,
                f"₹{e.amount:,.2f}",
                e.payment_method,
                e.paid_by
            ])
            total_exp += e.amount
        table_data.append(["TOTALS", "", "", "", f"₹{total_exp:,.2f}", "", ""])

    # Create Table with styling
    t = Table(table_data, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E2E8F0")),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))

    elements.append(t)
    doc.build(elements)
    output.seek(0)
    return output
