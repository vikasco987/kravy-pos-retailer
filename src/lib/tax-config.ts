// Central Tax and Localization Configuration Helper for Kravy POS

export interface TaxLocalizationConfig {
  code: string;
  name: string;
  symbol: string;         // e.g. "₹", "AED", "SAR", "$", "GBP", "EUR", "CAD", "AUD", "JPY"
  taxName: string;        // e.g. "GST", "VAT", "Sales Tax", "Tax"
  taxIdLabel: string;     // e.g. "GSTIN", "TRN", "VAT No.", "Tax ID", "Business No."
  isSplitTax: boolean;    // true only for India (CGST + SGST split)
}

export const SUPPORTED_LOCALIZATIONS: TaxLocalizationConfig[] = [
  {
    code: "INR",
    name: "India (Indian Rupee)",
    symbol: "₹",
    taxName: "GST",
    taxIdLabel: "GSTIN",
    isSplitTax: true,
  },
  {
    code: "AED",
    name: "United Arab Emirates (UAE Dirham)",
    symbol: "AED",        // Text based as per user request (no Arabic glyph symbol)
    taxName: "VAT",
    taxIdLabel: "TRN",
    isSplitTax: false,
  },
  {
    code: "SAR",
    name: "Saudi Arabia (Saudi Riyal)",
    symbol: "SAR",        // Text based as per user request
    taxName: "VAT",
    taxIdLabel: "VAT No.",
    isSplitTax: false,
  },
  {
    code: "USD",
    name: "United States (US Dollar)",
    symbol: "$",
    taxName: "Sales Tax",
    taxIdLabel: "Tax ID",
    isSplitTax: false,
  },
  {
    code: "GBP",
    name: "United Kingdom (British Pound)",
    symbol: "GBP",        // Text based as per user request
    taxName: "VAT",
    taxIdLabel: "VAT Reg No.",
    isSplitTax: false,
  },
  {
    code: "EUR",
    name: "European Union (Euro)",
    symbol: "EUR",        // Text based as per user request
    taxName: "VAT",
    taxIdLabel: "VAT No.",
    isSplitTax: false,
  },
  {
    code: "CAD",
    name: "Canada (Canadian Dollar)",
    symbol: "CAD",        // Text code as per user request
    taxName: "GST",
    taxIdLabel: "Business No.",
    isSplitTax: false,
  },
  {
    code: "AUD",
    name: "Australia (Australian Dollar)",
    symbol: "AUD",        // Text code as per user request
    taxName: "GST",
    taxIdLabel: "ABN",
    isSplitTax: false,
  },
  {
    code: "JPY",
    name: "Japan (Japanese Yen)",
    symbol: "¥",
    taxName: "Tax",
    taxIdLabel: "Tax ID",
    isSplitTax: false,
  },
];

export const getTaxConfig = (codeOrSymbol?: string): TaxLocalizationConfig => {
  if (!codeOrSymbol) return SUPPORTED_LOCALIZATIONS[0];
  
  const normalized = codeOrSymbol.trim().toUpperCase();
  
  // First match by code (INR, AED, USD, etc.)
  const byCode = SUPPORTED_LOCALIZATIONS.find(loc => loc.code.toUpperCase() === normalized);
  if (byCode) return byCode;

  // Match by symbol or partial
  const bySymbol = SUPPORTED_LOCALIZATIONS.find(loc => loc.symbol.toUpperCase() === normalized);
  if (bySymbol) return bySymbol;

  // Fallback to INR default
  return SUPPORTED_LOCALIZATIONS[0];
};
