from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth & Users -----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class LoginRequest(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "SUB_ADMIN" # SUPER_ADMIN, SUB_ADMIN
    permissions: Dict[str, bool] = Field(default_factory=dict)
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    permissions: Optional[Dict[str, bool]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    permissions: Dict[str, Any]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Customers -----------------
class CustomerCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    customer_type: str = "INDIVIDUAL"
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    customer_type: Optional[str] = None
    notes: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    customer_code: str
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    gstin: Optional[str]
    customer_type: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Printers -----------------
class PrinterCreate(BaseModel):
    name: str
    model: str
    technology: str = "FDM"
    purchase_date: Optional[datetime] = None
    purchase_cost: Decimal = Decimal("0.00")
    status: str = "ACTIVE"
    notes: Optional[str] = None

class PrinterUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    technology: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_cost: Optional[Decimal] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PrinterResponse(BaseModel):
    id: str
    name: str
    model: str
    technology: str
    purchase_date: Optional[datetime]
    purchase_cost: Decimal
    status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Orders & Production -----------------
class OrderProductionItemCreate(BaseModel):
    printer_id: Optional[str] = None
    material_type: str
    model_weight_grams: Decimal
    wastage_percentage: Decimal = Decimal("10.00")
    post_processing_required: bool = False
    printing_hours: Optional[Decimal] = None
    notes: Optional[str] = None

class OrderProductionItemResponse(BaseModel):
    id: str
    order_id: str
    printer_id: Optional[str]
    material_type: str
    model_weight_grams: Decimal
    wastage_percentage: Decimal
    total_estimated_grams: Decimal
    actual_consumed_grams: Optional[Decimal]
    base_rate_per_gram: Decimal
    post_processing_rate_per_gram: Decimal
    post_processing_required: bool
    production_cost: Decimal
    post_processing_cost: Decimal
    printing_hours: Optional[Decimal]
    notes: Optional[str]

    class Config:
        from_attributes = True

class OrderPaymentCreate(BaseModel):
    amount: Decimal
    payment_method: str = "UPI" # CASH, UPI, BANK_TRANSFER, OTHER
    payment_date: Optional[datetime] = None
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None

class OrderPaymentResponse(BaseModel):
    id: str
    order_id: str
    payment_code: str
    amount: Decimal
    payment_date: datetime
    payment_method: str
    transaction_ref: Optional[str]
    notes: Optional[str]
    recorded_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    # Or create customer on the fly
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None

    model_name: str
    expected_delivery_date: Optional[datetime] = None
    description: Optional[str] = None
    quantity: int = 1
    image_url: Optional[str] = None

    # Designing
    designing_required: bool = False
    designing_cost: Decimal = Decimal("0.00")

    # Direct Costs
    courier_charge: Decimal = Decimal("0.00")
    packing_cost: Decimal = Decimal("0.00")
    other_direct_costs: Decimal = Decimal("0.00")

    # Production items
    production_items: List[OrderProductionItemCreate] = Field(default_factory=list)

    # Selling price
    agreed_selling_price: Decimal

    # GST
    gst_applicable: bool = False
    place_of_supply: str = "Tamil Nadu"
    gst_rate: Decimal = Decimal("18.00")

    # Initial advance payment (optional)
    initial_payment: Optional[OrderPaymentCreate] = None
    production_notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    order_status: str
    notes: Optional[str] = None

class OrderReconcileActualConsumption(BaseModel):
    production_item_id: str
    actual_consumed_grams: Decimal
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    order_id: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    order_date: datetime
    expected_delivery_date: Optional[datetime]
    model_name: str
    image_url: Optional[str]
    description: Optional[str]
    quantity: int
    order_status: str
    designing_required: bool
    designing_cost: Decimal
    courier_charge: Decimal
    packing_cost: Decimal
    other_direct_costs: Decimal
    base_production_cost: Decimal
    post_processing_cost: Decimal
    total_direct_cost: Decimal
    agreed_selling_price: Decimal
    gross_profit: Decimal
    profit_margin_pct: Decimal
    gst_applicable: bool
    place_of_supply: str
    taxable_value: Decimal
    gst_rate: Decimal
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    total_invoice_amount: Decimal
    invoice_number: Optional[str]
    payment_status: str
    total_paid: Decimal
    remaining_balance: Decimal
    production_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    production_items: List[OrderProductionItemResponse] = Field(default_factory=list)
    payments: List[OrderPaymentResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class PriceSuggestionRequest(BaseModel):
    production_items: List[OrderProductionItemCreate] = Field(default_factory=list)
    designing_required: bool = False
    designing_cost: Decimal = Decimal("0.00")
    courier_charge: Decimal = Decimal("0.00")
    packing_cost: Decimal = Decimal("0.00")
    other_direct_costs: Decimal = Decimal("0.00")
    target_profit_amount: Optional[Decimal] = None
    target_profit_margin_pct: Optional[Decimal] = None

class PriceSuggestionResponse(BaseModel):
    base_production_cost: Decimal
    post_processing_cost: Decimal
    total_direct_cost: Decimal
    suggested_selling_price: Decimal
    estimated_profit: Decimal
    estimated_margin_pct: Decimal

# ----------------- Inventory -----------------
class InventoryItemCreate(BaseModel):
    material_type: str
    brand: str = "Generic"
    colour: str = "Black"
    spool_weight_grams: Decimal = Decimal("1000.00")
    initial_stock_grams: Decimal = Decimal("0.00")
    min_threshold_grams: Decimal = Decimal("200.00")
    avg_cost_per_gram: Decimal = Decimal("1.50")

class InventoryPurchaseCreate(BaseModel):
    purchase_date: Optional[datetime] = None
    supplier: str
    brand: str
    material_type: str
    colour: str
    spool_weight_grams: Decimal = Decimal("1000.00")
    quantity_spools: int = 1
    purchase_price: Decimal
    invoice_ref: Optional[str] = None
    notes: Optional[str] = None

class StockAdjustmentCreate(BaseModel):
    inventory_item_id: str
    adjustment_type: str # MANUAL_ADD, MANUAL_REDUCE
    quantity_grams: Decimal
    reason: str

class InventoryMovementResponse(BaseModel):
    id: str
    inventory_item_id: str
    movement_type: str
    quantity_grams: Decimal
    previous_stock_grams: Decimal
    new_stock_grams: Decimal
    reference_type: Optional[str]
    reference_id: Optional[str]
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryItemResponse(BaseModel):
    id: str
    material_type: str
    brand: str
    colour: str
    spool_weight_grams: Decimal
    current_stock_grams: Decimal
    min_threshold_grams: Decimal
    avg_cost_per_gram: Decimal
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True

# ----------------- Expenses -----------------
class DailyExpenseCreate(BaseModel):
    expense_date: Optional[datetime] = None
    category: str
    description: str
    amount: Decimal
    payment_method: str = "UPI"
    paid_by: str = "Company Account"
    receipt_url: Optional[str] = None
    notes: Optional[str] = None

class DailyExpenseResponse(BaseModel):
    id: str
    expense_code: str
    expense_date: datetime
    category: str
    description: str
    amount: Decimal
    payment_method: str
    paid_by: str
    receipt_url: Optional[str]
    notes: Optional[str]
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Salary & Rent -----------------
class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    designation: str
    phone: str
    email: Optional[str] = None
    base_salary: Decimal = Decimal("0.00")
    joining_date: Optional[datetime] = None

class EmployeeResponse(BaseModel):
    id: str
    employee_id: str
    full_name: str
    designation: str
    phone: str
    email: Optional[str]
    base_salary: Decimal
    joining_date: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True

class SalaryRecordCreate(BaseModel):
    employee_id: str
    salary_month: str # YYYY-MM
    base_salary: Decimal
    additional_payments: Decimal = Decimal("0.00")
    deductions: Decimal = Decimal("0.00")
    amount_paid: Decimal = Decimal("0.00")
    payment_date: Optional[datetime] = None
    payment_method: str = "BANK_TRANSFER"
    notes: Optional[str] = None

class SalaryRecordResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    salary_month: str
    base_salary: Decimal
    additional_payments: Decimal
    deductions: Decimal
    total_payable: Decimal
    amount_paid: Decimal
    remaining_balance: Decimal
    payment_status: str
    payment_date: Optional[datetime]
    payment_method: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class RentRecordCreate(BaseModel):
    rent_month: str # YYYY-MM
    amount: Decimal = Decimal("12000.00")
    payment_date: Optional[datetime] = None
    payment_method: str = "BANK_TRANSFER"
    paid_to: str = "Landlord / Office Owner"
    notes: Optional[str] = None

class RentRecordResponse(BaseModel):
    id: str
    rent_month: str
    amount: Decimal
    payment_date: datetime
    payment_method: str
    paid_to: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class RecurringExpenseCreate(BaseModel):
    name: str
    category: str
    monthly_amount: Decimal
    default_day_of_month: int = 5
    notes: Optional[str] = None

class RecurringExpenseResponse(BaseModel):
    id: str
    name: str
    category: str
    monthly_amount: Decimal
    default_day_of_month: int
    is_active: bool
    notes: Optional[str]

    class Config:
        from_attributes = True

# ----------------- Workshops -----------------
class WorkshopParticipantCreate(BaseModel):
    participant_name: str
    phone: str
    email: Optional[str] = None
    fee_agreed: Decimal
    amount_paid: Decimal = Decimal("0.00")
    payment_status: str = "UNPAID"
    notes: Optional[str] = None

class WorkshopParticipantResponse(BaseModel):
    id: str
    workshop_id: str
    participant_name: str
    phone: str
    email: Optional[str]
    fee_agreed: Decimal
    amount_paid: Decimal
    balance: Decimal
    payment_status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class WorkshopExpenseCreate(BaseModel):
    expense_date: Optional[datetime] = None
    category: str # TRAINER, MATERIALS, REFRESHMENTS, FOOD, TRAVEL, VENUE, CERTIFICATES, MARKETING, OTHER
    description: str
    amount: Decimal
    payment_method: str = "UPI"
    paid_to: Optional[str] = None
    notes: Optional[str] = None

class WorkshopExpenseResponse(BaseModel):
    id: str
    workshop_id: str
    expense_date: datetime
    category: str
    description: str
    amount: Decimal
    payment_method: str
    paid_to: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class WorkshopCreate(BaseModel):
    name: str
    category: str = "3D_PRINTING"
    start_date: datetime
    end_date: Optional[datetime] = None
    location: str
    trainer_name: str
    registration_fee: Decimal
    target_participants: int = 20
    notes: Optional[str] = None

class WorkshopResponse(BaseModel):
    id: str
    workshop_code: str
    name: str
    category: str
    start_date: datetime
    end_date: Optional[datetime]
    location: str
    trainer_name: str
    registration_fee: Decimal
    target_participants: int
    total_participants: int
    total_revenue: Decimal
    total_collected: Decimal
    pending_amount: Decimal
    total_expenses: Decimal
    net_profit: Decimal
    status: str
    notes: Optional[str]
    created_at: datetime
    participants: List[WorkshopParticipantResponse] = Field(default_factory=list)
    expenses: List[WorkshopExpenseResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

# ----------------- Dashboard & Reports -----------------
class DashboardSummary(BaseModel):
    total_revenue: Decimal
    total_expenses: Decimal
    gross_profit: Decimal
    net_business_profit: Decimal
    total_payments_received: Decimal
    outstanding_customer_payments: Decimal
    total_orders: int
    completed_orders: int
    pending_orders: int
    total_workshop_revenue: Decimal
    total_workshop_profit: Decimal
    order_gross_contribution: Decimal
    workshop_gross_contribution: Decimal
    general_expenses: Decimal
    rent_expenses: Decimal
    salary_expenses: Decimal
    gst_collected: Decimal
    daily_revenue_chart: List[Dict[str, Any]]
    monthly_revenue_chart: List[Dict[str, Any]]
    expense_category_chart: List[Dict[str, Any]]
    printer_activity_chart: List[Dict[str, Any]]

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str]
    username: str
    action: str
    module: str
    record_id: Optional[str]
    previous_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    remarks: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
