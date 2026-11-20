import io
import os
from decimal import Decimal
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors

def generate_invoice_pdf(order_data: dict) -> io.BytesIO:
    """
    Generates a pixel-perfect PDF invoice matching the Elarchi Labs / Veoma Labs format:
    - Deep purple geometric header & footer banners with dotted matrix pattern
    - Cyan isometric 3D logo
    - Right-aligned company header & banking details
    - Left-aligned 'TO:' customer details
    - Rounded deep-purple table header: DESCRIPTION, QTY, PRICE, TOTAL
    - Sub Total, GST, Total, Courier Charge, Grand Total
    - Contact phone, email, signature block with Gokul Kittusamy / Founder & CEO
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4 # 595.27 x 841.89

    # Palette
    PURPLE_DARK = colors.HexColor("#38074d")
    PURPLE_MID = colors.HexColor("#531270")
    PURPLE_LIGHT = colors.HexColor("#6e1f91")
    CYAN_LIGHT = colors.HexColor("#00c5d7")
    CYAN_DARK = colors.HexColor("#0288d1")
    TEXT_BLACK = colors.HexColor("#111827")
    TEXT_MUTED = colors.HexColor("#4b5563")
    LINE_GRAY = colors.HexColor("#d1d5db")

    # =========================================================================
    # 1. TOP GEOMETRIC PURPLE BANNER WITH DOTTED TEXTURE
    # =========================================================================
    # Layer 1: Dark background wedge across the top
    p1 = c.beginPath()
    p1.moveTo(0, height)
    p1.lineTo(width, height)
    p1.lineTo(width, height - 45)
    p1.lineTo(width * 0.45, height - 70)
    p1.lineTo(0, height - 125)
    p1.close()
    c.setFillColor(PURPLE_DARK)
    c.drawPath(p1, fill=1, stroke=0)

    # Layer 2: Secondary purple wedge overlay
    p2 = c.beginPath()
    p2.moveTo(0, height)
    p2.lineTo(width * 0.58, height)
    p2.lineTo(width * 0.28, height - 95)
    p2.lineTo(0, height - 125)
    p2.close()
    c.setFillColor(PURPLE_MID)
    c.drawPath(p2, fill=1, stroke=0)

    # Dotted Halftone Pattern on the left facet
    c.setFillColor(colors.HexColor("#ffffff"))
    c.setFillAlpha(0.25)
    dot_spacing = 7
    for row in range(12):
        for col in range(24):
            x = 40 + col * dot_spacing + (row * 3.5)
            y = height - 15 - (row * dot_spacing)
            # Only draw dots within the polygon region
            if x < width * 0.38 and y > height - 110:
                c.circle(x, y, 1.0, fill=1, stroke=0)
    c.setFillAlpha(1.0)

    # =========================================================================
    # 2. BOTTOM RIGHT GEOMETRIC PURPLE BANNER WITH DOTTED TEXTURE
    # =========================================================================
    bp1 = c.beginPath()
    bp1.moveTo(width * 0.48, 0)
    bp1.lineTo(width, 0)
    bp1.lineTo(width, 60)
    bp1.lineTo(width * 0.65, 35)
    bp1.close()
    c.setFillColor(PURPLE_DARK)
    c.drawPath(bp1, fill=1, stroke=0)

    bp2 = c.beginPath()
    bp2.moveTo(width * 0.62, 0)
    bp2.lineTo(width, 0)
    bp2.lineTo(width, 50)
    bp2.lineTo(width * 0.75, 18)
    bp2.close()
    c.setFillColor(PURPLE_MID)
    c.drawPath(bp2, fill=1, stroke=0)

    # Bottom Dotted pattern
    c.setFillColor(colors.HexColor("#ffffff"))
    c.setFillAlpha(0.25)
    for row in range(6):
        for col in range(15):
            x = width * 0.68 + col * dot_spacing - (row * 2.5)
            y = 5 + (row * dot_spacing)
            if x < width - 10:
                c.circle(x, y, 0.9, fill=1, stroke=0)
    c.setFillAlpha(1.0)

    # =========================================================================
    # 3. COMPANY BRANDING & LOGO (TOP RIGHT)
    # =========================================================================
    company_name = order_data.get("company_name", "ELARCHI LABS")
    gstin = order_data.get("company_gstin", "33HGMPK9319D1Z7")
    address = order_data.get("company_address", "97, Kundalakeshi street, Camp road, Tambaram")
    account_no = order_data.get("account_no", "282101000006844")
    account_name = order_data.get("account_name", "GOKUL K")
    branch_name = order_data.get("branch_name", "SELAIYUR, IOB")
    phone = order_data.get("phone", "+91 70101 77745")
    email = order_data.get("email", "layercraft3dprint@gmail.com")
    signatory = order_data.get("signatory_name", "GOKUL KITTUSAMY")
    signatory_title = order_data.get("signatory_title", "Founder & CEO")
    notice = order_data.get("notice", "***Seperate shipping charges will be applicable")

    # Draw Cyan 3D Isometric Logo (Left of company name)
    logo_x = 265
    logo_y = 705
    # Left face
    lf = c.beginPath()
    lf.moveTo(logo_x, logo_y)
    lf.lineTo(logo_x + 18, logo_y + 11)
    lf.lineTo(logo_x + 18, logo_y + 38)
    lf.lineTo(logo_x, logo_y + 27)
    lf.close()
    c.setFillColor(CYAN_LIGHT)
    c.drawPath(lf, fill=1, stroke=0)

    # Right face
    rf = c.beginPath()
    rf.moveTo(logo_x + 22, logo_y + 11)
    rf.lineTo(logo_x + 40, logo_y)
    rf.lineTo(logo_x + 40, logo_y + 27)
    rf.lineTo(logo_x + 22, logo_y + 38)
    rf.close()
    c.setFillColor(CYAN_DARK)
    c.drawPath(rf, fill=1, stroke=0)

    # Logo cut-out accent
    c.setFillColor(colors.white)
    c.circle(logo_x + 31, logo_y + 20, 3.5, fill=1, stroke=0)

    # Company Name & INVOICE
    c.setFillColor(TEXT_BLACK)
    c.setFont("Helvetica-Bold", 20)
    c.drawRightString(width - 50, 725, company_name)
    c.setFont("Helvetica", 11)
    c.drawRightString(width - 50, 708, "INVOICE")

    # Quotation Date & Invoice No
    c.setFont("Helvetica", 9)
    inv_date = order_data.get("invoice_date", datetime.utcnow().strftime("%d/%m/%Y"))
    inv_no = order_data.get("invoice_no", "ELA2026017")
    c.drawRightString(width - 50, 686, f"Quotation Date: {inv_date}")
    c.drawRightString(width - 50, 672, f"Invoice no : {inv_no}")

    # GST & Address Details
    c.setFont("Helvetica-Bold", 8.5)
    c.drawRightString(width - 50, 654, f"GST No. - {gstin}")
    c.setFont("Helvetica", 8)
    # Split address if needed
    addr_parts = [p.strip() for p in address.split(",")]
    if len(addr_parts) >= 3:
        c.drawRightString(width - 50, 640, f"Address - {addr_parts[0]}, {addr_parts[1]},")
        c.drawRightString(width - 50, 628, ", ".join(addr_parts[2:]))
    else:
        c.drawRightString(width - 50, 640, f"Address - {address}")

    # Payment Method & Bank Account Info
    c.setFont("Helvetica-Bold", 8)
    c.drawRightString(width - 50, 608, "PAYMENT METHOD - CASH / BANK")
    # Draw checkmark over BANK
    c.setStrokeColor(TEXT_BLACK)
    c.setLineWidth(1.2)
    c.line(width - 66, 611, width - 62, 607)
    c.line(width - 62, 607, width - 54, 616)

    c.setFont("Helvetica", 8)
    c.drawRightString(width - 50, 594, f"Account No:  {account_no}")
    c.drawRightString(width - 50, 581, f"Acoount Name: {account_name}")
    c.drawRightString(width - 50, 568, f"Branch Name: {branch_name}")

    # =========================================================================
    # 4. CUSTOMER "TO:" SECTION (TOP LEFT)
    # =========================================================================
    cust_name = order_data.get("customer_name", "SRI SAMVARDHINI ,").upper()
    cust_address = order_data.get("customer_address", "CHENNAI,\nTAMILNADU.").upper()
    cust_gstin = order_data.get("customer_gstin", "33AFJFS7476L1Z9")

    c.setFont("Helvetica-Bold", 9)
    c.drawString(50, 686, "TO:")
    c.drawString(50, 668, cust_name)

    c.setFont("Helvetica", 8.5)
    curr_y = 654
    for line in cust_address.split("\n"):
        if line.strip():
            c.drawString(50, curr_y, line.strip())
            curr_y -= 13

    if cust_gstin and cust_gstin != "None":
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(50, curr_y - 2, f"GST No. - {cust_gstin}")

    # =========================================================================
    # 5. LINE ITEMS TABLE
    # =========================================================================
    table_top = 530
    table_x = 50
    table_w = width - 100 # 495 pt
    header_h = 24

    # Rounded Purple Header Bar
    c.setFillColor(PURPLE_DARK)
    c.roundRect(table_x, table_top - header_h, table_w, header_h, 6, fill=1, stroke=0)

    # Column Titles
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(table_x + 16, table_top - 16, "DESCRIPTION")
    c.drawString(table_x + 195, table_top - 16, "QTY")
    c.drawRightString(table_x + 355, table_top - 16, "PRICE")
    c.drawRightString(table_x + table_w - 20, table_top - 16, "TOTAL")

    # Populate Line Items
    items = order_data.get("items", [])
    row_y = table_top - 46
    line_h = 24

    c.setFillColor(TEXT_BLACK)
    for itm in items:
        desc = itm.get("description", "")
        qty_str = itm.get("qty", "1 job")
        price_val = itm.get("price", Decimal("0.00"))
        tot_val = itm.get("total", Decimal("0.00"))

        c.setFont("Helvetica", 9.5)
        c.drawString(table_x + 16, row_y, desc)
        c.drawString(table_x + 195, row_y, str(qty_str))
        c.drawRightString(table_x + 355, row_y, f"{price_val:,.0f}")
        c.drawRightString(table_x + table_w - 20, row_y, f"{tot_val:,.0f}")

        row_y -= line_h

    # Horizontal Line Below Table Items
    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(0.8)
    table_bottom_y = min(row_y + 10, 420)
    c.line(table_x, table_bottom_y, table_x + table_w, table_bottom_y)

    # =========================================================================
    # 6. TOTALS & SUMMARY SECTION (RIGHT-ALIGNED)
    # =========================================================================
    subtotal = order_data.get("subtotal", Decimal("61000.00"))
    gst_val = order_data.get("gst", Decimal("10980.00"))
    total_val = order_data.get("total", Decimal("71980.00"))
    courier_val = order_data.get("courier_charge", Decimal("4510.00"))
    grand_total = order_data.get("grand_total", Decimal("76490.00"))

    totals_y = table_bottom_y - 24
    label_x = table_x + 280
    value_x = table_x + table_w - 20

    c.setFont("Helvetica", 9.5)
    c.drawString(label_x, totals_y, "SUB TOTAL")
    c.drawRightString(value_x, totals_y, f"Rs.{subtotal:,.0f}")

    totals_y -= 22
    c.drawString(label_x, totals_y, "GST")
    c.drawRightString(value_x, totals_y, f"Rs.{gst_val:,.0f}")

    totals_y -= 22
    c.setFont("Helvetica-Bold", 10)
    c.drawString(label_x, totals_y, "TOTAL")
    c.drawRightString(value_x, totals_y, f"Rs.{total_val:,.0f}")

    # Separator Line Above Courier
    totals_y -= 14
    c.setStrokeColor(LINE_GRAY)
    c.setLineWidth(0.8)
    c.line(label_x - 5, totals_y, table_x + table_w, totals_y)

    totals_y -= 20
    c.setFont("Helvetica", 9.5)
    c.drawString(label_x, totals_y, "Courier charge")
    c.drawRightString(value_x, totals_y, f"Rs.{courier_val:,.0f}")

    totals_y -= 26
    c.setFont("Helvetica-Bold", 11)
    c.drawString(label_x, totals_y, "GRAND TOTAL")
    c.drawRightString(value_x, totals_y, f"Rs.{grand_total:,.0f}")

    # =========================================================================
    # 7. FOOTER & SIGNATURE SECTION
    # =========================================================================
    footer_y = 100

    # Left: Contact Info
    c.setFont("Helvetica", 9)
    c.setFillColor(TEXT_BLACK)
    c.drawString(50, footer_y + 36, phone)
    c.drawString(50, footer_y + 20, email)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(TEXT_MUTED)
    c.drawString(50, footer_y + 4, notice)

    # Right: Hand-drawn Authentic Signature & Signatory
    sig_center_x = width - 140

    sig_img_path = os.path.join(os.path.dirname(__file__), "..", "assets", "signature.png")
    if os.path.exists(sig_img_path):
        sig_w = 76
        sig_h = 76 * (128 / 228)  # ~42.7 points
        c.drawImage(
            sig_img_path,
            sig_center_x - (sig_w / 2),
            footer_y + 46,
            width=sig_w,
            height=sig_h,
            mask="auto",
            preserveAspectRatio=True,
        )

    # Solid horizontal divider line under signature (matching reference)
    c.setStrokeColor(TEXT_BLACK)
    c.setLineWidth(1.1)
    c.line(sig_center_x - 65, footer_y + 43, sig_center_x + 65, footer_y + 43)

    c.setFont("Helvetica-Bold", 10.5)
    c.setFillColor(TEXT_BLACK)
    c.drawCentredString(sig_center_x, footer_y + 26, signatory.upper())
    c.setFont("Helvetica", 8.5)
    c.drawCentredString(sig_center_x, footer_y + 12, signatory_title)

    c.save()
    buffer.seek(0)
    return buffer
