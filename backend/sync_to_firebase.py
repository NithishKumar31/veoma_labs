import json
from decimal import Decimal
from datetime import datetime, date
from backend.app.database import SessionLocal
from backend.app.models.entities import Order, Customer, Printer, DailyExpense, InventoryItem

def clean_val(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v

def model_to_dict(obj):
    return {c.name: clean_val(getattr(obj, c.name)) for c in obj.__table__.columns}

with SessionLocal() as db:
    data = {
        'customers': [model_to_dict(c) for c in db.query(Customer).all()],
        'orders': [model_to_dict(o) for o in db.query(Order).all()],
        'printers': [model_to_dict(p) for p in db.query(Printer).all()],
        'expenses': [model_to_dict(e) for e in db.query(DailyExpense).all()],
        'inventory': [model_to_dict(i) for i in db.query(InventoryItem).all()]
    }
    with open('frontend/sync_data.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Exported: {len(data['customers'])} customers, {len(data['orders'])} orders, {len(data['printers'])} printers, {len(data['expenses'])} expenses")
