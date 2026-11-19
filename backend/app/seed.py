import os
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import (
    User, Printer, MaterialRate, ExpenseCategory, CompanySetting, InventoryItem
)
from .auth import get_password_hash, log_audit
from .config import (
    DEFAULT_MATERIAL_RATES, DEFAULT_MONTHLY_RENT, DEFAULT_WASTAGE_PCT,
    COMPANY_NAME, COMPANY_GSTIN, SUPPLIER_STATE, CURRENCY, TIMEZONE
)

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_data(db: Session):
    # 1. Seed Initial Users (Super Admin, Sub Admin 1, Sub Admin 2)
    super_admin_pwd = os.getenv("SUPERADMIN_PASSWORD", "Veoma@Admin2026")
    sub1_pwd = os.getenv("SUBADMIN1_PASSWORD", "SubAdmin1@2026")
    sub2_pwd = os.getenv("SUBADMIN2_PASSWORD", "SubAdmin2@2026")

    existing_users = {u.username: u for u in db.query(User).all()}

    if "admin" not in existing_users:
        admin = User(
            username="admin",
            email="admin@veomalabs.com",
            full_name="Veoma Super Admin",
            role="SUPER_ADMIN",
            permissions={
                "can_view_profits": True,
                "can_view_salaries": True,
                "can_view_gst": True,
                "can_manage_users": True,
                "can_delete_financials": True,
                "can_manage_inventory": True,
                "can_manage_workshops": True,
                "can_backup_database": True
            },
            password_hash=get_password_hash(super_admin_pwd),
            is_active=True
        )
        db.add(admin)
        print("-> Created Super Admin account: admin")

    if "subadmin1" not in existing_users:
        sub1 = User(
            username="subadmin1",
            email="subadmin1@veomalabs.com",
            full_name="Operations Sub Admin 1",
            role="SUB_ADMIN",
            permissions={
                "can_view_profits": False,
                "can_view_salaries": False,
                "can_view_gst": False,
                "can_manage_users": False,
                "can_delete_financials": False,
                "can_manage_inventory": True,
                "can_manage_workshops": True,
                "can_backup_database": False
            },
            password_hash=get_password_hash(sub1_pwd),
            is_active=True
        )
        db.add(sub1)
        print("-> Created Sub Admin 1 account: subadmin1")

    if "subadmin2" not in existing_users:
        sub2 = User(
            username="subadmin2",
            email="subadmin2@veomalabs.com",
            full_name="Operations Sub Admin 2",
            role="SUB_ADMIN",
            permissions={
                "can_view_profits": False,
                "can_view_salaries": False,
                "can_view_gst": False,
                "can_manage_users": False,
                "can_delete_financials": False,
                "can_manage_inventory": False,
                "can_manage_workshops": False,
                "can_backup_database": False
            },
            password_hash=get_password_hash(sub2_pwd),
            is_active=True
        )
        db.add(sub2)
        print("-> Created Sub Admin 2 account: subadmin2")

    # 2. Seed Printers
    initial_printers = [
        {"name": "Bambu Lab A1", "model": "A1 Combo", "technology": "FDM"},
        {"name": "Bambu Lab A1 Mini", "model": "A1 Mini", "technology": "FDM"},
        {"name": "Creality Ender 3 S1 Pro", "model": "Ender 3 S1 Pro", "technology": "FDM"},
        {"name": "Anycubic Photon Mono 4", "model": "Photon Mono 4", "technology": "RESIN"}
    ]
    for p in initial_printers:
        existing = db.query(Printer).filter(Printer.name == p["name"]).first()
        if not existing:
            printer = Printer(
                name=p["name"],
                model=p["model"],
                technology=p["technology"],
                status="ACTIVE",
                purchase_cost=Decimal("45000.00") if "Bambu" in p["name"] else Decimal("25000.00")
            )
            db.add(printer)
            print(f"-> Created Printer: {p['name']}")

    # 3. Seed Material Rates
    for mat_name, rate_dict in DEFAULT_MATERIAL_RATES.items():
        existing_rate = db.query(MaterialRate).filter(MaterialRate.material_type == mat_name).first()
        if not existing_rate:
            m_rate = MaterialRate(
                material_type=mat_name,
                base_rate_per_gram=rate_dict["base_rate"],
                post_processing_rate_per_gram=rate_dict["post_rate"],
                default_wastage_pct=rate_dict["wastage_pct"],
                notes=f"Confirmed rate for {mat_name}"
            )
            db.add(m_rate)

    # 4. Seed Expense Categories
    default_categories = [
        "Tea", "Food", "Travel", "Stationery", "Office Purchases",
        "Maintenance", "Internet", "Electricity", "Software Subscriptions",
        "Courier", "Packing Materials", "Workshop Expenses", "Other"
    ]
    for cat in default_categories:
        existing_cat = db.query(ExpenseCategory).filter(ExpenseCategory.name == cat).first()
        if not existing_cat:
            c = ExpenseCategory(name=cat, is_default=True, is_active=True)
            db.add(c)

    # 5. Seed Initial Filament Inventory
    initial_inventory = [
        {"material_type": "PLA", "brand": "eSUN", "colour": "Black", "stock": Decimal("2000.00")},
        {"material_type": "PLA", "brand": "eSUN", "colour": "White", "stock": Decimal("1500.00")},
        {"material_type": "ABS", "brand": "Numakers", "colour": "Grey", "stock": Decimal("1000.00")},
        {"material_type": "PETG", "brand": "eSUN", "colour": "Clear", "stock": Decimal("1000.00")},
        {"material_type": "TPU", "brand": "Sunlu", "colour": "Black", "stock": Decimal("800.00")},
    ]
    for inv in initial_inventory:
        existing_inv = db.query(InventoryItem).filter(
            InventoryItem.material_type == inv["material_type"],
            InventoryItem.colour == inv["colour"]
        ).first()
        if not existing_inv:
            item = InventoryItem(
                material_type=inv["material_type"],
                brand=inv["brand"],
                colour=inv["colour"],
                spool_weight_grams=Decimal("1000.00"),
                current_stock_grams=inv["stock"],
                min_threshold_grams=Decimal("300.00"),
                avg_cost_per_gram=Decimal("1.80")
            )
            db.add(item)

    # 6. Seed Company Settings
    settings_dict = {
        "company_name": COMPANY_NAME,
        "company_gstin": COMPANY_GSTIN,
        "supplier_state": SUPPLIER_STATE,
        "currency": CURRENCY,
        "timezone": TIMEZONE,
        "default_monthly_rent": str(DEFAULT_MONTHLY_RENT),
        "default_wastage_pct": str(DEFAULT_WASTAGE_PCT),
        "order_id_prefix": "VOM-ORD",
        "invoice_id_prefix": "VOM-INV"
    }
    for k, v in settings_dict.items():
        existing_s = db.query(CompanySetting).filter(CompanySetting.key == k).first()
        if not existing_s:
            s = CompanySetting(key=k, value=v, description=f"Default setting for {k}")
            db.add(s)

    db.commit()
    print("-> Database initialized and successfully seeded with initial configuration.")

if __name__ == "__main__":
    init_db()
    with SessionLocal() as session:
        seed_data(session)
