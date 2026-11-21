import os
from decimal import Decimal
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent.parent

# Database configuration
# Supports PostgreSQL (e.g. postgresql+pg8000://...) and SQLite with foreign keys
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'veoma_business.db'}")

# Security
SECRET_KEY = os.getenv("SECRET_KEY", "veoma-labs-super-secure-production-key-2026-chennai-tamilnadu")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours

# Company Localization & Defaults
COMPANY_NAME = "Veoma Labs"
COMPANY_TAGLINE = "3D Printing, Designing, Scanning & Technical Training"
COMPANY_LOCATION = "Tamil Nadu, India"
SUPPLIER_STATE = "Tamil Nadu"
SUPPLIER_STATE_CODE = "33"
COMPANY_GSTIN = os.getenv("COMPANY_GSTIN", "33ABCDE1234F1Z5")
CURRENCY = "INR"
CURRENCY_SYMBOL = "₹"
TIMEZONE = "Asia/Kolkata"

DEFAULT_MONTHLY_RENT = Decimal("12000.00")
DEFAULT_WASTAGE_PCT = Decimal("10.00")

# Material Base Production Rates per gram (Includes filament, electricity, machine depreciation, labor, print time & overheads)
DEFAULT_MATERIAL_RATES = {
    "PLA": {"base_rate": Decimal("2.00"), "post_rate": Decimal("1.00"), "wastage_pct": Decimal("10.00")},
    "ABS": {"base_rate": Decimal("5.00"), "post_rate": Decimal("1.50"), "wastage_pct": Decimal("10.00")},
    "PETG": {"base_rate": Decimal("4.00"), "post_rate": Decimal("1.50"), "wastage_pct": Decimal("10.00")},
    "TPU": {"base_rate": Decimal("10.00"), "post_rate": Decimal("1.50"), "wastage_pct": Decimal("10.00")},
    "RESIN": {"base_rate": Decimal("8.00"), "post_rate": Decimal("2.00"), "wastage_pct": Decimal("10.00")},
    "OTHER": {"base_rate": Decimal("5.00"), "post_rate": Decimal("1.50"), "wastage_pct": Decimal("10.00")},
}

# Directories
UPLOAD_DIR = BASE_DIR / "uploads"
BACKUP_DIR = BASE_DIR / "backups"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)
