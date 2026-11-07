// Corporate Tax Invoicing & Carbon Credits Engine
// Generates official GST-compliant tax invoices with HSN 996412 and UPI QR integration

import { RideRequest, RideTaxInvoice } from "./types";
import { evEngine } from "./evEngine";

export class InvoiceEngine {
  // Generates a fully calculated GST Tax Invoice from a RideRequest
  generateInvoice(ride: RideRequest): RideTaxInvoice {
    const totalFare = ride.fareInr || 350;
    // GST 5% reverse calculation: Total = Base + 5% GST
    // Total = Net * 1.05 -> Net = Total / 1.05
    const netFare = +(totalFare / 1.05).toFixed(2);
    const totalGst = +(totalFare - netFare).toFixed(2);
    const cgst = +(totalGst / 2).toFixed(2);
    const sgst = +(totalGst / 2).toFixed(2);

    const baseFare = Math.round(netFare * 0.7);
    const distanceFare = +(netFare - baseFare).toFixed(2);
    const platformFee = Math.round(totalFare * 0.18);

    const invoiceNumber = `UBR-INV-${new Date().getFullYear()}-${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const carbonSavedKg = evEngine.calculateCarbonSavingsKg(
      ride.distanceKm || 12.4,
      ride.vehicleType || "UBER_GO"
    );

    // UPI Deep-link QR format
    const upiQrString = `upi://pay?pa=uber.india.mobility@icici&pn=Uber%20India%20Technologies%20Pvt%20Ltd&am=${totalFare}.00&cu=INR&tn=${invoiceNumber}`;

    return {
      invoiceNumber,
      hsnCode: "996412", // SAC / HSN Code for Passenger Transportation Services by Road
      gstin: "29AABCU9603R1ZM", // Uber India Systems Pvt Ltd GSTIN (Karnataka)
      sacCode: "996412",
      tripId: ride.id,
      riderName: ride.riderName || "Corporate Rider",
      riderPhone: ride.riderPhone || "+91 98450 12890",
      driverName: ride.driverName || "Suresh Kumar (Partner)",
      driverPhone: ride.driverPhone || "+91 97112 40591",
      vehicleModel: ride.vehicleModel || "Maruti Suzuki Dzire Tour",
      licensePlate: ride.licensePlate || "KA 01 MJ 8492",
      pickup: ride.pickupAddress || "Bengaluru Metro Hub",
      dropoff: ride.dropoffAddress || "Kempegowda Int'l Airport",
      distanceKm: ride.distanceKm || 14.2,
      durationMin: ride.durationMin || 28,
      baseFare,
      distanceFare: +distanceFare,
      surgeMultiplier: ride.surgeMultiplier || 1.0,
      surgeBonus: ride.surgeBonusInr || 0,
      cgstInr: cgst,
      sgstInr: sgst,
      platformFeeInr: platformFee,
      totalInr: totalFare,
      carbonSavedKg,
      upiQrString,
      issuedAt: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      paymentMode: ride.paymentMode || "GOOGLE_PAY_UPI",
    };
  }
}

export const invoiceEngine = new InvoiceEngine();
