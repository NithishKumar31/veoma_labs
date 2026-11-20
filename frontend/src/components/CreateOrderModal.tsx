import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator, Info, AlertTriangle } from 'lucide-react';
import { apiClient } from '../services/api';
import { Customer, Printer, MaterialRate } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onOrderCreated }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [materialRates, setMaterialRates] = useState<any[]>([]);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [modelName, setModelName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Designing
  const [designingRequired, setDesigningRequired] = useState(false);
  const [designingCost, setDesigningCost] = useState('0');

  // Direct Costs
  const [courierCharge, setCourierCharge] = useState('0');
  const [packingCost, setPackingCost] = useState('0');
  const [otherDirectCosts, setOtherDirectCosts] = useState('0');

  // Production Items
  const [productionItems, setProductionItems] = useState<any[]>([
    {
      printer_id: '',
      material_type: 'PLA',
      model_weight_grams: 100,
      wastage_percentage: 10,
      post_processing_required: false,
      printing_hours: 0,
      notes: ''
    }
  ]);

  // Pricing Options
  const [pricingMode, setPricingMode] = useState<'MANUAL' | 'SUGGESTED'>('MANUAL');
  const [agreedSellingPrice, setAgreedSellingPrice] = useState('0');
  const [targetProfitAmount, setTargetProfitAmount] = useState('200');
  const [targetMarginPct, setTargetMarginPct] = useState('30');
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);

  // GST
  const [gstApplicable, setGstApplicable] = useState(false);
  const [placeOfSupply, setPlaceOfSupply] = useState('Tamil Nadu');
  const [gstRate, setGstRate] = useState('18');

  // Initial Advance Payment
  const [recordAdvance, setRecordAdvance] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionRef, setTransactionRef] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      apiClient.listCustomers().then(setCustomers).catch(console.error);
      apiClient.listPrinters().then(setPrinters).catch(console.error);
      apiClient.getSettings().then((s) => setMaterialRates(s.material_rates)).catch(console.error);
    }
  }, [isOpen]);

  // Dynamic live calculation of costs
  const calculateLiveTotals = () => {
    let baseProdTotal = 0;
    let postProcTotal = 0;

    productionItems.forEach((item) => {
      const weight = Number(item.model_weight_grams) || 0;
      const wastage = Number(item.wastage_percentage) || 10;
      const totalEstimated = weight * (1 + wastage / 100);

      // Lookup rates
      const mat = item.material_type.toUpperCase();
      let baseRate = 2.0; // default PLA
      let postRate = 1.0;
      if (mat === 'ABS') { baseRate = 5.0; postRate = 1.5; }
      else if (mat === 'PETG') { baseRate = 4.0; postRate = 1.5; }
      else if (mat === 'TPU') { baseRate = 10.0; postRate = 1.5; }
      else if (mat === 'RESIN') { baseRate = 8.0; postRate = 2.0; }

      const prodCost = totalEstimated * baseRate;
      const postCost = item.post_processing_required ? totalEstimated * postRate : 0;

      baseProdTotal += prodCost;
      postProcTotal += postCost;
    });

    const desCost = designingRequired ? Number(designingCost) || 0 : 0;
    const courier = Number(courierCharge) || 0;
    const packing = Number(packingCost) || 0;
    const other = Number(otherDirectCosts) || 0;

    const totalDirectCost = baseProdTotal + postProcTotal + desCost + courier + packing + other;
    const selling = Number(agreedSellingPrice) || 0;
    const grossProfit = selling - totalDirectCost;
    const marginPct = selling > 0 ? (grossProfit / selling) * 100 : 0;

    // GST
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (gstApplicable && selling > 0) {
      const rate = Number(gstRate) || 18;
      const isIntra = placeOfSupply.toLowerCase().includes('tamil');
      if (isIntra) {
        cgst = selling * (rate / 2 / 100);
        sgst = selling * (rate / 2 / 100);
      } else {
        igst = selling * (rate / 100);
      }
    }

    return {
      baseProdTotal,
      postProcTotal,
      totalDirectCost,
      grossProfit,
      marginPct,
      cgst,
      sgst,
      igst,
      totalInvoice: selling + cgst + sgst + igst
    };
  };

  const totals = calculateLiveTotals();

  // Price Suggestion calculator trigger
  const handleCalculateSuggested = async () => {
    try {
      const res = await apiClient.suggestPrice({
        production_items: productionItems.map((p) => ({
          printer_id: p.printer_id || undefined,
          material_type: p.material_type,
          model_weight_grams: Number(p.model_weight_grams),
          wastage_percentage: Number(p.wastage_percentage),
          post_processing_required: p.post_processing_required
        })),
        designing_required: designingRequired,
        designing_cost: Number(designingCost),
        courier_charge: Number(courierCharge),
        packing_cost: Number(packingCost),
        other_direct_costs: Number(otherDirectCosts),
        target_profit_amount: targetProfitAmount ? Number(targetProfitAmount) : undefined,
        target_profit_margin_pct: targetMarginPct ? Number(targetMarginPct) : undefined
      });
      setSuggestedPrice(res.suggested_selling_price);
      setAgreedSellingPrice(String(res.suggested_selling_price));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = () => {
    setProductionItems([
      ...productionItems,
      {
        printer_id: printers[0]?.id || '',
        material_type: 'PLA',
        model_weight_grams: 100,
        wastage_percentage: 10,
        post_processing_required: false,
        printing_hours: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (productionItems.length === 1) return;
    setProductionItems(productionItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...productionItems];
    updated[index][field] = value;
    setProductionItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        customer_id: newCustomerMode ? undefined : selectedCustomerId,
        customer_name: newCustomerMode ? customerName : undefined,
        customer_phone: newCustomerMode ? customerPhone : undefined,
        customer_email: newCustomerMode ? customerEmail : undefined,
        customer_address: newCustomerMode ? customerAddress : undefined,
        model_name: modelName,
        quantity: Number(quantity),
        expected_delivery_date: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : undefined,
        description,
        image_url: imageUrl,
        designing_required: designingRequired,
        designing_cost: designingRequired ? Number(designingCost) : 0,
        courier_charge: Number(courierCharge),
        packing_cost: Number(packingCost),
        other_direct_costs: Number(otherDirectCosts),
        production_items: productionItems.map((p) => ({
          printer_id: p.printer_id && p.printer_id.trim() !== '' ? p.printer_id.trim() : undefined,
          material_type: p.material_type,
          model_weight_grams: Number(p.model_weight_grams),
          wastage_percentage: Number(p.wastage_percentage),
          post_processing_required: p.post_processing_required,
          printing_hours: p.printing_hours ? Number(p.printing_hours) : undefined,
          notes: p.notes
        })),
        agreed_selling_price: Number(agreedSellingPrice),
        gst_applicable: gstApplicable,
        place_of_supply: placeOfSupply,
        gst_rate: Number(gstRate)
      };

      if (recordAdvance && Number(advanceAmount) > 0) {
        payload.initial_payment = {
          amount: Number(advanceAmount),
          payment_method: paymentMethod,
          transaction_ref: transactionRef
        };
      }

      await apiClient.createOrder(payload);
      onOrderCreated();
      onClose();
    } catch (err: any) {
      let errMsg = 'Failed to create order';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errMsg = err.response.data.detail.map((d: any) => `${d.loc?.slice(-1)[0] || 'field'}: ${d.msg}`).join(', ');
        }
      } else if (err.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Create New Order & Production Workflow</h2>
            <p className="text-xs text-cyan-300">Veoma Labs 3D Printing & Designing Production Costing</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Customer Information</h3>
              <button
                type="button"
                onClick={() => setNewCustomerMode(!newCustomerMode)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {newCustomerMode ? '← Select Existing Customer' : '+ Add New Customer'}
              </button>
            </div>

            {!newCustomerMode ? (
              <div>
                <select
                  required={!newCustomerMode}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  <option value="">-- Choose Existing Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.customer_type}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Customer Full Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  required
                  placeholder="Phone Number *"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="email"
                  placeholder="Email Address (Optional)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Delivery Address / City"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* Model / Product Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">2. Product / Model Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Model / Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drone Frame Mount, Architectural Prototype"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Model / Reference Image URL</label>
                <input
                  type="url"
                  placeholder="https://... or /uploads/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Production Items Engine */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  3. Production Cost Engine (Rates per Gram & 10% Wastage)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Confirmed rates: PLA ₹2/g, ABS ₹5/g, PETG ₹4/g, TPU ₹10/g (Overheads included)
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded text-xs font-medium flex items-center space-x-1"
              >
                <Plus size={14} />
                <span>Add Part</span>
              </button>
            </div>

            {productionItems.map((item, idx) => {
              const weight = Number(item.model_weight_grams) || 0;
              const wastagePct = Number(item.wastage_percentage) || 10;
              const wastageGrams = weight * (wastagePct / 100);
              const estConsumption = weight + wastageGrams;

              return (
                <div key={idx} className="p-3 bg-white rounded-lg border border-slate-300 space-y-2 relative">
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Printer</label>
                      <select
                        value={item.printer_id}
                        onChange={(e) => handleItemChange(idx, 'printer_id', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      >
                        <option value="">Any Printer</option>
                        {printers.map((pr) => (
                          <option key={pr.id} value={pr.id}>{pr.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Material</label>
                      <select
                        value={item.material_type}
                        onChange={(e) => handleItemChange(idx, 'material_type', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      >
                        <option value="PLA">PLA (₹2.00/g)</option>
                        <option value="ABS">ABS (₹5.00/g)</option>
                        <option value="PETG">PETG (₹4.00/g)</option>
                        <option value="TPU">TPU (₹10.00/g)</option>
                        <option value="RESIN">Resin (₹8.00/g)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Weight (Grams)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={item.model_weight_grams}
                        onChange={(e) => handleItemChange(idx, 'model_weight_grams', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Wastage %</label>
                      <input
                        type="number"
                        min="0"
                        value={item.wastage_percentage}
                        onChange={(e) => handleItemChange(idx, 'wastage_percentage', e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-xs"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={item.post_processing_required}
                          onChange={(e) => handleItemChange(idx, 'post_processing_required', e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <span className="text-[11px] font-medium text-slate-700">Post-processing</span>
                      </label>

                      {productionItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 ml-auto"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded flex items-center justify-between">
                    <span>
                      Model: <strong>{weight}g</strong> + Wastage ({wastagePct}%): <strong>{wastageGrams.toFixed(1)}g</strong> = Total Est: <strong>{estConsumption.toFixed(1)}g</strong>
                    </span>
                    <span className="text-blue-700 font-semibold">
                      {item.post_processing_required ? 'Includes Post-processing' : 'No post-processing'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Designing & Direct Expenses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Designing */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Designing Service</span>
                <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold">
                  <span>Required:</span>
                  <input
                    type="checkbox"
                    checked={designingRequired}
                    onChange={(e) => {
                      setDesigningRequired(e.target.checked);
                      if (!e.target.checked) setDesigningCost('0');
                    }}
                    className="rounded text-blue-600"
                  />
                  <span>{designingRequired ? 'Yes' : 'No (₹0)'}</span>
                </label>
              </div>

              {designingRequired ? (
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">Enter Designing Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={designingCost}
                    onChange={(e) => setDesigningCost(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Designing cost automatically set to ₹0.00</p>
              )}
            </div>

            {/* Courier & Packing */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Courier & Packing Charges
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-600">Courier Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={courierCharge}
                    onChange={(e) => setCourierCharge(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-600">Packing Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={packingCost}
                    onChange={(e) => setPackingCost(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Options & Real-time Live Summary */}
          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                4. Selling Price & Profit Calculation
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPricingMode('MANUAL')}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${
                    pricingMode === 'MANUAL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  Manual Price
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('SUGGESTED')}
                  className={`px-2.5 py-1 text-xs rounded font-medium ${
                    pricingMode === 'SUGGESTED' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  Suggested Calculator
                </button>
              </div>
            </div>

            {pricingMode === 'SUGGESTED' && (
              <div className="p-3 bg-white rounded-lg border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600">Desired Profit (₹)</label>
                  <input
                    type="number"
                    value={targetProfitAmount}
                    onChange={(e) => setTargetProfitAmount(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600">Or Target Margin (%)</label>
                  <input
                    type="number"
                    value={targetMarginPct}
                    onChange={(e) => setTargetMarginPct(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleCalculateSuggested}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded flex items-center justify-center space-x-1"
                  >
                    <Calculator size={14} />
                    <span>Calculate Suggested</span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Agreed Order Selling Price (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={agreedSellingPrice}
                  onChange={(e) => setAgreedSellingPrice(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-900"
                />
              </div>

              {/* Real-time Order Summary Preview */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Direct Order Cost:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(totals.totalDirectCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Profit Before Overheads:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(totals.grossProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Profit Margin:</span>
                  <span className="font-semibold text-blue-600">{totals.marginPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* GST Toggle & Supply Location */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">5. GST Tax Classification</span>
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold">
                <span>GST Applicable:</span>
                <input
                  type="checkbox"
                  checked={gstApplicable}
                  onChange={(e) => setGstApplicable(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>{gstApplicable ? 'Yes' : 'No (Non-GST Sales)'}</span>
              </label>
            </div>

            {gstApplicable && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-slate-300 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500">Place of Supply (State)</label>
                  <select
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  >
                    <option value="Tamil Nadu">Tamil Nadu (Intra-state: 9% CGST + 9% SGST)</option>
                    <option value="Karnataka">Karnataka (Inter-state: 18% IGST)</option>
                    <option value="Kerala">Kerala (Inter-state: 18% IGST)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (Inter-state: 18% IGST)</option>
                    <option value="Other State">Other State (Inter-state: 18% IGST)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">GST Rate (%)</label>
                  <input
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div className="pt-2 text-[11px] text-slate-600 space-y-0.5">
                  <p>Taxable Value: <strong>{formatCurrency(Number(agreedSellingPrice) || 0)}</strong></p>
                  <p>Tax: <strong>{formatCurrency(totals.cgst + totals.sgst + totals.igst)}</strong></p>
                  <p className="font-bold text-blue-800">Invoice Total: {formatCurrency(totals.totalInvoice)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Initial Advance Payment */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">6. Payment Details</span>
              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={recordAdvance}
                  onChange={(e) => setRecordAdvance(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Record Advance Payment Now</span>
              </label>
            </div>

            {recordAdvance && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-slate-300 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500">Advance Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500">Transaction Reference ID</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Txn ID"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-md disabled:opacity-50"
            >
              {loading ? 'Creating Order...' : 'Confirm & Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
