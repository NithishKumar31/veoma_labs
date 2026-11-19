from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional
from ..config import DEFAULT_MATERIAL_RATES, SUPPLIER_STATE

def round_money(val: Decimal) -> Decimal:
    """Rounds to 2 decimal places using standard financial round half up."""
    return Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def calculate_production_item_cost(
    material_type: str,
    model_weight_grams: Decimal,
    wastage_percentage: Decimal = Decimal("10.00"),
    post_processing_required: bool = False,
    custom_base_rate: Optional[Decimal] = None,
    custom_post_rate: Optional[Decimal] = None
) -> Dict[str, Decimal]:
    """
    Calculates material consumption and production costs based on confirmed Veoma Labs rules:
    - Wastage is applied (default 10%).
    - Base rate already includes filament, electricity, machine depreciation, labor, print time & overheads.
    - Post-processing is added only if post_processing_required is True.
    """
    mat_type = material_type.upper().strip()
    rate_info = DEFAULT_MATERIAL_RATES.get(mat_type, DEFAULT_MATERIAL_RATES["OTHER"])

    base_rate = custom_base_rate if custom_base_rate is not None else rate_info["base_rate"]
    post_rate = custom_post_rate if custom_post_rate is not None else rate_info["post_rate"]

    # Wastage calculation
    # e.g. 100g with 10% wastage -> 10g wastage -> 110g total estimated
    model_weight = Decimal(str(model_weight_grams))
    wastage_pct = Decimal(str(wastage_percentage))
    wastage_grams = model_weight * (wastage_pct / Decimal("100.0"))
    total_estimated_grams = model_weight + wastage_grams

    # Production cost = Total estimated consumption * Base rate
    production_cost = round_money(total_estimated_grams * base_rate)

    # Post processing cost = Total estimated consumption * Post rate (if enabled)
    if post_processing_required:
        post_processing_cost = round_money(total_estimated_grams * post_rate)
    else:
        post_processing_cost = Decimal("0.00")

    return {
        "model_weight_grams": round_money(model_weight),
        "wastage_percentage": round_money(wastage_pct),
        "wastage_grams": round_money(wastage_grams),
        "total_estimated_grams": round_money(total_estimated_grams),
        "base_rate_per_gram": round_money(base_rate),
        "post_processing_rate_per_gram": round_money(post_rate),
        "post_processing_required": post_processing_required,
        "production_cost": production_cost,
        "post_processing_cost": post_processing_cost,
        "item_total_cost": production_cost + post_processing_cost
    }

def calculate_order_totals(
    production_items: List[Dict[str, Any]],
    designing_required: bool,
    designing_cost: Decimal,
    courier_charge: Decimal,
    packing_cost: Decimal,
    other_direct_costs: Decimal,
    agreed_selling_price: Decimal,
    gst_applicable: bool = False,
    place_of_supply: str = SUPPLIER_STATE,
    gst_rate: Decimal = Decimal("18.00")
) -> Dict[str, Any]:
    """
    Computes total direct order cost, profit before shared business expenses,
    profit margin percentage, and GST breakdown.
    """
    base_prod_total = Decimal("0.00")
    post_proc_total = Decimal("0.00")

    for item in production_items:
        base_prod_total += Decimal(str(item.get("production_cost", "0.00")))
        post_proc_total += Decimal(str(item.get("post_processing_cost", "0.00")))

    des_cost = Decimal(str(designing_cost)) if designing_required else Decimal("0.00")
    courier = Decimal(str(courier_charge))
    packing = Decimal(str(packing_cost))
    other_costs = Decimal(str(other_direct_costs))

    total_direct_cost = round_money(
        base_prod_total + post_proc_total + des_cost + courier + packing + other_costs
    )

    price = Decimal(str(agreed_selling_price))

    # Gross Profit = Order Revenue - Total Direct Order Cost
    # Note: If GST is applicable, the agreed_selling_price is treated as taxable value,
    # or if tax is separate, taxable_value is the revenue base. GST collected is never counted as profit.
    taxable_value = price
    gross_profit = round_money(taxable_value - total_direct_cost)

    if taxable_value > Decimal("0.00"):
        profit_margin_pct = round_money((gross_profit / taxable_value) * Decimal("100.0"))
    else:
        profit_margin_pct = Decimal("0.00")

    # GST calculations
    cgst_amount = Decimal("0.00")
    sgst_amount = Decimal("0.00")
    igst_amount = Decimal("0.00")
    total_invoice_amount = taxable_value

    if gst_applicable and taxable_value > Decimal("0.00"):
        rate = Decimal(str(gst_rate))
        pos_clean = place_of_supply.strip().lower()
        is_intra_state = (pos_clean == SUPPLIER_STATE.lower() or "tamil nadu" in pos_clean or pos_clean == "33")

        if is_intra_state:
            half_rate = rate / Decimal("2.0")
            cgst_amount = round_money(taxable_value * (half_rate / Decimal("100.0")))
            sgst_amount = round_money(taxable_value * (half_rate / Decimal("100.0")))
            total_invoice_amount = taxable_value + cgst_amount + sgst_amount
        else:
            igst_amount = round_money(taxable_value * (rate / Decimal("100.0")))
            total_invoice_amount = taxable_value + igst_amount

    return {
        "base_production_cost": round_money(base_prod_total),
        "post_processing_cost": round_money(post_proc_total),
        "designing_cost": round_money(des_cost),
        "courier_charge": round_money(courier),
        "packing_cost": round_money(packing),
        "other_direct_costs": round_money(other_costs),
        "total_direct_cost": total_direct_cost,
        "taxable_value": round_money(taxable_value),
        "gross_profit": gross_profit,
        "profit_margin_pct": profit_margin_pct,
        "gst_applicable": gst_applicable,
        "place_of_supply": place_of_supply,
        "gst_rate": round_money(Decimal(str(gst_rate))),
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "igst_amount": igst_amount,
        "total_invoice_amount": round_money(total_invoice_amount),
    }

def suggest_selling_price(
    total_direct_cost: Decimal,
    target_profit_amount: Optional[Decimal] = None,
    target_profit_margin_pct: Optional[Decimal] = None
) -> Decimal:
    """
    Calculates suggested selling price based on either desired profit amount or desired margin %.
    Formula for target margin %:
      Margin % = (Revenue - Direct Cost) / Revenue
      Revenue * (1 - Margin %/100) = Direct Cost
      Revenue = Direct Cost / (1 - Margin %/100)
    """
    cost = Decimal(str(total_direct_cost))
    if target_profit_amount is not None:
        return round_money(cost + Decimal(str(target_profit_amount)))

    if target_profit_margin_pct is not None:
        margin_dec = Decimal(str(target_profit_margin_pct)) / Decimal("100.0")
        if margin_dec >= Decimal("1.0"):
            return round_money(cost * Decimal("2.0")) # Safe fallback
        return round_money(cost / (Decimal("1.0") - margin_dec))

    return cost
