from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import (
    Order, OrderProductionItem, OrderPayment, Customer, Printer,
    InventoryItem, InventoryMovement, User, MaterialRate
)
from ..schemas import (
    OrderCreate, OrderResponse, OrderStatusUpdate, OrderPaymentCreate,
    OrderPaymentResponse, PriceSuggestionRequest, PriceSuggestionResponse,
    OrderReconcileActualConsumption
)
from ..auth import get_current_user, log_audit, require_super_admin
from ..services.calculation import (
    calculate_production_item_cost, calculate_order_totals,
    suggest_selling_price, round_money
)
from ..services.invoice_pdf import generate_invoice_pdf
from ..config import SUPPLIER_STATE

router = APIRouter(prefix="/api/orders", tags=["Orders & Production"])

def generate_order_id(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(Order).filter(Order.order_id.like(f"VOM-ORD-{year}-%")).count()
    return f"VOM-ORD-{year}-{count + 1:04d}"

def generate_payment_code(db: Session, order_id_str: str) -> str:
    count = db.query(OrderPayment).join(Order).filter(Order.order_id == order_id_str).count()
    return f"PAY-{order_id_str}-{count + 1:02d}"

@router.post("/suggest-price", response_model=PriceSuggestionResponse)
def get_price_suggestion(req: PriceSuggestionRequest, db: Session = Depends(get_db)):
    # Calculate production costs for items
    calculated_items = []
    base_prod_total = Decimal("0.00")
    post_proc_total = Decimal("0.00")

    for p in req.production_items:
        # Fetch current rate from DB if available
        rate_record = db.query(MaterialRate).filter(MaterialRate.material_type == p.material_type.upper()).first()
        base_rate = rate_record.base_rate_per_gram if rate_record else None
        post_rate = rate_record.post_processing_rate_per_gram if rate_record else None

        item_calc = calculate_production_item_cost(
            material_type=p.material_type,
            model_weight_grams=p.model_weight_grams,
            wastage_percentage=p.wastage_percentage,
            post_processing_required=p.post_processing_required,
            custom_base_rate=base_rate,
            custom_post_rate=post_rate
        )
        calculated_items.append(item_calc)
        base_prod_total += item_calc["production_cost"]
        post_proc_total += item_calc["post_processing_cost"]

    des_cost = req.designing_cost if req.designing_required else Decimal("0.00")
    total_direct_cost = round_money(
        base_prod_total + post_proc_total + des_cost +
        req.courier_charge + req.packing_cost + req.other_direct_costs
    )

    suggested = suggest_selling_price(
        total_direct_cost=total_direct_cost,
        target_profit_amount=req.target_profit_amount,
        target_profit_margin_pct=req.target_profit_margin_pct
    )

    profit = round_money(suggested - total_direct_cost)
    margin = round_money((profit / suggested * Decimal("100.0"))) if suggested > 0 else Decimal("0.00")

    return {
        "base_production_cost": round_money(base_prod_total),
        "post_processing_cost": round_money(post_proc_total),
        "total_direct_cost": total_direct_cost,
        "suggested_selling_price": suggested,
        "estimated_profit": profit,
        "estimated_margin_pct": margin
    }

@router.get("", response_model=List[OrderResponse])
def list_orders(
    search: Optional[str] = None,
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    customer_id: Optional[str] = None,
    gst_applicable: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order).join(Customer)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Order.order_id.ilike(search_filter)) |
            (Order.model_name.ilike(search_filter)) |
            (Customer.name.ilike(search_filter)) |
            (Customer.phone.ilike(search_filter))
        )
    if order_status:
        query = query.filter(Order.order_status == order_status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    if customer_id:
        query = query.filter(Order.customer_id == customer_id)
    if gst_applicable is not None:
        query = query.filter(Order.gst_applicable == gst_applicable)
    if start_date:
        query = query.filter(Order.order_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Order.order_date <= datetime.fromisoformat(end_date))

    orders = query.order_by(Order.order_date.desc()).all()

    # Populate customer name and phone
    res = []
    for o in orders:
        ord_dict = OrderResponse.from_orm(o)
        ord_dict.customer_name = o.customer.name if o.customer else None
        ord_dict.customer_phone = o.customer.phone if o.customer else None
        res.append(ord_dict)
    return res

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    res = OrderResponse.from_orm(order)
    res.customer_name = order.customer.name if order.customer else None
    res.customer_phone = order.customer.phone if order.customer else None
    return res

@router.post("", response_model=OrderResponse)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Resolve or create customer
    customer = None
    if order_in.customer_id:
        customer = db.query(Customer).filter(Customer.id == order_in.customer_id).first()
    elif order_in.customer_phone and order_in.customer_name:
        customer = db.query(Customer).filter(Customer.phone == order_in.customer_phone.strip()).first()
        if not customer:
            from .customers import generate_customer_code
            customer = Customer(
                customer_code=generate_customer_code(db),
                name=order_in.customer_name.strip(),
                phone=order_in.customer_phone.strip(),
                email=order_in.customer_email.strip() if order_in.customer_email else None,
                address=order_in.customer_address
            )
            db.add(customer)
            db.flush()

    if not customer:
        raise HTTPException(status_code=400, detail="Valid customer or customer details required")

    order_code = generate_order_id(db)

    # 2. Calculate production items
    calculated_items_data = []
    total_estimated_by_material = {}

    for item in order_in.production_items:
        mat_type = item.material_type.upper().strip()
        rate_record = db.query(MaterialRate).filter(MaterialRate.material_type == mat_type).first()
        base_rate = rate_record.base_rate_per_gram if rate_record else None
        post_rate = rate_record.post_processing_rate_per_gram if rate_record else None

        calc = calculate_production_item_cost(
            material_type=mat_type,
            model_weight_grams=item.model_weight_grams,
            wastage_percentage=item.wastage_percentage,
            post_processing_required=item.post_processing_required,
            custom_base_rate=base_rate,
            custom_post_rate=post_rate
        )
        calculated_items_data.append({
            "printer_id": item.printer_id.strip() if item.printer_id and item.printer_id.strip() else None,
            "material_type": mat_type,
            "printing_hours": item.printing_hours,
            "notes": item.notes,
            **calc
        })

        # Sum total estimated grams per material for stock deduction
        total_estimated_by_material[mat_type] = total_estimated_by_material.get(mat_type, Decimal("0.00")) + calc["total_estimated_grams"]

    # 3. Calculate order totals, profit before shared expenses, and GST
    order_totals = calculate_order_totals(
        production_items=calculated_items_data,
        designing_required=order_in.designing_required,
        designing_cost=order_in.designing_cost,
        courier_charge=order_in.courier_charge,
        packing_cost=order_in.packing_cost,
        other_direct_costs=order_in.other_direct_costs,
        agreed_selling_price=order_in.agreed_selling_price,
        gst_applicable=order_in.gst_applicable,
        place_of_supply=order_in.place_of_supply,
        gst_rate=order_in.gst_rate
    )

    # 4. Create Order instance
    order = Order(
        order_id=order_code,
        customer_id=customer.id,
        order_date=datetime.utcnow(),
        expected_delivery_date=order_in.expected_delivery_date,
        model_name=order_in.model_name.strip(),
        image_url=order_in.image_url,
        description=order_in.description,
        quantity=order_in.quantity,
        order_status="PENDING",
        designing_required=order_in.designing_required,
        designing_cost=order_totals["designing_cost"],
        courier_charge=order_totals["courier_charge"],
        packing_cost=order_totals["packing_cost"],
        other_direct_costs=order_totals["other_direct_costs"],
        base_production_cost=order_totals["base_production_cost"],
        post_processing_cost=order_totals["post_processing_cost"],
        total_direct_cost=order_totals["total_direct_cost"],
        agreed_selling_price=order_in.agreed_selling_price,
        gross_profit=order_totals["gross_profit"],
        profit_margin_pct=order_totals["profit_margin_pct"],
        gst_applicable=order_totals["gst_applicable"],
        place_of_supply=order_totals["place_of_supply"],
        taxable_value=order_totals["taxable_value"],
        gst_rate=order_totals["gst_rate"],
        cgst_amount=order_totals["cgst_amount"],
        sgst_amount=order_totals["sgst_amount"],
        igst_amount=order_totals["igst_amount"],
        total_invoice_amount=order_totals["total_invoice_amount"],
        invoice_number=f"INV-{order_code}" if order_totals["gst_applicable"] else None,
        payment_status="UNPAID",
        total_paid=Decimal("0.00"),
        remaining_balance=order_in.agreed_selling_price,
        production_notes=order_in.production_notes,
        created_by=current_user.id
    )
    db.add(order)
    db.flush()

    # 5. Add OrderProductionItems
    for c_item in calculated_items_data:
        p_item = OrderProductionItem(
            order_id=order.id,
            printer_id=c_item["printer_id"] if c_item.get("printer_id") else None,
            material_type=c_item["material_type"],
            model_weight_grams=c_item["model_weight_grams"],
            wastage_percentage=c_item["wastage_percentage"],
            total_estimated_grams=c_item["total_estimated_grams"],
            base_rate_per_gram=c_item["base_rate_per_gram"],
            post_processing_rate_per_gram=c_item["post_processing_rate_per_gram"],
            post_processing_required=c_item["post_processing_required"],
            production_cost=c_item["production_cost"],
            post_processing_cost=c_item["post_processing_cost"],
            printing_hours=c_item["printing_hours"],
            notes=c_item["notes"]
        )
        db.add(p_item)

    # 6. Automatic Inventory Deduction with 10% wastage allowance & low-stock override check
    for mat_type, est_grams in total_estimated_by_material.items():
        inv_item = db.query(InventoryItem).filter(
            InventoryItem.material_type == mat_type,
            InventoryItem.is_active == True
        ).first()

        if inv_item:
            prev_stock = inv_item.current_stock_grams
            new_stock = prev_stock - est_grams
            inv_item.current_stock_grams = new_stock

            movement = InventoryMovement(
                inventory_item_id=inv_item.id,
                movement_type="ORDER_RESERVATION",
                quantity_grams=-est_grams,
                previous_stock_grams=prev_stock,
                new_stock_grams=new_stock,
                reference_type="ORDER",
                reference_id=order.order_id,
                reason=f"Estimated material consumption (including 10% wastage) for order {order.order_id}",
                performed_by=current_user.id
            )
            db.add(movement)

            if new_stock < inv_item.min_threshold_grams:
                log_audit(
                    db=db,
                    user=current_user,
                    action="OVERRIDE",
                    module="INVENTORY",
                    record_id=inv_item.id,
                    remarks=f"Low-stock warning bypassed for {mat_type}: Available {prev_stock}g, requested {est_grams}g, remaining {new_stock}g."
                )

    # 7. Record initial advance payment if provided
    if order_in.initial_payment and order_in.initial_payment.amount > Decimal("0.00"):
        pay_code = generate_payment_code(db, order.order_id)
        payment = OrderPayment(
            order_id=order.id,
            payment_code=pay_code,
            amount=order_in.initial_payment.amount,
            payment_date=order_in.initial_payment.payment_date or datetime.utcnow(),
            payment_method=order_in.initial_payment.payment_method,
            transaction_ref=order_in.initial_payment.transaction_ref,
            notes=order_in.initial_payment.notes,
            recorded_by=current_user.id
        )
        db.add(payment)
        order.total_paid = order_in.initial_payment.amount
        order.remaining_balance = order.agreed_selling_price - order.total_paid
        if order.total_paid >= order.agreed_selling_price:
            order.payment_status = "FULLY_PAID"
        elif order.total_paid > Decimal("0.00"):
            order.payment_status = "PARTIALLY_PAID"

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="ORDERS",
        record_id=order.id,
        new_value={"order_id": order.order_id, "price": str(order.agreed_selling_price)},
        remarks=f"Created order {order.order_id}"
    )

    db.commit()
    db.refresh(order)

    res = OrderResponse.from_orm(order)
    res.customer_name = customer.name
    res.customer_phone = customer.phone
    return res

@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.order_status
    order.order_status = status_update.order_status
    if status_update.notes:
        existing_notes = order.production_notes or ""
        order.production_notes = f"{existing_notes}\n[{datetime.utcnow().strftime('%d-%m-%Y %H:%M')}] Status -> {status_update.order_status}: {status_update.notes}".strip()

    log_audit(
        db=db,
        user=current_user,
        action="STATUS_CHANGE",
        module="ORDERS",
        record_id=order.id,
        previous_value={"status": old_status},
        new_value={"status": order.order_status},
        remarks=f"Status changed from {old_status} to {order.order_status}"
    )
    db.commit()
    db.refresh(order)

    res = OrderResponse.from_orm(order)
    res.customer_name = order.customer.name if order.customer else None
    res.customer_phone = order.customer.phone if order.customer else None
    return res

@router.post("/{order_id}/payments", response_model=OrderPaymentResponse)
def record_order_payment(
    order_id: str,
    pay_in: OrderPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if pay_in.amount <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero")

    # Duplicate payment prevention: check if same amount with same transaction_ref exists
    if pay_in.transaction_ref:
        dup = db.query(OrderPayment).filter(
            OrderPayment.order_id == order.id,
            OrderPayment.transaction_ref == pay_in.transaction_ref.strip()
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Duplicate payment detected with this transaction reference")

    pay_code = generate_payment_code(db, order.order_id)
    payment = OrderPayment(
        order_id=order.id,
        payment_code=pay_code,
        amount=pay_in.amount,
        payment_date=pay_in.payment_date or datetime.utcnow(),
        payment_method=pay_in.payment_method,
        transaction_ref=pay_in.transaction_ref,
        notes=pay_in.notes,
        recorded_by=current_user.id
    )
    db.add(payment)

    # Recalculate total paid & balance
    db.flush()
    all_payments = db.query(OrderPayment).filter(OrderPayment.order_id == order.id).all()
    total_paid = sum((p.amount for p in all_payments), Decimal("0.00"))
    order.total_paid = total_paid
    order.remaining_balance = order.agreed_selling_price - total_paid

    if total_paid >= order.agreed_selling_price:
        order.payment_status = "FULLY_PAID"
    elif total_paid > Decimal("0.00"):
        order.payment_status = "PARTIALLY_PAID"
    else:
        order.payment_status = "UNPAID"

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="PAYMENTS",
        record_id=payment.id,
        new_value={"order_id": order.order_id, "amount": str(payment.amount), "method": payment.payment_method},
        remarks=f"Payment of ₹{payment.amount} recorded for {order.order_id}"
    )
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/{order_id}/reconcile-consumption")
def reconcile_actual_consumption(
    order_id: str,
    reconcile_in: OrderReconcileActualConsumption,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    p_item = db.query(OrderProductionItem).filter(
        OrderProductionItem.id == reconcile_in.production_item_id,
        OrderProductionItem.order_id == order.id
    ).first()
    if not p_item:
        raise HTTPException(status_code=404, detail="Production item not found on this order")

    old_actual = p_item.actual_consumed_grams
    est_grams = p_item.total_estimated_grams
    new_actual = reconcile_in.actual_consumed_grams

    # Calculate difference between what was already deducted and new actual
    # If this is the first reconciliation, previously deducted was estimated grams
    previously_deducted = old_actual if old_actual is not None else est_grams
    diff = new_actual - previously_deducted

    p_item.actual_consumed_grams = new_actual
    if reconcile_in.notes:
        p_item.notes = f"{p_item.notes or ''} [Reconcile: {new_actual}g] {reconcile_in.notes}".strip()

    # Adjust stock: if diff > 0, we used more than estimated, so deduct diff; if diff < 0, add back abs(diff)
    if diff != Decimal("0.00"):
        inv_item = db.query(InventoryItem).filter(
            InventoryItem.material_type == p_item.material_type,
            InventoryItem.is_active == True
        ).first()
        if inv_item:
            prev_stock = inv_item.current_stock_grams
            new_stock = prev_stock - diff
            inv_item.current_stock_grams = new_stock

            movement = InventoryMovement(
                inventory_item_id=inv_item.id,
                movement_type="ORDER_RECONCILE",
                quantity_grams=-diff,
                previous_stock_grams=prev_stock,
                new_stock_grams=new_stock,
                reference_type="ORDER",
                reference_id=order.order_id,
                reason=f"Actual consumption reconciliation for {order.order_id} ({prev_stock}g -> {new_stock}g)",
                performed_by=current_user.id
            )
            db.add(movement)

    log_audit(
        db=db,
        user=current_user,
        action="UPDATE",
        module="INVENTORY",
        record_id=p_item.id,
        previous_value={"consumed": str(previously_deducted)},
        new_value={"consumed": str(new_actual), "adjustment": str(-diff)},
        remarks=f"Reconciled material consumption for order {order.order_id}"
    )

    db.commit()
    return {
        "message": "Consumption reconciled successfully",
        "previous_grams": previously_deducted,
        "actual_consumed_grams": new_actual,
        "stock_adjustment_grams": -diff
    }

@router.delete("/{order_id}")
def delete_order(
    order_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order_code = order.order_id
    db.delete(order)
    log_audit(
        db=db,
        user=admin,
        action="DELETE",
        module="ORDERS",
        record_id=order_code,
        remarks=f"Deleted order {order_code}"
    )
    db.commit()
    return {"message": f"Order {order_code} successfully deleted"}

def _build_invoice_payload(order: Order) -> dict:
    # Build line items
    items = []
    if order.designing_required and order.designing_cost > 0:
        items.append({
            "description": f"Designing ({order.model_name})",
            "qty": "1 job",
            "price": order.designing_cost,
            "total": order.designing_cost
        })

    printing_price = order.agreed_selling_price - (order.designing_cost if order.designing_required else Decimal("0.00"))
    if printing_price <= Decimal("0.00"):
        printing_price = order.agreed_selling_price

    items.append({
        "description": f"Printing({order.model_name})",
        "qty": f"{order.quantity} pcs" if order.quantity > 1 else "1 job",
        "price": printing_price,
        "total": printing_price
    })

    # Calculations
    subtotal = order.taxable_value if order.gst_applicable and order.taxable_value > 0 else order.agreed_selling_price
    gst_val = (order.cgst_amount + order.sgst_amount + order.igst_amount) if order.gst_applicable else Decimal("0.00")
    total_val = subtotal + gst_val
    courier_val = order.courier_charge
    grand_total = total_val + courier_val

    cust = order.customer
    inv_no = order.invoice_number or f"VOM{order.order_date.strftime('%Y%m')}{order.order_id[-3:] if len(order.order_id) >= 3 else '001'}"

    return {
        "order_id": order.order_id,
        "company_name": "VEOMA LABS",
        "company_gstin": "33HGMPK9319D1Z7",
        "company_address": "97, Kundalakeshi street, Camp road, Tambaram",
        "account_no": "282101000006844",
        "account_name": "GOKUL K",
        "branch_name": "SELAIYUR, IOB",
        "phone": "+91 70101 77745",
        "email": "layercraft3dprint@gmail.com",
        "signatory_name": "GOKUL KITTUSAMY",
        "signatory_title": "Founder & CEO",
        "notice": "***Seperate shipping charges will be applicable",
        "invoice_no": inv_no,
        "invoice_date": order.order_date.strftime("%d/%m/%Y"),
        "customer_name": (cust.name if cust else order.customer_name).upper(),
        "customer_address": (cust.address if cust and cust.address else (order.place_of_supply or "Tamil Nadu")).upper(),
        "customer_gstin": cust.gstin if cust and cust.gstin else None,
        "items": items,
        "subtotal": subtotal,
        "gst": gst_val,
        "total": total_val,
        "courier_charge": courier_val,
        "grand_total": grand_total
    }

@router.get("/{order_id}/invoice-data")
def get_order_invoice_data(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payload = _build_invoice_payload(order)
    # Convert Decimals to floats for JSON serialization
    payload["subtotal"] = float(payload["subtotal"])
    payload["gst"] = float(payload["gst"])
    payload["total"] = float(payload["total"])
    payload["courier_charge"] = float(payload["courier_charge"])
    payload["grand_total"] = float(payload["grand_total"])
    for itm in payload["items"]:
        itm["price"] = float(itm["price"])
        itm["total"] = float(itm["total"])
    return payload

@router.get("/{order_id}/invoice-pdf")
def download_order_invoice_pdf(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter((Order.id == order_id) | (Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    payload = _build_invoice_payload(order)
    pdf_stream = generate_invoice_pdf(payload)

    filename = f"Invoice_{payload['invoice_no']}.pdf"
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )
