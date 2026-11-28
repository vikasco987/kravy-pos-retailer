"use client";


import { SidebarProvider } from "@/components/SidebarContext";
import { SearchProvider } from "@/components/SearchContext";
import ThemeProvider from "@/components/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { ConfirmProvider } from "@/components/ConfirmContext";
import FetchInterceptor from "@/components/FetchInterceptor";
import { OfflineProvider } from "@/components/OfflineContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <OfflineProvider>
          <FetchInterceptor />
          <SidebarProvider>
            <SearchProvider>
              <Toaster position="top-right" />
              {children}
            </SearchProvider>
          </SidebarProvider>
        </OfflineProvider>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
