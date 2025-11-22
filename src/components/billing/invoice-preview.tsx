
"use client";

import * as React from "react";
import { format } from 'date-fns';
import QRCode from 'qrcode';
import Image from 'next/image';
import { defaultBrandingSettings, readBrandingSettings, type BrandingSettings } from "@/lib/branding";

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
    const [companyDetails, setCompanyDetails] = React.useState<BrandingSettings>(defaultBrandingSettings);

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
        if (typeof window === "undefined") return;
        setCompanyDetails(readBrandingSettings());
    }, []);

    React.useEffect(() => {
        if (companyDetails.upiId) {
            const upiString = `upi://pay?pa=${companyDetails.upiId}&pn=${encodeURIComponent(companyDetails.companyName)}&am=${invoice.amount.toFixed(2)}&cu=INR&tn=${invoice.id}`;
            QRCode.toDataURL(upiString, (err, url) => {
                if (err) {
                    console.error("Could not generate QR code", err);
                    return;
                }
                setQrCodeDataUrl(url);
            });
        }
    }, [companyDetails.upiId, companyDetails.companyName, invoice.amount, invoice.id]);

    const companyAddress = React.useMemo(() => {
        const parts = [
            companyDetails.address1,
            companyDetails.address2,
            `${companyDetails.city}, ${companyDetails.state} - ${companyDetails.pincode}`,
        ].filter(Boolean);
        return parts.join(", ");
    }, [companyDetails]);


    return (
      <div ref={ref} className="bg-white p-4 sm:p-8 text-black font-sans text-xs max-w-full overflow-x-auto">
            <header className="text-center border-b-2 border-slate-700 pb-4 mb-8">
                <h1 className="text-2xl font-bold m-0 text-slate-800">TAX INVOICE</h1>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div>
                    <h2 className="font-bold text-sm">{companyDetails.companyName}</h2>
                    <p className="text-xs">{companyAddress}</p>
                    <p className="text-xs"><strong>GSTIN:</strong> {companyDetails.gstin}</p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-xs"><strong>Invoice No:</strong> {invoice.id}</p>
                    <p className="text-xs"><strong>Date:</strong> {format(new Date(invoice.date), "dd-MMM-yyyy")}</p>
                    <p className="text-xs"><strong>Due Date:</strong> {format(new Date(invoice.dueDate), "dd-MMM-yyyy")}</p>
                </div>
            </section>

            <section className="mb-8">
                <h3 className="font-bold border p-2 bg-slate-100 text-sm">Bill To:</h3>
                <div className="border p-3 border-t-0">
                    <p className="font-bold text-sm">{customerDetails?.name || invoice.customer}</p>
                    <p className="text-xs">{customerDetails?.address1 || 'N/A'}</p>
                    <p className="text-xs"><strong>GSTIN:</strong> {customerDetails?.gstin || 'Unregistered'}</p>
                </div>
            </section>
            
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-700 text-white">
                            <th className="p-2 border text-xs">#</th>
                            <th className="p-2 border text-xs">Item & Description</th>
                            <th className="p-2 border text-xs">HSN</th>
                            <th className="p-2 border text-xs text-right">Qty</th>
                            <th className="p-2 border text-xs text-right">Rate</th>
                            <th className="p-2 border text-xs text-right">Taxable Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td className="p-2 border text-xs">{index + 1}</td>
                                <td className="p-2 border text-xs">{item.description}</td>
                                <td className="p-2 border text-xs">{item.hsn}</td>
                                <td className="p-2 border text-xs text-right">{item.qty}</td>
                                <td className="p-2 border text-xs text-right">{item.rate.toFixed(2)}</td>
                                <td className="p-2 border text-xs text-right">{item.taxableValue.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h4 className="font-semibold text-sm text-gray-900">{item.description}</h4>
                                <p className="text-xs text-gray-600">HSN: {item.hsn}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold">#{index + 1}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-xs">
                            <div className="text-center">
                                <p className="text-gray-600">Qty</p>
                                <p className="font-semibold">{item.qty}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-600">Rate</p>
                                <p className="font-semibold">₹{item.rate.toFixed(2)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-gray-600">Taxable Value</p>
                                <p className="font-semibold">₹{item.taxableValue.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop totals */}
            <section className="hidden sm:grid sm:grid-cols-2 mt-4 gap-8">
                <div className="space-y-2">
                    <p className="font-bold text-sm">Amount in words:</p>
                    <p className="text-xs">{numberToWords(invoice.amount)}</p>
                    <div className="pt-4">
                        <p className="font-bold text-sm">Bank Details:</p>
                        <p className="text-xs">Bank: {companyDetails.bankName}</p>
                        <p className="text-xs">A/c No: {companyDetails.bankAccount}</p>
                        <p className="text-xs">IFSC: {companyDetails.bankIfsc}</p>
                    </div>
                    {qrCodeDataUrl && (
                        <div className="pt-4">
                            <p className="font-bold text-sm">Scan QR Code to Pay:</p>
                            <Image src={qrCodeDataUrl} alt="UPI QR Code" width={100} height={100} className="mx-auto" />
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <table className="w-full max-w-xs ml-auto text-xs">
                        <tbody>
                            <tr><td className="p-1">Subtotal:</td><td className="p-1 font-mono">{subtotal.toFixed(2)}</td></tr>
                            <tr><td className="p-1">IGST @ {taxRate.toFixed(2)}%:</td><td className="p-1 font-mono">{taxAmount.toFixed(2)}</td></tr>
                            <tr className="font-bold border-t-2 border-b-2 border-slate-700">
                                <td className="p-2">Grand Total:</td>
                                <td className="p-2 font-mono">₹{invoice.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Mobile totals */}
            <section className="sm:hidden mt-6 space-y-6">
                {/* Amount breakdown */}
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-bold text-sm mb-3 text-center">Amount Summary</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-sm">Subtotal:</span>
                            <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm">IGST @ {taxRate.toFixed(2)}%:</span>
                            <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-base">
                            <span>Grand Total:</span>
                            <span className="font-mono">₹{invoice.amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Amount in words */}
                <div>
                    <p className="font-bold text-sm mb-1">Amount in words:</p>
                    <p className="text-sm italic">{numberToWords(invoice.amount)}</p>
                </div>

                {/* Bank details */}
                <div>
                    <p className="font-bold text-sm mb-2">Bank Details:</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                        <p><strong>Bank:</strong> {companyDetails.bankName}</p>
                        <p><strong>A/c No:</strong> {companyDetails.bankAccount}</p>
                        <p><strong>IFSC:</strong> {companyDetails.bankIfsc}</p>
                    </div>
                </div>

                {/* QR Code */}
                {qrCodeDataUrl && (
                    <div className="text-center">
                        <p className="font-bold text-sm mb-2">Scan QR Code to Pay:</p>
                        <Image src={qrCodeDataUrl} alt="UPI QR Code" width={120} height={120} className="mx-auto border rounded-lg" />
                    </div>
                )}
            </section>

            <footer className="mt-12 sm:mt-16 text-center sm:text-right">
                <p className="text-sm">For {companyDetails.companyName}</p>
                <div className="h-16 sm:h-20"></div>
                <p className="border-t border-gray-400 pt-2 text-sm">Authorised Signatory</p>
            </footer>
      </div>
    );
  }
);

InvoicePreview.displayName = "InvoicePreview";

    