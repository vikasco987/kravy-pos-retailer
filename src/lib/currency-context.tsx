"use client";
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import { getTaxConfig, TaxLocalizationConfig } from "./tax-config";

interface CurrencyContextValue {
  currencyCode: string;
  currencySymbol: string;
  taxConfig: TaxLocalizationConfig;
  setCurrency: (code: string, symbol: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currencyCode: "INR",
  currencySymbol: "₹",
  taxConfig: getTaxConfig("INR"),
  setCurrency: () => {},
});

export const CurrencyProvider = ({ 
  children, 
  currencyCode: initialCode, 
  currencySymbol: initialSymbol 
}: { 
  children: React.ReactNode; 
  currencyCode?: string | null; 
  currencySymbol?: string | null; 
}) => {
  const [activeCode, setActiveCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kravy_currency_code") || initialCode || "INR";
    }
    return initialCode || "INR";
  });

  const [activeSymbol, setActiveSymbol] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("kravy_currency_symbol") || initialSymbol || "₹";
    }
    return initialSymbol || "₹";
  });

  // Sync when initial props update from DB/profile
  useEffect(() => {
    if (initialCode) {
      setActiveCode(initialCode);
      if (typeof window !== "undefined") localStorage.setItem("kravy_currency_code", initialCode);
    }
    if (initialSymbol) {
      setActiveSymbol(initialSymbol);
      if (typeof window !== "undefined") localStorage.setItem("kravy_currency_symbol", initialSymbol);
    }
  }, [initialCode, initialSymbol]);

  // Listen to cross-window or instantaneous in-tab storage/custom events
  useEffect(() => {
    const handleStorage = () => {
      const storedCode = localStorage.getItem("kravy_currency_code");
      const storedSym = localStorage.getItem("kravy_currency_symbol");
      if (storedCode) setActiveCode(storedCode);
      if (storedSym) setActiveSymbol(storedSym);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("kravy_currency_changed", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kravy_currency_changed", handleStorage);
    };
  }, []);

  const setCurrency = useCallback((code: string, symbol: string) => {
    setActiveCode(code);
    setActiveSymbol(symbol);
    if (typeof window !== "undefined") {
      localStorage.setItem("kravy_currency_code", code);
      localStorage.setItem("kravy_currency_symbol", symbol);
      window.dispatchEvent(new Event("kravy_currency_changed"));
    }
  }, []);

  const taxConfig = useMemo(() => {
    return getTaxConfig(activeCode || activeSymbol || "INR");
  }, [activeCode, activeSymbol]);

  const resolvedSymbol = activeSymbol || taxConfig.symbol || "₹";

  return (
    <CurrencyContext.Provider 
      value={{ 
        currencyCode: activeCode || taxConfig.code || "INR", 
        currencySymbol: resolvedSymbol,
        taxConfig,
        setCurrency
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);


