export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'SUPER_ADMIN' | 'SUB_ADMIN';
  permissions: {
    can_view_profits?: boolean;
    can_view_salaries?: boolean;
    can_view_gst?: boolean;
    can_manage_users?: boolean;
    can_delete_financials?: boolean;
    can_manage_inventory?: boolean;
    can_manage_workshops?: boolean;
    can_backup_database?: boolean;
    [key: string]: boolean | undefined;
  };
  is_active: boolean;
}

export interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  customer_type: string;
  notes?: string;
  created_at: string;
}

export interface ProductionItem {
  id?: string;
  printer_id?: string;
  material_type: string;
  model_weight_grams: number;
  wastage_percentage: number;
  total_estimated_grams?: number;
  actual_consumed_grams?: number;
  base_rate_per_gram?: number;
  post_processing_rate_per_gram?: number;
  post_processing_required: boolean;
  production_cost?: number;
  post_processing_cost?: number;
  printing_hours?: number;
  notes?: string;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  payment_code: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  transaction_ref?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  order_date: string;
  expected_delivery_date?: string;
  model_name: string;
  image_url?: string;
  description?: string;
  quantity: number;
  order_status: string;
  designing_required: boolean;
  designing_cost: number;
  courier_charge: number;
  packing_cost: number;
  other_direct_costs: number;
  base_production_cost: number;
  post_processing_cost: number;
  total_direct_cost: number;
  agreed_selling_price: number;
  gross_profit: number;
  profit_margin_pct: number;
  gst_applicable: boolean;
  place_of_supply: string;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_invoice_amount: number;
  invoice_number?: string;
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'REFUNDED';
  total_paid: number;
  remaining_balance: number;
  production_notes?: string;
  created_at: string;
  updated_at: string;
  production_items: ProductionItem[];
  payments: OrderPayment[];
}

export interface InventoryItem {
  id: string;
  material_type: string;
  brand: string;
  colour: string;
  spool_weight_grams: number;
  current_stock_grams: number;
  min_threshold_grams: number;
  avg_cost_per_gram: number;
  is_active: boolean;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity_grams: number;
  previous_stock_grams: number;
  new_stock_grams: number;
  reference_type?: string;
  reference_id?: string;
  reason?: string;
  created_at: string;
}

export interface Printer {
  id: string;
  name: string;
  model: string;
  technology: string;
  purchase_date?: string;
  purchase_cost: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  notes?: string;
  completed_orders_count?: number;
  total_grams_consumed?: number;
  total_production_value?: number;
}

export interface DailyExpense {
  id: string;
  expense_code: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  paid_by: string;
  receipt_url?: string;
  notes?: string;
  is_archived: boolean;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
}

export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  designation: string;
  phone: string;
  email?: string;
  base_salary: number;
  joining_date?: string;
  is_active: boolean;
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  employee_name?: string;
  salary_month: string;
  base_salary: number;
  additional_payments: number;
  deductions: number;
  total_payable: number;
  amount_paid: number;
  remaining_balance: number;
  payment_status: string;
  payment_date?: string;
  payment_method: string;
  notes?: string;
}

export interface RentRecord {
  id: string;
  rent_month: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  paid_to: string;
  notes?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  category: string;
  monthly_amount: number;
  default_day_of_month: number;
  is_active: boolean;
  notes?: string;
}

export interface WorkshopParticipant {
  id: string;
  workshop_id: string;
  participant_name: string;
  phone: string;
  email?: string;
  fee_agreed: number;
  amount_paid: number;
  balance: number;
  payment_status: string;
  notes?: string;
}

export interface WorkshopExpense {
  id: string;
  workshop_id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  paid_to?: string;
  notes?: string;
}

export interface Workshop {
  id: string;
  workshop_code: string;
  name: string;
  category: string;
  start_date: string;
  end_date?: string;
  location: string;
  trainer_name: string;
  registration_fee: number;
  target_participants: number;
  total_participants: number;
  total_revenue: number;
  total_collected: number;
  pending_amount: number;
  total_expenses: number;
  net_profit: number;
  status: string;
  notes?: string;
  participants?: WorkshopParticipant[];
  expenses?: WorkshopExpense[];
}

export interface DashboardSummary {
  filter_type: string;
  date_start: string;
  date_end: string;
  total_revenue: number;
  total_expenses: number;
  gross_profit: number;
  net_business_profit: number | null;
  total_payments_received: number;
  outstanding_customer_payments: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  order_revenue: number;
  order_gross_contribution: number;
  total_workshop_revenue: number;
  total_workshop_profit: number;
  general_expenses: number;
  rent_expenses: number | null;
  salary_expenses: number | null;
  gst_collected: number;
  can_view_profits: boolean;
  daily_revenue_chart: { date: string; revenue: number; expenses: number }[];
  expense_category_chart: { name: string; value: number }[];
  printer_activity_chart: { printer: string; grams: number; orders: number }[];
}

export interface AuditLog {
  id: string;
  user_id?: string;
  username: string;
  action: string;
  module: string;
  record_id?: string;
  previous_value?: any;
  new_value?: any;
  remarks?: string;
  timestamp: string;
}

export interface MaterialRate {
  id: string;
  material_type: string;
  base_rate_per_gram: number;
  post_processing_rate_per_gram: number;
  default_wastage_pct: number;
  notes?: string;
}
