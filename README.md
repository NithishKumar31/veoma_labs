# VEOMA LABS — BUSINESS MANAGEMENT SYSTEM

Production-ready, database-backed enterprise business management web application designed and built for **Veoma Labs**, Tamil Nadu, India.

---

## 1. Overview & Business Activities

Veoma Labs is a full-service additive manufacturing, 3D design, 3D scanning, and technical training center based in Tamil Nadu, India. This application provides unified management of the entire business lifecycle:
- **3D Printing Operations**: FDM and Resin 3D printing, custom and bulk orders, prototyping.
- **3D Designing & Modeling**: Parametric CAD modeling, reverse engineering, design service costing.
- **3D Scanning & Inspection**: High-precision scanning services and workshops.
- **Technical Workshops**: 3D printing, CAD designing, and 3D scanning masterclasses with attendee registration and isolated profitability tracking.
- **Financial & GST Accounting**: Intra-State (Tamil Nadu 9% CGST + 9% SGST) and Inter-State (18% IGST) separation, daily operational expense logging, fixed office rent, employee salaries, and true company Net Business Profit analysis.
- **Inventory & Machines**: Filament stock tracking (PLA, ABS, PETG, TPU, Resin) with automated 10% wastage deduction, actual print consumption reconciliation, machine registry, and maintenance schedules.

---

## 2. Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide-React icons, Recharts for analytics, and client-side helpers.
- **Backend**: Python 3.15 FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2 validation models.
- **Database**: PostgreSQL (via `pg8000` or standard Postgres driver) with automated SQLite dual-compatibility for zero-setup execution. Strictly uses exact `Numeric(12, 2)` decimal columns for all financial figures (never floating-point approximations).
- **Authentication**: JWT Bearer tokens with Cryptographic PBKDF2-SHA256 password hashing.
- **Exports**: OpenPyXL for native Excel `.xlsx` spreadsheets and ReportLab for PDF reports.
- **Backup System**: Point-in-time online database backups with audit trail.

---

## 3. Financial Calculation Rules & Confirmed Formulas

### Production Cost Calculation Engine
- **Confirmed Material Base Rates**:
  - PLA: ₹2.00 / gram
  - ABS: ₹5.00 / gram
  - PETG: ₹4.00 / gram
  - TPU: ₹10.00 / gram
  - Resin: ₹8.00 / gram
  - *Note: These base rates already include filament, machine depreciation/usage, electricity, manual labor, print time, and general overhead. They are never double-counted.*
- **Post-Processing Rates** (applied only if Post-Processing is Required):
  - PLA: ₹1.00 / gram
  - ABS: ₹1.50 / gram
  - PETG: ₹1.50 / gram
  - TPU: ₹1.50 / gram
- **Wastage Allowance**: Default 10% (0.10).
  $$\text{Total Estimated Consumption} = \text{Model Weight} \times 1.10$$
  $$\text{Base Production Cost} = \text{Total Estimated Consumption} \times \text{Base Rate}$$
  $$\text{Post-Processing Cost} = \text{Total Estimated Consumption} \times \text{Post-Processing Rate (if applicable)}$$
- **Total Direct Order Cost**:
  $$\text{Direct Cost} = \text{Production Cost} + \text{Post-Processing Cost} + \text{Designing Cost} + \text{Courier Charge} + \text{Packing Cost} + \text{Other Direct Costs}$$
- **Order Gross Contribution**:
  $$\text{Order Profit Before Shared Overheads} = \text{Taxable Selling Price} - \text{Total Direct Order Cost}$$
- **Order Margin %**:
  $$\text{Margin \%} = \left(\frac{\text{Gross Profit}}{\text{Taxable Selling Price}}\right) \times 100$$
- **Business Net Profit**:
  $$\text{Net Profit} = \text{Order Gross Contribution} + \text{Workshop Gross Contribution} - \text{General Expenses} - \text{Monthly Rent} - \text{Salaries} - \text{Recurring Overheads}$$

---

## 4. Initial User Accounts & Security

The system automatically initializes 3 administrative roles upon database seed:

| Account | Username | Default Password | Role | Access Scope |
|---|---|---|---|---|
| **Super Admin** | `admin` | `Veoma@Admin2026` | `SUPER_ADMIN` | Full unrestricted access to all 13 modules, P&L, salaries, user admin, audit logs, and backups. |
| **Sub Admin 1** | `subadmin1` | `SubAdmin1@2026` | `SUB_ADMIN` | Orders, customers, daily expenses, inventory management, workshop management. Restricted from company net profits and salary details. |
| **Sub Admin 2** | `subadmin2` | `SubAdmin2@2026` | `SUB_ADMIN` | Operational order entry, customer management, status updates, daily expenses. |

*To customize initial passwords, set `SUPERADMIN_PASSWORD`, `SUBADMIN1_PASSWORD`, or `SUBADMIN2_PASSWORD` in your `.env` file before initial startup.*

---

## 5. Local Setup & Running Instructions

### Prerequisites
- Python 3.10+ (or Python launcher `py`)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# From workspace root:
py -m venv .venv

# Activate virtual environment (or run via .\.venv\Scripts\python.exe)
# Install dependencies:
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# Initialize database schema and initial seed data:
.\.venv\Scripts\python.exe -m backend.app.seed

# Run automated test suite:
.\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

### 2. Frontend Build
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Launch Application
```bash
# Run FastAPI server (serves both API and React frontend on port 8000):
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser at: **`http://localhost:8000`**

To run in separate frontend dev server mode with hot-reloading:
```bash
# In frontend directory:
npm run dev
# Access via http://localhost:5173 (proxies /api requests to port 8000)
```

---

## 6. PostgreSQL Production Database Setup

To use PostgreSQL (e.g. Supabase, Neon, AWS RDS, or local Postgres):
1. In `.env` (or server environment variables):
   ```env
   DATABASE_URL=postgresql+pg8000://username:password@hostname:5432/veoma_db
   SECRET_KEY=your-production-high-entropy-secret-key-32-chars-minimum
   ```
2. The application will automatically create all tables, indexes, decimal constraints, and seed default configuration upon launch.

---

## 7. Database Backup & Restoration

### Backup
- **Automated / Manual**: Click **"Create Database Backup Now"** under Company Settings, or send a `POST` request to `/api/backup/create` with Super Admin bearer token.
- Backup files are stored in `backend/backups/veoma_backup_YYYYMMDD_HHMMSS.db`.
- Backups can be downloaded immediately from the UI.

### Restoration Procedure
1. Stop the application server:
   ```bash
   taskkill /F /IM python.exe
   ```
2. For SQLite: Replace `backend/veoma_business.db` with your chosen backup file:
   ```bash
   copy backend\backups\veoma_backup_YYYYMMDD_HHMMSS.db backend\veoma_business.db
   ```
3. For PostgreSQL: Restore using pg_restore / psql:
   ```bash
   psql -U username -d veoma_db -f backend/backups/veoma_backup.sql
   ```
4. Restart the FastAPI service.

---

## 8. Verification & Test Suite Summary

The automated pytest suite (`backend/tests/`) verifies all critical workflows:
- `test_1_pla_order`: 100g PLA + 10% wastage (110g) @ ₹2/g base + ₹1/g post-proc + ₹80 courier + ₹30 packing = ₹440 direct cost. Selling ₹700 => ₹260 profit.
- `test_2_abs_order`: 200g ABS + 10% wastage (220g) @ ₹5/g base = ₹1100 + ₹330 post-proc.
- `test_3_petg_order`: 100g PETG + 10% wastage (110g) @ ₹4/g base = ₹440 + ₹165 post-proc.
- `test_4_tpu_order`: 50g TPU + 10% wastage (55g) @ ₹10/g base = ₹550 + ₹82.50 post-proc.
- `test_5_partial_payment_calculation`: ₹5000 order price, advance ₹2000, 2nd ₹1000 => ₹3000 received, ₹2000 remaining, status `PARTIALLY_PAID`.
- `test_6_monthly_business_profit`: Order contribution ₹50,000 + Workshop contribution ₹10,000 - General expenses ₹5,000 - Rent ₹12,000 - Salaries ₹20,000 = ₹23,000 Net Profit.
- `test_8_gst_separation`: Intra-State 9% CGST + 9% SGST vs Inter-State 18% IGST; tax excluded from gross profit.
- `test_full_business_workflow`: End-to-end integration test of customer creation, order placement, automatic inventory deduction, duplicate payment prevention, actual consumption reconciliation, duplicate monthly rent prevention, isolated workshop profitability, and Sub Admin permission boundaries (403 Forbidden).

---

## 9. License & Business Notice

Developed specifically for **Veoma Labs**, Tamil Nadu, India. All rights reserved.
