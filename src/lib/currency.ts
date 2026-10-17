export const formatCurrency = (amount: number, symbol: string = "₹") => {
  const num = Number(amount);
  if (isNaN(num)) return `${symbol}0.00`;
  
  // Format depending on the currency to get commas right (e.g. 1,00,000 for INR, 100,000 for others)
  // Since we only know the symbol here, we can infer formatting style.
  // This is a minimal formatting helper that does not modify existing calculations.
  
  if (symbol === "₹") {
    // Indian formatting
    return `${symbol}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (symbol === "د.إ") {
    // AED formatting with a space
    return `${symbol} ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (symbol === "¥") {
    // Japanese Yen (no decimals usually, but keeping 2 to not break any existing tests)
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  
  // Default western formatting
  return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
