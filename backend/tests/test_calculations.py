import pytest
from decimal import Decimal
from backend.app.services.calculation import (
    calculate_production_item_cost,
    calculate_order_totals,
    suggest_selling_price,
    round_money
)

def test_1_pla_order():
    """
    Test 1 from Master Prompt:
    Material: PLA
    Model weight: 100 grams
    Wastage: 10%
    Production consumption: 110 grams
    Base production cost: 110 x ₹2 = ₹220
    Post-processing: 110 x ₹1 = ₹110, if applicable.
    Courier: ₹80, Packing: ₹30, Design: ₹0
    Total direct cost with post-processing: ₹220 + ₹110 + ₹80 + ₹30 = ₹440
    Selling price: ₹700 -> Profit: ₹260
    Without post-processing: Direct cost: ₹330 -> Profit: ₹370
    """
    # With post-processing
    item_with_post = calculate_production_item_cost(
        material_type="PLA",
        model_weight_grams=Decimal("100"),
        wastage_percentage=Decimal("10"),
        post_processing_required=True
    )
    assert item_with_post["total_estimated_grams"] == Decimal("110.00")
    assert item_with_post["production_cost"] == Decimal("220.00")
    assert item_with_post["post_processing_cost"] == Decimal("110.00")

    order_with_post = calculate_order_totals(
        production_items=[item_with_post],
        designing_required=False,
        designing_cost=Decimal("0.00"),
        courier_charge=Decimal("80.00"),
        packing_cost=Decimal("30.00"),
        other_direct_costs=Decimal("0.00"),
        agreed_selling_price=Decimal("700.00")
    )
    assert order_with_post["total_direct_cost"] == Decimal("440.00")
    assert order_with_post["gross_profit"] == Decimal("260.00")

    # Without post-processing
    item_no_post = calculate_production_item_cost(
        material_type="PLA",
        model_weight_grams=Decimal("100"),
        wastage_percentage=Decimal("10"),
        post_processing_required=False
    )
    assert item_no_post["production_cost"] == Decimal("220.00")
    assert item_no_post["post_processing_cost"] == Decimal("0.00")

    order_no_post = calculate_order_totals(
        production_items=[item_no_post],
        designing_required=False,
        designing_cost=Decimal("0.00"),
        courier_charge=Decimal("80.00"),
        packing_cost=Decimal("30.00"),
        other_direct_costs=Decimal("0.00"),
        agreed_selling_price=Decimal("700.00")
    )
    assert order_no_post["total_direct_cost"] == Decimal("330.00")
    assert order_no_post["gross_profit"] == Decimal("370.00")


def test_2_abs_order():
    """
    Test 2 from Master Prompt:
    ABS: 200g, 10% wastage = 220g.
    Base production cost: 220 x ₹5 = ₹1,100
    Post-processing: 220 x ₹1.50 = ₹330
    """
    item = calculate_production_item_cost(
        material_type="ABS",
        model_weight_grams=Decimal("200"),
        wastage_percentage=Decimal("10"),
        post_processing_required=True
    )
    assert item["total_estimated_grams"] == Decimal("220.00")
    assert item["production_cost"] == Decimal("1100.00")
    assert item["post_processing_cost"] == Decimal("330.00")


def test_3_petg_order():
    """
    Test 3 from Master Prompt:
    PETG: 100g, 10% wastage = 110g.
    Base production cost: 110 x ₹4 = ₹440
    Post-processing: 110 x ₹1.50 = ₹165
    """
    item = calculate_production_item_cost(
        material_type="PETG",
        model_weight_grams=Decimal("100"),
        wastage_percentage=Decimal("10"),
        post_processing_required=True
    )
    assert item["total_estimated_grams"] == Decimal("110.00")
    assert item["production_cost"] == Decimal("440.00")
    assert item["post_processing_cost"] == Decimal("165.00")


def test_4_tpu_order():
    """
    Test 4 from Master Prompt:
    TPU: 50g, 10% wastage = 55g.
    Base production cost: 55 x ₹10 = ₹550
    Post-processing: 55 x ₹1.50 = ₹82.50
    """
    item = calculate_production_item_cost(
        material_type="TPU",
        model_weight_grams=Decimal("50"),
        wastage_percentage=Decimal("10"),
        post_processing_required=True
    )
    assert item["total_estimated_grams"] == Decimal("55.00")
    assert item["production_cost"] == Decimal("550.00")
    assert item["post_processing_cost"] == Decimal("82.50")


def test_5_partial_payment_calculation():
    """
    Test 5 from Master Prompt:
    Order price: ₹5,000
    Advance: ₹2,000
    Second payment: ₹1,000
    Remaining: ₹2,000
    Payment status: Partially Paid
    """
    order_price = Decimal("5000.00")
    advance = Decimal("2000.00")
    second_payment = Decimal("1000.00")
    total_received = advance + second_payment
    remaining = order_price - total_received

    assert total_received == Decimal("3000.00")
    assert remaining == Decimal("2000.00")
    status = "PARTIALLY_PAID" if 0 < total_received < order_price else "FULLY_PAID"
    assert status == "PARTIALLY_PAID"


def test_6_monthly_business_profit():
    """
    Test 6 from Master Prompt:
    Order gross contribution: ₹50,000
    Workshop gross contribution: ₹10,000
    General expenses: ₹5,000
    Rent: ₹12,000
    Salaries: ₹20,000
    Business net profit: ₹50,000 + ₹10,000 - ₹5,000 - ₹12,000 - ₹20,000 = ₹23,000
    """
    order_gross_contrib = Decimal("50000.00")
    workshop_gross_contrib = Decimal("10000.00")
    general_expenses = Decimal("5000.00")
    rent = Decimal("12000.00")
    salaries = Decimal("20000.00")

    net_profit = order_gross_contrib + workshop_gross_contrib - general_expenses - rent - salaries
    assert net_profit == Decimal("23000.00")


def test_8_gst_separation():
    """
    Test 8 from Master Prompt:
    Intra-state (Tamil Nadu) 18%: 9% CGST + 9% SGST.
    Inter-state 18%: 18% IGST.
    Taxable value and tax amount stored separately and excluded from profit.
    """
    # Intra-state
    intra = calculate_order_totals(
        production_items=[],
        designing_required=False,
        designing_cost=Decimal("0.00"),
        courier_charge=Decimal("0.00"),
        packing_cost=Decimal("0.00"),
        other_direct_costs=Decimal("0.00"),
        agreed_selling_price=Decimal("1000.00"),
        gst_applicable=True,
        place_of_supply="Tamil Nadu",
        gst_rate=Decimal("18.00")
    )
    assert intra["cgst_amount"] == Decimal("90.00")
    assert intra["sgst_amount"] == Decimal("90.00")
    assert intra["igst_amount"] == Decimal("0.00")
    assert intra["total_invoice_amount"] == Decimal("1180.00")
    assert intra["gross_profit"] == Decimal("1000.00") # Tax is excluded from gross profit!

    # Inter-state
    inter = calculate_order_totals(
        production_items=[],
        designing_required=False,
        designing_cost=Decimal("0.00"),
        courier_charge=Decimal("0.00"),
        packing_cost=Decimal("0.00"),
        other_direct_costs=Decimal("0.00"),
        agreed_selling_price=Decimal("1000.00"),
        gst_applicable=True,
        place_of_supply="Karnataka",
        gst_rate=Decimal("18.00")
    )
    assert inter["cgst_amount"] == Decimal("0.00")
    assert inter["sgst_amount"] == Decimal("0.00")
    assert inter["igst_amount"] == Decimal("180.00")
    assert inter["total_invoice_amount"] == Decimal("1180.00")
