"use client";
import React, { createContext, useContext } from "react";

const CurrencyContext = createContext<{ currencyCode: string; currencySymbol: string }>({
  currencyCode: "INR",
  currencySymbol: "₹",
});

export const CurrencyProvider = ({ children, currencyCode, currencySymbol }: { children: React.ReactNode, currencyCode?: string, currencySymbol?: string }) => {
  return (
    <CurrencyContext.Provider value={{ currencyCode: currencyCode || "INR", currencySymbol: currencySymbol || "₹" }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
