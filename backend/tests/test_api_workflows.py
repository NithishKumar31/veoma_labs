import pytest
from decimal import Decimal
from datetime import datetime
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import Order, Customer, DailyExpense, RentRecord, InventoryItem, Workshop

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login():
    # Login with Super Admin
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Veoma@Admin2026"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "SUPER_ADMIN"

    # Login with Sub Admin 1
    res_sub = client.post("/api/auth/login", json={"username": "subadmin1", "password": "SubAdmin1@2026"})
    assert res_sub.status_code == 200
    assert res_sub.json()["user"]["role"] == "SUB_ADMIN"

def test_full_business_workflow():
    # 1. Login as Super Admin
    login_res = client.post("/api/auth/login", json={"username": "admin", "password": "Veoma@Admin2026"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Price suggestion check (Test 1 scenario: PLA 100g, 10% wastage -> 110g, base ₹2 = ₹220, post ₹1 = ₹110, courier ₹80, packing ₹30)
    suggest_res = client.post("/api/orders/suggest-price", headers=headers, json={
        "production_items": [{
            "material_type": "PLA",
            "model_weight_grams": 100,
            "wastage_percentage": 10,
            "post_processing_required": True
        }],
        "designing_required": False,
        "designing_cost": 0,
        "courier_charge": 80,
        "packing_cost": 30,
        "other_direct_costs": 0,
        "target_profit_amount": 260
    })
    assert suggest_res.status_code == 200
    s_data = suggest_res.json()
    assert Decimal(str(s_data["total_direct_cost"])) == Decimal("440.00")
    assert Decimal(str(s_data["suggested_selling_price"])) == Decimal("700.00")
    assert Decimal(str(s_data["estimated_profit"])) == Decimal("260.00")

    # 3. Create a Customer
    cust_res = client.post("/api/customers", headers=headers, json={
        "name": "Karthik Raja",
        "phone": "9876543210",
        "email": "karthik@example.com",
        "address": "Coimbatore, Tamil Nadu",
        "customer_type": "BUSINESS"
    })
    assert cust_res.status_code == 200
    cust_id = cust_res.json()["id"]

    # 4. Check initial PLA inventory stock
    inv_res = client.get("/api/inventory?material_type=PLA", headers=headers)
    pla_item = inv_res.json()[0]
    initial_stock = Decimal(str(pla_item["current_stock_grams"]))

    # 5. Create Order with partial payment (Test 5: Order price ₹5000, advance ₹2000)
    order_res = client.post("/api/orders", headers=headers, json={
        "customer_id": cust_id,
        "model_name": "Industrial Prototype Bracket",
        "quantity": 1,
        "designing_required": True,
        "designing_cost": 500,
        "courier_charge": 150,
        "packing_cost": 50,
        "other_direct_costs": 0,
        "production_items": [{
            "material_type": "PLA",
            "model_weight_grams": 100,
            "wastage_percentage": 10,
            "post_processing_required": True
        }],
        "agreed_selling_price": 5000,
        "gst_applicable": True,
        "place_of_supply": "Tamil Nadu",
        "gst_rate": 18,
        "initial_payment": {
            "amount": 2000,
            "payment_method": "UPI",
            "transaction_ref": "UPI123456789",
            "notes": "Advance payment"
        }
    })
    assert order_res.status_code == 200
    ord_data = order_res.json()
    order_id = ord_data["id"]

    assert Decimal(str(ord_data["total_paid"])) == Decimal("2000.00")
    assert Decimal(str(ord_data["remaining_balance"])) == Decimal("3000.00")
    assert ord_data["payment_status"] == "PARTIALLY_PAID"
    assert ord_data["gst_applicable"] is True
    # Taxable value ₹5000 -> 9% CGST (₹450) + 9% SGST (₹450)
    assert Decimal(str(ord_data["cgst_amount"])) == Decimal("450.00")
    assert Decimal(str(ord_data["sgst_amount"])) == Decimal("450.00")
    assert Decimal(str(ord_data["igst_amount"])) == Decimal("0.00")
    assert Decimal(str(ord_data["total_invoice_amount"])) == Decimal("5900.00")

    # 6. Verify inventory was automatically deducted by 110g (including 10% wastage)
    inv_after = client.get("/api/inventory?material_type=PLA", headers=headers).json()[0]
    new_stock = Decimal(str(inv_after["current_stock_grams"]))
    assert initial_stock - new_stock == Decimal("110.00")

    # 7. Record 2nd payment of ₹1000 (Test 5: advance ₹2000 + 2nd ₹1000 => ₹3000 received, ₹2000 remaining)
    pay_res = client.post(f"/api/orders/{order_id}/payments", headers=headers, json={
        "amount": 1000,
        "payment_method": "BANK_TRANSFER",
        "transaction_ref": "IMPS987654321",
        "notes": "Second tranche"
    })
    assert pay_res.status_code == 200

    order_check = client.get(f"/api/orders/{order_id}", headers=headers).json()
    assert Decimal(str(order_check["total_paid"])) == Decimal("3000.00")
    assert Decimal(str(order_check["remaining_balance"])) == Decimal("2000.00")
    assert order_check["payment_status"] == "PARTIALLY_PAID"

    # 8. Test duplicate payment prevention
    dup_res = client.post(f"/api/orders/{order_id}/payments", headers=headers, json={
        "amount": 1000,
        "payment_method": "BANK_TRANSFER",
        "transaction_ref": "IMPS987654321"
    })
    assert dup_res.status_code == 400
    assert "Duplicate payment detected" in dup_res.json()["detail"]

    # 9. Test actual consumption reconciliation (Test 7)
    prod_item_id = ord_data["production_items"][0]["id"]
    # Suppose actual model used was 120g instead of 110g (diff = +10g)
    reconcile_res = client.post(f"/api/orders/{order_id}/reconcile-consumption", headers=headers, json={
        "production_item_id": prod_item_id,
        "actual_consumed_grams": 120,
        "notes": "Calibration test print used slightly more support"
    })
    assert reconcile_res.status_code == 200
    assert Decimal(str(reconcile_res.json()["stock_adjustment_grams"])) == Decimal("-10.00")

    # 10. Record Daily Business Expense
    exp_res = client.post("/api/expenses", headers=headers, json={
        "category": "Office Purchases",
        "description": "3D printer nozzle pack and cleaner",
        "amount": 450,
        "payment_method": "UPI",
        "paid_by": "Company Account"
    })
    assert exp_res.status_code == 200
    assert Decimal(str(exp_res.json()["amount"])) == Decimal("450.00")

    # 11. Test Fixed Monthly Rent Duplicate Prevention
    month_str = f"2099-{datetime.utcnow().strftime('%M%S')[-2:]}"
    # Delete test month if exists
    with SessionLocal() as db:
        db.query(RentRecord).filter(RentRecord.rent_month == month_str).delete()
        db.commit()

    # First rent entry should succeed
    rent_res = client.post("/api/finance/rent", headers=headers, json={
        "rent_month": month_str,
        "amount": 12000,
        "payment_method": "BANK_TRANSFER",
        "paid_to": "Commercial Space Landlord"
    })
    assert rent_res.status_code == 200

    # Duplicate rent entry for same month must be rejected!
    rent_dup_res = client.post("/api/finance/rent", headers=headers, json={
        "rent_month": month_str,
        "amount": 12000
    })
    assert rent_dup_res.status_code == 400
    assert "Duplicate rent entries are prohibited" in rent_dup_res.json()["detail"]

    # 12. Test Workshop Creation & Isolated Profit
    ws_res = client.post("/api/workshops", headers=headers, json={
        "name": "Hands-on 3D Printing Masterclass",
        "category": "3D_PRINTING",
        "start_date": datetime.utcnow().isoformat(),
        "location": "Veoma Innovation Center, Chennai",
        "trainer_name": "R. Selvam",
        "registration_fee": 1500,
        "target_participants": 10
    })
    assert ws_res.status_code == 200
    ws_id = ws_res.json()["id"]

    # Add 2 participants (₹1500 x 2 = ₹3000)
    client.post(f"/api/workshops/{ws_id}/participants", headers=headers, json={
        "participant_name": "Arun Kumar",
        "phone": "9840123456",
        "fee_agreed": 1500,
        "amount_paid": 1500
    })
    client.post(f"/api/workshops/{ws_id}/participants", headers=headers, json={
        "participant_name": "Deepa Sundaram",
        "phone": "9840654321",
        "fee_agreed": 1500,
        "amount_paid": 1500
    })

    # Add workshop expense (refreshments ₹500)
    client.post(f"/api/workshops/{ws_id}/expenses", headers=headers, json={
        "category": "REFRESHMENTS",
        "description": "Snacks and tea for attendees",
        "amount": 500,
        "payment_method": "UPI"
    })

    # Verify workshop profit: ₹3000 - ₹500 = ₹2500
    ws_check = client.get(f"/api/workshops/{ws_id}", headers=headers).json()
    assert Decimal(str(ws_check["total_revenue"])) == Decimal("3000.00")
    assert Decimal(str(ws_check["total_expenses"])) == Decimal("500.00")
    assert Decimal(str(ws_check["net_profit"])) == Decimal("2500.00")

    # 13. Test GST Sales Register (verifying order appears with proper tax breakdown)
    gst_res = client.get("/api/gst/sales-register", headers=headers)
    assert gst_res.status_code == 200
    gst_data = gst_res.json()
    assert gst_data["total_invoices_count"] >= 1
    assert Decimal(str(gst_data["total_taxable_value"])) >= Decimal("5000.00")

    # 14. Test Database Backup Creation
    backup_res = client.post("/api/backup/create", headers=headers)
    assert backup_res.status_code == 200
    assert "veoma_backup_" in backup_res.json()["filename"]

    # 15. Test Sub Admin access control restrictions
    sub_login = client.post("/api/auth/login", json={"username": "subadmin2", "password": "SubAdmin2@2026"})
    sub_token = sub_login.json()["access_token"]
    sub_headers = {"Authorization": f"Bearer {sub_token}"}

    # Sub Admin 2 must be blocked (403) from Salaries
    sub_salary_res = client.get("/api/finance/salaries", headers=sub_headers)
    assert sub_salary_res.status_code == 403

    # Sub Admin 2 must be blocked (403) from User Management
    sub_users_res = client.get("/api/users", headers=sub_headers)
    assert sub_users_res.status_code == 403

    # Sub Admin 2 must be blocked (403) from Rent Records
    sub_rent_res = client.get("/api/finance/rent", headers=sub_headers)
    assert sub_rent_res.status_code == 403

    # Sub Admin 2 must be blocked (403) from GST Register
    sub_gst_res = client.get("/api/gst/sales-register", headers=sub_headers)
    assert sub_gst_res.status_code == 403
