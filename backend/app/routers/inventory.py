from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import InventoryItem, InventoryPurchase, InventoryMovement, User
from ..schemas import (
    InventoryItemCreate, InventoryItemResponse, InventoryPurchaseCreate,
    StockAdjustmentCreate, InventoryMovementResponse
)
from ..auth import get_current_user, check_permission, log_audit, require_super_admin
from ..services.calculation import round_money

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Filaments"])

@router.get("", response_model=List[InventoryItemResponse])
def list_inventory_items(
    material_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryItem).filter(InventoryItem.is_active == True)
    if material_type:
        query = query.filter(InventoryItem.material_type == material_type.upper().strip())
    return query.order_by(InventoryItem.material_type, InventoryItem.colour).all()

@router.get("/low-stock", response_model=List[InventoryItemResponse])
def list_low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(InventoryItem).filter(
        InventoryItem.is_active == True,
        InventoryItem.current_stock_grams <= InventoryItem.min_threshold_grams
    ).all()

@router.post("/items", response_model=InventoryItemResponse)
def create_inventory_item(
    item_in: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("can_manage_inventory"))
):
    item = InventoryItem(
        material_type=item_in.material_type.upper().strip(),
        brand=item_in.brand.strip(),
        colour=item_in.colour.strip(),
        spool_weight_grams=item_in.spool_weight_grams,
        current_stock_grams=item_in.initial_stock_grams,
        min_threshold_grams=item_in.min_threshold_grams,
        avg_cost_per_gram=item_in.avg_cost_per_gram,
        is_active=True
    )
    db.add(item)
    db.flush()

    if item_in.initial_stock_grams > Decimal("0.00"):
        movement = InventoryMovement(
            inventory_item_id=item.id,
            movement_type="MANUAL_ADD",
            quantity_grams=item_in.initial_stock_grams,
            previous_stock_grams=Decimal("0.00"),
            new_stock_grams=item_in.initial_stock_grams,
            reference_type="MANUAL_ADJUSTMENT",
            reason="Initial stock setup",
            performed_by=current_user.id
        )
        db.add(movement)

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="INVENTORY",
        record_id=item.id,
        new_value={"material": item.material_type, "colour": item.colour, "stock": str(item.current_stock_grams)},
        remarks=f"Added inventory item {item.material_type} {item.colour}"
    )
    db.commit()
    db.refresh(item)
    return item

@router.post("/purchases")
def record_purchase(
    purchase_in: InventoryPurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("can_manage_inventory"))
):
    total_weight = purchase_in.spool_weight_grams * Decimal(str(purchase_in.quantity_spools))
    cost_per_gram = round_money(purchase_in.purchase_price / total_weight) if total_weight > 0 else Decimal("0.00")

    purchase = InventoryPurchase(
        purchase_date=purchase_in.purchase_date or datetime.utcnow(),
        supplier=purchase_in.supplier.strip(),
        brand=purchase_in.brand.strip(),
        material_type=purchase_in.material_type.upper().strip(),
        colour=purchase_in.colour.strip(),
        spool_weight_grams=purchase_in.spool_weight_grams,
        quantity_spools=purchase_in.quantity_spools,
        total_weight_grams=total_weight,
        purchase_price=purchase_in.purchase_price,
        cost_per_gram=cost_per_gram,
        invoice_ref=purchase_in.invoice_ref,
        notes=purchase_in.notes,
        created_by=current_user.id
    )
    db.add(purchase)

    # Find or create corresponding InventoryItem
    item = db.query(InventoryItem).filter(
        InventoryItem.material_type == purchase.material_type,
        InventoryItem.colour == purchase.colour,
        InventoryItem.brand == purchase.brand,
        InventoryItem.is_active == True
    ).first()

    if not item:
        item = InventoryItem(
            material_type=purchase.material_type,
            brand=purchase.brand,
            colour=purchase.colour,
            spool_weight_grams=purchase.spool_weight_grams,
            current_stock_grams=Decimal("0.00"),
            min_threshold_grams=Decimal("300.00"),
            avg_cost_per_gram=cost_per_gram
        )
        db.add(item)
        db.flush()

    prev_stock = item.current_stock_grams
    new_stock = prev_stock + total_weight
    item.current_stock_grams = new_stock
    item.avg_cost_per_gram = cost_per_gram

    movement = InventoryMovement(
        inventory_item_id=item.id,
        movement_type="PURCHASE",
        quantity_grams=total_weight,
        previous_stock_grams=prev_stock,
        new_stock_grams=new_stock,
        reference_type="PURCHASE",
        reference_id=purchase.id,
        reason=f"Purchase from {purchase.supplier} ({purchase.quantity_spools} spools)",
        performed_by=current_user.id
    )
    db.add(movement)

    log_audit(
        db=db,
        user=current_user,
        action="CREATE",
        module="INVENTORY",
        record_id=purchase.id,
        new_value={"supplier": purchase.supplier, "material": purchase.material_type, "weight": str(total_weight)},
        remarks=f"Recorded filament purchase of {total_weight}g {purchase.material_type}"
    )
    db.commit()
    return {"message": "Purchase recorded successfully", "purchase_id": purchase.id, "new_stock_grams": new_stock}

@router.post("/adjustments")
def manual_stock_adjustment(
    adj: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("can_manage_inventory"))
):
    item = db.query(InventoryItem).filter(InventoryItem.id == adj.inventory_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if adj.quantity_grams <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Adjustment quantity must be greater than zero")

    prev_stock = item.current_stock_grams
    if adj.adjustment_type == "MANUAL_ADD":
        qty = adj.quantity_grams
        new_stock = prev_stock + qty
    elif adj.adjustment_type == "MANUAL_REDUCE":
        qty = -adj.quantity_grams
        new_stock = prev_stock - adj.quantity_grams
    else:
        raise HTTPException(status_code=400, detail="Invalid adjustment type. Use MANUAL_ADD or MANUAL_REDUCE")

    item.current_stock_grams = new_stock

    movement = InventoryMovement(
        inventory_item_id=item.id,
        movement_type=adj.adjustment_type,
        quantity_grams=qty,
        previous_stock_grams=prev_stock,
        new_stock_grams=new_stock,
        reference_type="MANUAL_ADJUSTMENT",
        reason=adj.reason,
        performed_by=current_user.id
    )
    db.add(movement)

    log_audit(
        db=db,
        user=current_user,
        action="UPDATE",
        module="INVENTORY",
        record_id=item.id,
        previous_value={"stock": str(prev_stock)},
        new_value={"stock": str(new_stock), "adjustment": str(qty)},
        remarks=f"Stock adjusted ({adj.adjustment_type}): {adj.reason}"
    )
    db.commit()
    return {"message": "Stock adjusted successfully", "previous_stock": prev_stock, "new_stock": new_stock}

@router.get("/movements", response_model=List[InventoryMovementResponse])
def list_movements(
    item_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InventoryMovement)
    if item_id:
        query = query.filter(InventoryMovement.inventory_item_id == item_id)
    return query.order_by(InventoryMovement.created_at.desc()).limit(limit).all()
