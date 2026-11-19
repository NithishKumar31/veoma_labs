import io
from datetime import datetime
from decimal import Decimal
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from sqlalchemy.orm import Session
from ..models import Order, Customer, DailyExpense, Workshop, InventoryItem

def generate_excel_report(db: Session, report_type: str, start_date: str = None, end_date: str = None) -> io.BytesIO:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = report_type.upper()

    # Styling definitions
    title_font = Font(name="Calibri", size=16, bold=True, color="1E293B")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    regular_font = Font(name="Calibri", size=10)
    total_font = Font(name="Calibri", size=11, bold=True, color="0F172A")
    total_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # Title block
    ws.merge_cells("A1:G1")
    ws["A1"] = "VEOMA LABS — BUSINESS MANAGEMENT SYSTEM"
    ws["A1"].font = title_font

    ws.merge_cells("A2:G2")
    ws["A2"] = f"Report: {report_type.upper()} | Generated: {datetime.utcnow().strftime('%d-%m-%Y %H:%M UTC')}"
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="64748B")

    row_idx = 4

    if report_type.upper() == "ORDERS":
        headers = [
            "Order ID", "Customer Name", "Phone", "Model Name", "Status",
            "Order Date", "Direct Cost (₹)", "Selling Price (₹)", "Paid (₹)", "Balance (₹)"
        ]
        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        orders = db.query(Order).join(Customer).order_by(Order.order_date.desc()).all()
        row_idx += 1

        total_rev = Decimal("0.00")
        total_cost = Decimal("0.00")
        total_paid = Decimal("0.00")
        total_bal = Decimal("0.00")

        for o in orders:
            ws.append([
                o.order_id,
                o.customer.name if o.customer else "",
                o.customer.phone if o.customer else "",
                o.model_name,
                o.order_status,
                o.order_date.strftime("%d-%m-%Y"),
                float(o.total_direct_cost),
                float(o.agreed_selling_price),
                float(o.total_paid),
                float(o.remaining_balance)
            ])
            total_rev += o.agreed_selling_price
            total_cost += o.total_direct_cost
            total_paid += o.total_paid
            total_bal += o.remaining_balance
            row_idx += 1

        # Totals Row
        ws.append(["TOTALS", "", "", "", "", "", float(total_cost), float(total_rev), float(total_paid), float(total_bal)])
        for col_num in range(1, len(headers) + 1):
            c = ws.cell(row=row_idx, column=col_num)
            c.font = total_font
            c.fill = total_fill
            c.border = thin_border

    elif report_type.upper() == "EXPENSES":
        headers = ["Expense Code", "Date", "Category", "Description", "Amount (₹)", "Payment Method", "Paid By"]
        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
            cell.border = thin_border

        expenses = db.query(DailyExpense).filter(DailyExpense.is_archived == False).order_by(DailyExpense.expense_date.desc()).all()
        row_idx += 1
        total_exp = Decimal("0.00")
        for e in expenses:
            ws.append([
                e.expense_code,
                e.expense_date.strftime("%d-%m-%Y"),
                e.category,
                e.description,
                float(e.amount),
                e.payment_method,
                e.paid_by
            ])
            total_exp += e.amount
            row_idx += 1

        ws.append(["TOTALS", "", "", "", float(total_exp), "", ""])
        for col_num in range(1, len(headers) + 1):
            c = ws.cell(row=row_idx, column=col_num)
            c.font = total_font
            c.fill = total_fill
            c.border = thin_border

    elif report_type.upper() == "INVENTORY":
        headers = ["Material", "Brand", "Colour", "Current Stock (g)", "Threshold (g)", "Avg Cost / g (₹)", "Total Stock Value (₹)"]
        ws.append(headers)
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=row_idx, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = thin_border

        items = db.query(InventoryItem).filter(InventoryItem.is_active == True).all()
        row_idx += 1
        total_val = Decimal("0.00")
        for item in items:
            val = item.current_stock_grams * item.avg_cost_per_gram
            total_val += val
            ws.append([
                item.material_type,
                item.brand,
                item.colour,
                float(item.current_stock_grams),
                float(item.min_threshold_grams),
                float(item.avg_cost_per_gram),
                float(val)
            ])
            row_idx += 1

        ws.append(["TOTAL VALUE", "", "", "", "", "", float(total_val)])
        for col_num in range(1, len(headers) + 1):
            c = ws.cell(row=row_idx, column=col_num)
            c.font = total_font
            c.fill = total_fill
            c.border = thin_border

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            val = str(cell.value or "")
            if len(val) > max_len:
                max_len = len(val)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
