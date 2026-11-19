/**
 * Format number into Indian currency format: ₹1,25,000.00
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0.00';
  }
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format date string or Date object into DD-MM-YYYY
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return '-';
  }
}

/**
 * Format datetime string into DD-MM-YYYY HH:mm
 */
export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}`;
  } catch {
    return '-';
  }
}

/**
 * Format grams (e.g. 1,250 g or 1.25 kg)
 */
export function formatWeight(grams: number | string | null | undefined): string {
  if (grams === null || grams === undefined || isNaN(Number(grams))) {
    return '0 g';
  }
  const val = Number(grams);
  if (val >= 1000) {
    return `${(val / 1000).toFixed(2)} kg`;
  }
  return `${val.toFixed(1)} g`;
}
