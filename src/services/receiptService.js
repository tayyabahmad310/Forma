/**
 * Receipt Generation & Sharing Service
 * Generates offline PDF receipts and sends them to Android Print / Share intents.
 * 100% offline - requires no external CSS or web assets.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils/currency';
import { formatDate, formatTime } from '../utils/date';

/**
 * Generate formatted HTML template for clothing store receipt
 */
export function buildReceiptHtml({
  sale,
  items,
  payments = [],
  settings = {},
}) {
  const businessName = settings.business_name || 'Clothio Apparel';
  const businessPhone = settings.business_phone || '';
  const businessAddress = settings.business_address || '';
  const receiptFooter = settings.receipt_footer || 'Thank you for shopping with us!';
  const currencySymbol = settings.currency_symbol || 'Rs';

  const dateFormatted = formatDate(sale.sale_date);
  const timeFormatted = formatTime(sale.created_at);

  const itemsHtml = items.map((item, index) => {
    const unitPrice = formatCurrency(item.custom_unit_price || item.unit_price_snapshot, currencySymbol);
    const lineDiscount = item.discount_amount > 0 ? ` (-${formatCurrency(item.discount_amount, currencySymbol)})` : '';
    const lineTotal = formatCurrency(item.subtotal, currencySymbol);

    return `
      <tr style="border-bottom: 1px dashed #d1d5db;">
        <td style="padding: 8px 4px; vertical-align: top; text-align: left;">
          <div style="font-weight: 600; font-size: 13px; color: #111827;">${item.product_name_snapshot}</div>
          <div style="font-size: 11px; color: #6b7280;">${item.variant_name_snapshot}</div>
        </td>
        <td style="padding: 8px 4px; vertical-align: top; text-align: center; font-size: 13px;">${item.quantity}</td>
        <td style="padding: 8px 4px; vertical-align: top; text-align: right; font-size: 13px;">${unitPrice}</td>
        <td style="padding: 8px 4px; vertical-align: top; text-align: right; font-size: 13px; font-weight: 600;">${lineTotal}${lineDiscount}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Receipt - ${sale.invoice_number}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #111827;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.4;
          }
          .receipt-box {
            max-width: 380px;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 16px;
            margin-bottom: 16px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
            color: #111827;
          }
          .brand-meta {
            font-size: 11px;
            color: #4b5563;
            margin: 2px 0;
          }
          .meta-table {
            width: 100%;
            margin-bottom: 16px;
            font-size: 12px;
          }
          .meta-table td {
            padding: 2px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          .items-table th {
            border-bottom: 1px solid #111827;
            padding: 6px 4px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .totals-table {
            width: 100%;
            border-top: 1px solid #111827;
            padding-top: 8px;
            margin-bottom: 16px;
            font-size: 13px;
          }
          .totals-table td {
            padding: 3px 0;
          }
          .grand-total {
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            border-top: 1px dashed #9ca3af;
            border-bottom: 1px dashed #9ca3af;
            padding: 6px 0;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #6b7280;
            border-top: 1px dashed #e5e7eb;
            padding-top: 12px;
            margin-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <h1 class="brand-title">${businessName}</h1>
            ${businessAddress ? `<div class="brand-meta">${businessAddress}</div>` : ''}
            ${businessPhone ? `<div class="brand-meta">Tel: ${businessPhone}</div>` : ''}
          </div>

          <table class="meta-table">
            <tr>
              <td style="font-weight: 600;">Invoice:</td>
              <td style="text-align: right; font-weight: 600;">${sale.invoice_number}</td>
            </tr>
            <tr>
              <td style="color: #6b7280;">Date:</td>
              <td style="text-align: right;">${dateFormatted} ${timeFormatted ? `(${timeFormatted})` : ''}</td>
            </tr>
            <tr>
              <td style="color: #6b7280;">Customer:</td>
              <td style="text-align: right; font-weight: 500;">${sale.customer_name_snapshot || 'Walk-in Customer'}</td>
            </tr>
            ${sale.customer_phone_snapshot ? `
            <tr>
              <td style="color: #6b7280;">Contact:</td>
              <td style="text-align: right;">${sale.customer_phone_snapshot}</td>
            </tr>` : ''}
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #4b5563;">Subtotal:</td>
              <td style="text-align: right; font-weight: 500;">${formatCurrency(sale.subtotal, currencySymbol)}</td>
            </tr>
            ${sale.discount_amount > 0 ? `
            <tr>
              <td style="color: #dc2626;">Discount:</td>
              <td style="text-align: right; color: #dc2626; font-weight: 600;">-${formatCurrency(sale.discount_amount, currencySymbol)}</td>
            </tr>` : ''}
            <tr class="grand-total">
              <td>Net Total:</td>
              <td style="text-align: right;">${formatCurrency(sale.total_amount, currencySymbol)}</td>
            </tr>
            <tr>
              <td style="padding-top: 6px; color: #059669; font-weight: 600;">Paid (${sale.payment_method}):</td>
              <td style="padding-top: 6px; text-align: right; color: #059669; font-weight: 600;">${formatCurrency(sale.paid_amount, currencySymbol)}</td>
            </tr>
            ${sale.balance_amount > 0 ? `
            <tr>
              <td style="color: #d97706; font-weight: 700;">Remaining Balance:</td>
              <td style="text-align: right; color: #d97706; font-weight: 700;">${formatCurrency(sale.balance_amount, currencySymbol)}</td>
            </tr>` : `
            <tr>
              <td style="color: #6b7280;">Status:</td>
              <td style="text-align: right; color: #059669; font-weight: 600;">FULLY PAID</td>
            </tr>`}
          </table>

          <div class="footer">
            <p>${receiptFooter}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate a PDF file from sale details and trigger Android Share dialog
 */
export async function shareReceiptPdf({ sale, items, payments = [], settings = {} }) {
  const html = buildReceiptHtml({ sale, items, payments, settings });
  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share Receipt ${sale.invoice_number}`,
      UTI: 'com.adobe.pdf',
    });
    return uri;
  } else {
    throw new Error('Sharing is not available on this device');
  }
}

/**
 * Directly print the receipt using Android print spooler
 */
export async function printReceiptDirect({ sale, items, payments = [], settings = {} }) {
  const html = buildReceiptHtml({ sale, items, payments, settings });
  await Print.printAsync({ html });
}
