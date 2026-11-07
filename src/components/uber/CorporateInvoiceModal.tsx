"use client";

import React, { useRef } from "react";
import { RideRequest } from "@/lib/uber/types";
import { invoiceEngine } from "@/lib/uber/invoiceEngine";
import {
  FileText,
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  Leaf,
  QrCode,
  Sparkles,
} from "lucide-react";

interface CorporateInvoiceModalProps {
  ride: RideRequest;
  isOpen: boolean;
  onClose: () => void;
}

export default function CorporateInvoiceModal({
  ride,
  isOpen,
  onClose,
}: CorporateInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const invoice = invoiceEngine.generateInvoice(ride);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 shadow-2xl text-white space-y-6">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight uppercase">
                Tax Invoice & Carbon Certificate
              </h3>
              <p className="text-xs text-zinc-400 font-mono">
                GSTIN: {invoice.gstin} &bull; SAC: {invoice.sacCode}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Invoice Body */}
        <div
          ref={printRef}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6 text-zinc-300"
        >
          {/* Company & Invoice Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-tight text-white">
                  Uber
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  INDIA
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Uber India Systems Private Limited
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Regd. Office: Regus Level 13, Bandra Kurla Complex, Mumbai, MH - 400051
              </p>
            </div>

            <div className="sm:text-right font-mono text-xs space-y-1">
              <div className="text-emerald-400 font-bold text-sm">
                TAX INVOICE
              </div>
              <div className="text-white font-bold">{invoice.invoiceNumber}</div>
              <div className="text-zinc-400">Date: {invoice.issuedAt}</div>
              <div className="text-zinc-500">Trip ID: {invoice.tripId}</div>
            </div>
          </div>

          {/* Passenger & Driver Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
            <div>
              <span className="text-zinc-500 block uppercase text-[10px]">
                Passenger (Billed To)
              </span>
              <span className="text-white font-bold">{invoice.riderName}</span>
              <span className="text-zinc-400 block">{invoice.riderPhone}</span>
              <span className="text-zinc-400 block mt-1">
                HSN Code: <strong className="text-zinc-200">{invoice.hsnCode}</strong> (Passenger Road Transport)
              </span>
            </div>

            <div>
              <span className="text-zinc-500 block uppercase text-[10px]">
                Commercial Driver & Vehicle
              </span>
              <span className="text-white font-bold">{invoice.driverName}</span>
              <span className="text-zinc-400 block">
                {invoice.vehicleModel} &bull; {invoice.licensePlate}
              </span>
              <span className="text-zinc-400 block mt-1">
                Payment: <strong className="text-emerald-400">{invoice.paymentMode}</strong>
              </span>
            </div>
          </div>

          {/* Route Corridor */}
          <div className="text-xs space-y-1.5 font-mono">
            <div className="flex items-start space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span className="text-zinc-400">
                Pickup: <strong className="text-white">{invoice.pickup}</strong>
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
              <span className="text-zinc-400">
                Dropoff: <strong className="text-white">{invoice.dropoff}</strong>
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 pl-4">
              Total Distance: {invoice.distanceKm} km &bull; Duration: {invoice.durationMin} mins
            </div>
          </div>

          {/* Itemized Fare & Tax Table */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs">
            <div className="bg-zinc-950 px-4 py-2 text-zinc-400 font-bold flex justify-between border-b border-zinc-800">
              <span>Description</span>
              <span>Amount (INR)</span>
            </div>
            <div className="divide-y divide-zinc-800/60 px-4 py-2 space-y-2">
              <div className="flex justify-between text-zinc-300 pt-1">
                <span>Base Fare & Initial Pickup Distance</span>
                <span>₹{invoice.baseFare}.00</span>
              </div>
              <div className="flex justify-between text-zinc-300 pt-2">
                <span>Distance Transit Rate ({invoice.distanceKm} km)</span>
                <span>₹{invoice.distanceFare}</span>
              </div>
              {invoice.surgeBonus > 0 && (
                <div className="flex justify-between text-amber-400 pt-2">
                  <span>Michelangelo Dynamic Surge Multiplier ({invoice.surgeMultiplier}x)</span>
                  <span>+₹{invoice.surgeBonus}.00</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400 pt-2">
                <span>CGST (Central Tax @ 2.5%)</span>
                <span>₹{invoice.cgstInr}</span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-2">
                <span>SGST (State Tax @ 2.5%)</span>
                <span>₹{invoice.sgstInr}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-sm pt-3 border-t border-zinc-800">
                <span>Total Amount Paid (Inclusive of Taxes)</span>
                <span className="text-emerald-400 text-base">₹{invoice.totalInr}.00</span>
              </div>
            </div>
          </div>

          {/* Green Carbon Credit Certificate Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300 flex items-center space-x-1">
                  <span>Green Mobility Carbon Certificate</span>
                  <Sparkles className="h-3 w-3" />
                </div>
                <p className="text-[11px] text-zinc-400">
                  Estimated {invoice.carbonSavedKg} kg of CO₂ emissions offset compared to legacy single-occupant combustion engines.
                </p>
              </div>
            </div>
            <div className="text-right font-mono flex-shrink-0">
              <span className="text-[10px] text-zinc-500 block">CO₂ OFFSET</span>
              <span className="text-base font-black text-emerald-400">
                {invoice.carbonSavedKg} kg
              </span>
            </div>
          </div>

          {/* Dynamic UPI Payment Stamp */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4 text-xs font-mono text-zinc-500">
            <div className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-zinc-400" />
              <div>
                <span className="text-zinc-300 font-bold block">
                  UPI Dynamic Payment Verified
                </span>
                <span className="text-[10px]">
                  VPA: uber.india.mobility@icici
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] text-zinc-500">
              This is a computer-generated invoice; no physical signature required.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
