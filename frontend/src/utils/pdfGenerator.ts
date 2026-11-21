import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoicePdfData {
  order_id?: string;
  company_name: string;
  company_gstin: string;
  company_address: string;
  payment_method?: string;
  account_no?: string;
  account_name?: string;
  branch_name?: string;
  phone?: string;
  email?: string;
  signatory_name?: string;
  signatory_title?: string;
  notice?: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  customer_address: string;
  customer_gstin?: string;
  items: Array<{
    description: string;
    qty: string | number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  gst: number;
  total: number;
  courier_charge: number;
  grand_total: number;
}

export function generateClientInvoicePdf(data: InvoicePdfData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // 1. Top Geometric Blue Header Banners
  doc.setFillColor(30, 58, 138); // Deep blue #1e3a8a
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFillColor(37, 99, 235); // Mid blue #2563eb
  doc.triangle(0, 0, 110, 0, 0, 24, 'F');

  // 2. Company Brand & Title (Top Right)
  doc.setTextColor(17, 24, 39); // Text black
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((data.company_name || 'VEOMA LABS').toUpperCase(), pageWidth - 14, 34, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.text('INVOICE', pageWidth - 14, 39, { align: 'right' });

  // Invoice Date & Invoice No
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(8.5);
  doc.text(`Invoice Date: ${data.invoice_date || ''}`, pageWidth - 14, 45, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice no : ${data.invoice_no || ''}`, pageWidth - 14, 49.5, { align: 'right' });

  // Company GST & Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`GST No. - ${data.company_gstin || ''}`, pageWidth - 14, 55, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Address - ${data.company_address || ''}`, pageWidth - 14, 59, { align: 'right' });

  // Bank & Payment Details
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYMENT METHOD - ${data.payment_method || 'CASH / BANK'}`, pageWidth - 14, 65, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Account No: ${data.account_no || ''}`, pageWidth - 14, 69, { align: 'right' });
  doc.text(`Account Name: ${data.account_name || ''}`, pageWidth - 14, 73, { align: 'right' });
  doc.text(`Branch Name: ${data.branch_name || ''}`, pageWidth - 14, 77, { align: 'right' });

  // 3. Customer "TO:" Section (Top Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text('TO:', 14, 34);

  doc.setFontSize(10.5);
  doc.text((data.customer_name || 'CUSTOMER').toUpperCase(), 14, 40);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const addrLines = (data.customer_address || '').split('\n');
  let currentY = 45;
  addrLines.forEach((line) => {
    if (line.trim()) {
      doc.text(line.toUpperCase(), 14, currentY);
      currentY += 4.5;
    }
  });

  if (data.customer_gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`GST No. - ${data.customer_gstin}`, 14, currentY + 1);
  }

  // 4. Line Items Table with Rounded Deep Blue Header
  const tableStartY = 85;
  const tableBody = (data.items || []).map((it) => [
    it.description || '',
    String(it.qty || '1'),
    `₹${Number(it.price || 0).toLocaleString('en-IN')}`,
    `₹${Number(it.total || 0).toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['DESCRIPTION', 'QTY', 'PRICE', 'TOTAL']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [30, 58, 138], // #1e3a8a
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 95, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [17, 24, 39]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // light slate tint
    }
  });

  // 5. Totals & Summary (Right Aligned)
  const finalY = (doc as any).lastAutoTable?.finalY || 140;
  const totalsX = pageWidth - 14;
  let summaryY = finalY + 8;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);

  doc.text('SUB TOTAL', totalsX - 45, summaryY);
  doc.text(`₹${Number(data.subtotal || 0).toLocaleString('en-IN')}`, totalsX, summaryY, { align: 'right' });

  summaryY += 5;
  doc.text('GST', totalsX - 45, summaryY);
  doc.text(`₹${Number(data.gst || 0).toLocaleString('en-IN')}`, totalsX, summaryY, { align: 'right' });

  summaryY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', totalsX - 45, summaryY);
  doc.text(`₹${Number(data.total || 0).toLocaleString('en-IN')}`, totalsX, summaryY, { align: 'right' });

  summaryY += 3;
  doc.setDrawColor(209, 213, 219);
  doc.line(totalsX - 60, summaryY, totalsX, summaryY);
  summaryY += 5;

  doc.setFont('helvetica', 'normal');
  doc.text('Courier charge', totalsX - 45, summaryY);
  doc.text(`₹${Number(data.courier_charge || 0).toLocaleString('en-IN')}`, totalsX, summaryY, { align: 'right' });

  summaryY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text('GRAND TOTAL', totalsX - 45, summaryY);
  doc.text(`₹${Number(data.grand_total || 0).toLocaleString('en-IN')}`, totalsX, summaryY, { align: 'right' });

  // 6. Footer (Left: Phone/Email/Notice; Right: Signatory)
  const footerY = pageHeight - 35;

  // Left
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  doc.text(data.phone || '+91 70101 77745', 14, footerY);
  doc.text(data.email || 'layercraft3dprint@gmail.com', 14, footerY + 4);
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(data.notice || '***Seperate shipping charges will be applicable', 14, footerY + 9);

  // Right Signatory
  const sigCenterX = pageWidth - 45;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.4);
  doc.line(sigCenterX - 25, footerY + 3, sigCenterX + 25, footerY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text((data.signatory_name || 'GOKUL KITTUSAMY').toUpperCase(), sigCenterX, footerY + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(data.signatory_title || 'Founder & CEO', sigCenterX, footerY + 11, { align: 'center' });

  // Bottom Right Geometric Accent
  doc.setFillColor(30, 58, 138);
  doc.triangle(pageWidth - 40, pageHeight, pageWidth, pageHeight - 15, pageWidth, pageHeight, 'F');

  // Trigger browser file download directly
  const fileName = `Invoice_${data.invoice_no || 'Custom'}.pdf`;
  doc.save(fileName);
}
