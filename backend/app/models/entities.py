import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text, DateTime, ForeignKey, JSON, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from ..database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), nullable=False, default="SUB_ADMIN") # SUPER_ADMIN, SUB_ADMIN
    permissions = Column(JSON, default=dict) # Granular module permissions
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    customer_code = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False, index=True)
    phone = Column(String(32), nullable=False, index=True)
    email = Column(String(128), nullable=True)
    address = Column(Text, nullable=True)
    gstin = Column(String(32), nullable=True)
    customer_type = Column(String(32), default="INDIVIDUAL") # INDIVIDUAL, BUSINESS, INSTITUTION, OTHER
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")


class Printer(Base):
    __tablename__ = "printers"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(128), nullable=False)
    model = Column(String(128), nullable=False)
    technology = Column(String(32), default="FDM") # FDM, RESIN, OTHER
    purchase_date = Column(DateTime, nullable=True)
    purchase_cost = Column(Numeric(12, 2), default=Decimal("0.00"))
    status = Column(String(32), default="ACTIVE") # ACTIVE, MAINTENANCE, INACTIVE
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    production_items = relationship("OrderProductionItem", back_populates="printer")


class MaterialRate(Base):
    __tablename__ = "material_rates"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    material_type = Column(String(32), unique=True, nullable=False) # PLA, ABS, PETG, TPU, RESIN, OTHER
    base_rate_per_gram = Column(Numeric(8, 2), nullable=False)
    post_processing_rate_per_gram = Column(Numeric(8, 2), nullable=False)
    default_wastage_pct = Column(Numeric(5, 2), default=Decimal("10.00"))
    notes = Column(Text, nullable=True)


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    order_id = Column(String(64), unique=True, nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False, index=True)
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    expected_delivery_date = Column(DateTime, nullable=True)
    model_name = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    order_status = Column(String(32), default="PENDING", nullable=False) # PENDING, DESIGNING, READY_FOR_PRINTING, PRINTING, POST_PROCESSING, QUALITY_CHECK, COMPLETED, SHIPPED, DELIVERED, CANCELLED

    # Designing Information
    designing_required = Column(Boolean, default=False)
    designing_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Courier & Packing
    courier_charge = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    packing_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    other_direct_costs = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Calculated Production Costs
    base_production_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    post_processing_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_direct_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    # Selling & Profitability
    agreed_selling_price = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    gross_profit = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False) # Order Profit Before Shared Business Expenses
    profit_margin_pct = Column(Numeric(6, 2), default=Decimal("0.00"), nullable=False)

    # GST Classification
    gst_applicable = Column(Boolean, default=False, nullable=False)
    place_of_supply = Column(String(64), default="Tamil Nadu")
    taxable_value = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    gst_rate = Column(Numeric(5, 2), default=Decimal("18.00"), nullable=False)
    cgst_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    sgst_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    igst_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_invoice_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    invoice_number = Column(String(64), nullable=True, unique=True)

    # Payment Status
    payment_status = Column(String(32), default="UNPAID", nullable=False) # UNPAID, PARTIALLY_PAID, FULLY_PAID, REFUNDED
    total_paid = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    remaining_balance = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)

    production_notes = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    production_items = relationship("OrderProductionItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("OrderPayment", back_populates="order", cascade="all, delete-orphan")


class OrderProductionItem(Base):
    __tablename__ = "order_production_items"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    printer_id = Column(String(36), ForeignKey("printers.id"), nullable=True)
    material_type = Column(String(32), nullable=False) # PLA, ABS, PETG, TPU, RESIN, OTHER
    model_weight_grams = Column(Numeric(10, 2), nullable=False)
    wastage_percentage = Column(Numeric(5, 2), default=Decimal("10.00"), nullable=False)
    total_estimated_grams = Column(Numeric(10, 2), nullable=False)
    actual_consumed_grams = Column(Numeric(10, 2), nullable=True)
    base_rate_per_gram = Column(Numeric(8, 2), nullable=False)
    post_processing_rate_per_gram = Column(Numeric(8, 2), default=Decimal("0.00"), nullable=False)
    post_processing_required = Column(Boolean, default=False, nullable=False)
    production_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    post_processing_cost = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    printing_hours = Column(Numeric(6, 2), nullable=True)
    notes = Column(Text, nullable=True)

    order = relationship("Order", back_populates="production_items")
    printer = relationship("Printer", back_populates="production_items")


class OrderPayment(Base):
    __tablename__ = "order_payments"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    order_id = Column(String(36), ForeignKey("orders.id"), nullable=False, index=True)
    payment_code = Column(String(64), unique=True, nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    payment_method = Column(String(32), default="UPI", nullable=False) # CASH, UPI, BANK_TRANSFER, OTHER
    transaction_ref = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    recorded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="payments")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    material_type = Column(String(32), nullable=False, index=True) # PLA, ABS, PETG, TPU, RESIN, OTHER
    brand = Column(String(64), nullable=False, default="Generic")
    colour = Column(String(64), nullable=False, default="Black")
    spool_weight_grams = Column(Numeric(10, 2), default=Decimal("1000.00"))
    current_stock_grams = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    min_threshold_grams = Column(Numeric(10, 2), default=Decimal("200.00"), nullable=False)
    avg_cost_per_gram = Column(Numeric(8, 2), default=Decimal("1.50"))
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = relationship("InventoryMovement", back_populates="item", cascade="all, delete-orphan")


class InventoryPurchase(Base):
    __tablename__ = "inventory_purchases"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    purchase_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    supplier = Column(String(128), nullable=False)
    brand = Column(String(64), nullable=False)
    material_type = Column(String(32), nullable=False)
    colour = Column(String(64), nullable=False)
    spool_weight_grams = Column(Numeric(10, 2), default=Decimal("1000.00"))
    quantity_spools = Column(Integer, default=1, nullable=False)
    total_weight_grams = Column(Numeric(12, 2), nullable=False)
    purchase_price = Column(Numeric(12, 2), nullable=False)
    cost_per_gram = Column(Numeric(8, 2), nullable=False)
    invoice_ref = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    inventory_item_id = Column(String(36), ForeignKey("inventory_items.id"), nullable=False, index=True)
    movement_type = Column(String(32), nullable=False) # PURCHASE, ORDER_RESERVATION, ORDER_RECONCILE, MANUAL_ADD, MANUAL_REDUCE
    quantity_grams = Column(Numeric(12, 2), nullable=False) # Positive or negative
    previous_stock_grams = Column(Numeric(12, 2), nullable=False)
    new_stock_grams = Column(Numeric(12, 2), nullable=False)
    reference_type = Column(String(32), nullable=True) # ORDER, PURCHASE, MANUAL_ADJUSTMENT
    reference_id = Column(String(64), nullable=True)
    reason = Column(Text, nullable=True)
    performed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("InventoryItem", back_populates="movements")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(64), unique=True, nullable=False)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)


class DailyExpense(Base):
    __tablename__ = "daily_expenses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    expense_code = Column(String(64), unique=True, nullable=False, index=True)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(32), default="UPI", nullable=False)
    paid_by = Column(String(64), default="Company Account")
    receipt_url = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id = Column(String(32), unique=True, nullable=False, index=True)
    full_name = Column(String(128), nullable=False)
    designation = Column(String(64), nullable=False)
    phone = Column(String(32), nullable=False)
    email = Column(String(128), nullable=True)
    base_salary = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    joining_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    salaries = relationship("SalaryRecord", back_populates="employee")


class SalaryRecord(Base):
    __tablename__ = "salary_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id = Column(String(36), ForeignKey("employees.id"), nullable=False, index=True)
    salary_month = Column(String(7), nullable=False, index=True) # YYYY-MM
    base_salary = Column(Numeric(12, 2), nullable=False)
    additional_payments = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    deductions = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_payable = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    remaining_balance = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    payment_status = Column(String(32), default="UNPAID", nullable=False) # UNPAID, PARTIAL, PAID
    payment_date = Column(DateTime, nullable=True)
    payment_method = Column(String(32), default="BANK_TRANSFER")
    notes = Column(Text, nullable=True)
    recorded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="salaries")

    __table_args__ = (
        UniqueConstraint("employee_id", "salary_month", name="uq_emp_salary_month"),
    )


class RentRecord(Base):
    __tablename__ = "rent_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    rent_month = Column(String(7), unique=True, nullable=False, index=True) # YYYY-MM
    amount = Column(Numeric(12, 2), default=Decimal("12000.00"), nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    payment_method = Column(String(32), default="BANK_TRANSFER")
    paid_to = Column(String(128), default="Landlord / Office Owner")
    notes = Column(Text, nullable=True)
    recorded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False)
    monthly_amount = Column(Numeric(12, 2), nullable=False)
    default_day_of_month = Column(Integer, default=5)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)


class Workshop(Base):
    __tablename__ = "workshops"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    workshop_code = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(32), default="3D_PRINTING", nullable=False) # 3D_PRINTING, 3D_DESIGNING, 3D_SCANNING, CUSTOM
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=False)
    trainer_name = Column(String(128), nullable=False)
    registration_fee = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    target_participants = Column(Integer, default=20)
    total_participants = Column(Integer, default=0)
    total_revenue = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_collected = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    pending_amount = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_expenses = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    net_profit = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    status = Column(String(32), default="UPCOMING") # UPCOMING, ONGOING, COMPLETED, CANCELLED
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    participants = relationship("WorkshopParticipant", back_populates="workshop", cascade="all, delete-orphan")
    expenses = relationship("WorkshopExpense", back_populates="workshop", cascade="all, delete-orphan")


class WorkshopParticipant(Base):
    __tablename__ = "workshop_participants"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    workshop_id = Column(String(36), ForeignKey("workshops.id"), nullable=False, index=True)
    participant_name = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=False)
    email = Column(String(128), nullable=True)
    fee_agreed = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    balance = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    payment_status = Column(String(32), default="UNPAID") # UNPAID, PARTIAL, PAID
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workshop = relationship("Workshop", back_populates="participants")


class WorkshopExpense(Base):
    __tablename__ = "workshop_expenses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    workshop_id = Column(String(36), ForeignKey("workshops.id"), nullable=False, index=True)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    category = Column(String(32), nullable=False) # TRAINER, MATERIALS, REFRESHMENTS, FOOD, TRAVEL, VENUE, CERTIFICATES, MARKETING, OTHER
    description = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(String(32), default="UPI")
    paid_to = Column(String(128), nullable=True)
    receipt_url = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workshop = relationship("Workshop", back_populates="expenses")


class CompanySetting(Base):
    __tablename__ = "company_settings"

    key = Column(String(64), primary_key=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    username = Column(String(64), nullable=False)
    action = Column(String(32), nullable=False) # CREATE, UPDATE, DELETE, STATUS_CHANGE, OVERRIDE, LOGIN, BACKUP, RESTORE
    module = Column(String(32), nullable=False, index=True) # ORDERS, EXPENSES, INVENTORY, WORKSHOPS, SALARIES, SETTINGS, USERS
    record_id = Column(String(64), nullable=True)
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    remarks = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")
