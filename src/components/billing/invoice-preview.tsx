
"use client";

import * as React from "react";
import { format } from 'date-fns';
import QRCode from 'qrcode';
import Image from 'next/image';

const numberToWords = (num: number): string => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    if (!num) return 'Zero';
    if ((num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += (n[2] != '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += (n[3] != '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += (n[4] != '00') ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1) + " Only";
}

// Simplified version of the invoice type from invoices/page.tsx
type Invoice = {
  id: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  raw: any; // Simplified raw data
}

type Customer = {
  id: string;
  name: string;
  address1?: string;
  gstin?: string;
  [key: string]: any;
};

interface InvoicePreviewProps {
  invoice: Invoice;
  customers: Customer[];
}

export const InvoicePreview = React.forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoice, customers }, ref) => {
    const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState('');

    const customerDetails = customers.find(c => c.id === invoice.raw.customerId);
    const companyDetails = { name: "ZenithBooks Solutions Pvt. Ltd.", address: "123 Business Avenue, Commerce City, Maharashtra - 400001", gstin: "27ABCDE1234F1Z5", pan: "ABCDE1234F", bankName: "HDFC Bank", bankAccount: "1234567890", bankIfsc: "HDFC0001234", upiId: "zenithbooks@okhdfcbank" };

    const salesLine = invoice.raw.lines.find((l: any) => l.account === '4010');
    const taxLine = invoice.raw.lines.find((l: any) => l.account === '2110');
    const subtotal = parseFloat(salesLine?.credit || '0');
    const taxAmount = parseFloat(taxLine?.credit || '0');
    const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
    
    // Placeholder for multiple items if structure allows
    const items = [{
        description: "Service as per narration",
        hsn: "9983",
        qty: 1,
        rate: subtotal,
        taxableValue: subtotal,
        taxAmount: taxAmount,
        total: invoice.amount
    }];
    
    React.useEffect(() => {
        if (companyDetails.upiId) {
            const upiString = `upi://pay?pa=${companyDetails.upiId}&pn=${encodeURIComponent(companyDetails.name)}&am=${invoice.amount.toFixed(2)}&cu=INR&tn=${invoice.id}`;
            QRCode.toDataURL(upiString, (err, url) => {
                if (err) {
                    console.error("Could not generate QR code", err);
                    return;
                }
                setQrCodeDataUrl(url);
            });
        }
    }, [companyDetails.upiId, companyDetails.name, invoice.amount, invoice.id]);


    return (
      <div ref={ref} className="bg-white p-8 text-black font-sans text-xs">
            <header className="text-center border-b-2 border-slate-700 pb-4 mb-8">
                <h1 className="text-2xl font-bold m-0 text-slate-800">TAX INVOICE</h1>
            </header>

            <section className="grid grid-cols-2 gap-4 mb-8">
                <div>
                    <h2 className="font-bold text-sm">{companyDetails.name}</h2>
                    <p>{companyDetails.address}</p>
                    <p><strong>GSTIN:</strong> {companyDetails.gstin}</p>
                </div>
                <div className="text-right">
                    <p><strong>Invoice No:</strong> {invoice.id}</p>
                    <p><strong>Date:</strong> {format(new Date(invoice.date), "dd-MMM-yyyy")}</p>
                    <p><strong>Due Date:</strong> {format(new Date(invoice.dueDate), "dd-MMM-yyyy")}</p>
                </div>
            </section>

            <section className="mb-8">
                <h3 className="font-bold border p-2 bg-slate-100">Bill To:</h3>
                <div className="border p-2 border-t-0">
                    <p className="font-bold">{customerDetails?.name || invoice.customer}</p>
                    <p>{customerDetails?.address1 || 'N/A'}</p>
                    <p><strong>GSTIN:</strong> {customerDetails?.gstin || 'Unregistered'}</p>
                </div>
            </section>
            
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-700 text-white">
                        <th className="p-2 border">#</th>
                        <th className="p-2 border">Item & Description</th>
                        <th className="p-2 border">HSN</th>
                        <th className="p-2 border text-right">Qty</th>
                        <th className="p-2 border text-right">Rate</th>
                        <th className="p-2 border text-right">Taxable Value</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td className="p-2 border">{index + 1}</td>
                            <td className="p-2 border">{item.description}</td>
                            <td className="p-2 border">{item.hsn}</td>
                            <td className="p-2 border text-right">{item.qty}</td>
                            <td className="p-2 border text-right">{item.rate.toFixed(2)}</td>
                            <td className="p-2 border text-right">{item.taxableValue.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <section className="grid grid-cols-2 mt-4">
                <div className="space-y-2">
                    <p className="font-bold">Amount in words:</p>
                    <p>{numberToWords(invoice.amount)}</p>
                    <div className="pt-4">
                        <p className="font-bold">Bank Details:</p>
                        <p>Bank: {companyDetails.bankName}</p>
                        <p>A/c No: {companyDetails.bankAccount}</p>
                        <p>IFSC: {companyDetails.bankIfsc}</p>
                    </div>
                    {qrCodeDataUrl && (
                        <div className="pt-4">
                            <p className="font-bold">Scan QR Code to Pay:</p>
                            <Image src={qrCodeDataUrl} alt="UPI QR Code" width={100} height={100} />
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <table className="w-full max-w-xs ml-auto">
                        <tbody>
                            <tr><td className="p-1">Subtotal:</td><td className="p-1 font-mono">{subtotal.toFixed(2)}</td></tr>
                            <tr><td className="p-1">IGST @ {taxRate.toFixed(2)}%:</td><td className="p-1 font-mono">{taxAmount.toFixed(2)}</td></tr>
                            <tr className="font-bold border-t-2 border-b-2 border-slate-700 text-sm">
                                <td className="p-2">Grand Total:</td>
                                <td className="p-2 font-mono">₹{invoice.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <footer className="mt-16 text-right">
                <p>For {companyDetails.name}</p>
                <div className="h-20"></div>
                <p className="border-t pt-1">Authorised Signatory</p>
            </footer>
      </div>
    );
  }
);

InvoicePreview.displayName = "InvoicePreview";

    