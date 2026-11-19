/**
 * Business Mode Configuration Engine
 * Kravy Universal POS Platform (Restaurant, Retail, Garments, Electronics, General Business)
 *
 * Architecture Principles:
 * 1. ONE PLATFORM, ONE BILLING ENGINE, ONE DATABASE ARCHITECTURE.
 * 2. Adaptive Navigation & Terminology based on merchant business profile.
 * 3. Zero regressions: Restaurant retains KOT, KDS, Table Grid, Dining QR 100%.
 * 4. Retail/General stores get fast Barcode-first workflows, Order Queue/Station List views, and non-restaurant terminology.
 */

export type BusinessType =
  | "food"         // Restaurant, Cafe, QSR, Bakery, Cloud Kitchen
  | "retail"       // Grocery, Supermarket, Mini Mart
  | "fashion"      // Garments, Clothing, Footwear, Boutique
  | "electronics"  // Electronics, Mobile Store, Computer Hardware
  | "general"      // General Store, Wholesale, Stationery, Hardware
  | "service"      // Salon, Spa, Repair, Auto Services
  | "fuel";        // Petrol Pump, Fuel Station

export interface BusinessModeConfig {
  id: BusinessType;
  label: string;
  category: "dining" | "retail" | "service";
  
  // Terminology adaptations
  terminology: {
    unitSingular: string;      // "Table" vs "Station" / "Counter" / "Section"
    unitPlural: string;        // "Tables" vs "Stations" / "Counters" / "Sections"
    catalog: string;           // "Menu" vs "Products" / "Catalog"
    orderTypeDining: string;   // "Dine In" vs "In-Store" / "Counter Sale"
    orderTypeTakeaway: string; // "Takeaway" vs "Pickup"
    orderTypeDelivery: string; // "Delivery" vs "Shipment" / "Home Delivery"
    customerAction: string;    // "Dine-in Customer" vs "Shopper" / "Client"
  };

  // Feature Toggles
  features: {
    showTableGrid: boolean;       // Visual layout for dining floors or station grids
    showKOT: boolean;             // Kitchen Order Token (Restaurant only)
    showKDS: boolean;             // Kitchen Display System
    showBarcodeFirst: boolean;    // Auto-focus barcode input for instant scan-to-cart
    showStations: boolean;        // Floor/Counter/Station management
    showVariants: boolean;        // Size/Color/IMEI/Serial variants (Fashion/Electronics)
    showFuelBilling: boolean;     // Fuel dispenser billing
    defaultTerminalView: "grid" | "list"; // Floor Grid vs Live Orders List
  };

  // Quick Action Priorities
  primaryBillingRoute: string;
  defaultFloorTitle: string;
}

export const BUSINESS_MODES: Record<BusinessType, BusinessModeConfig> = {
  food: {
    id: "food",
    label: "Restaurant / Cafe / Food",
    category: "dining",
    terminology: {
      unitSingular: "Table",
      unitPlural: "Tables",
      catalog: "Menu",
      orderTypeDining: "Dining",
      orderTypeTakeaway: "Takeaway",
      orderTypeDelivery: "Delivery",
      customerAction: "Table Guest",
    },
    features: {
      showTableGrid: true,
      showKOT: true,
      showKDS: true,
      showBarcodeFirst: false,
      showStations: true,
      showVariants: false,
      showFuelBilling: false,
      defaultTerminalView: "grid",
    },
    primaryBillingRoute: "/dashboard/billing/checkout",
    defaultFloorTitle: "Dining Floor & Tables",
  },

  retail: {
    id: "retail",
    label: "Retail / Supermarket / Grocery",
    category: "retail",
    terminology: {
      unitSingular: "Counter",
      unitPlural: "Counters",
      catalog: "Products",
      orderTypeDining: "In-Store",
      orderTypeTakeaway: "Pickup",
      orderTypeDelivery: "Home Delivery",
      customerAction: "Store Customer",
    },
    features: {
      showTableGrid: false,
      showKOT: false,
      showKDS: false,
      showBarcodeFirst: true,
      showStations: true,
      showVariants: false,
      showFuelBilling: false,
      defaultTerminalView: "list",
    },
    primaryBillingRoute: "/dashboard/billing/checkout",
    defaultFloorTitle: "Store Stations & QR Orders",
  },

  fashion: {
    id: "fashion",
    label: "Garments / Fashion / Apparel",
    category: "retail",
    terminology: {
      unitSingular: "Billing Station",
      unitPlural: "Billing Stations",
      catalog: "Apparel Catalog",
      orderTypeDining: "Walk-in",
      orderTypeTakeaway: "Pickup",
      orderTypeDelivery: "Courier / Delivery",
      customerAction: "Shopper",
    },
    features: {
      showTableGrid: false,
      showKOT: false,
      showKDS: false,
      showBarcodeFirst: true,
      showStations: true,
      showVariants: true,
      showFuelBilling: false,
      defaultTerminalView: "list",
    },
    primaryBillingRoute: "/dashboard/billing/checkout",
    defaultFloorTitle: "Counters & Self-Order QR",
  },

  electronics: {
    id: "electronics",
    label: "Electronics / Mobile / Hardware",
    category: "retail",
    terminology: {
      unitSingular: "Counter Desk",
      unitPlural: "Counter Desks",
      catalog: "Products & Gadgets",
      orderTypeDining: "In-Store",
      orderTypeTakeaway: "Pickup",
      orderTypeDelivery: "Doorstep Delivery",
      customerAction: "Customer",
    },
    features: {
      showTableGrid: false,
      showKOT: false,
      showKDS: false,
      showBarcodeFirst: true,
      showStations: true,
      showVariants: true,
      showFuelBilling: false,
      defaultTerminalView: "list",
    },
    primaryBillingRoute: "/dashboard/billing/checkout",
    defaultFloorTitle: "Service Desks & QR Orders",
  },

  general: {
    id: "general",
    label: "General Store / Wholesale / Trade",
    category: "retail",
    terminology: {
      unitSingular: "Station",
      unitPlural: "Stations",
      catalog: "Item Catalog",
      orderTypeDining: "Over Counter",
      orderTypeTakeaway: "Pickup",
      orderTypeDelivery: "Delivery",
      customerAction: "Buyer",
    },
    features: {
      showTableGrid: false,
      showKOT: false,
      showKDS: false,
      showBarcodeFirst: true,
      showStations: true,
      showVariants: false,
      showFuelBilling: false,
      defaultTerminalView: "list",
    },
    primaryBillingRoute: "/dashboard/billing/checkout",
    defaultFloorTitle: "Stations & QR Orders",
  },

  service: {
    id: "service",
    label: "Service / Salon / Repair Center",
    category: "service",
    terminology: {
      unitSingular: "Chair / Station",
      unitPlural: "Chairs / Stations",
      catalog: "Services",
      orderTypeDining: "In-Service",
      orderTypeTakeaway: "Appointment",
      orderTypeDelivery: "Doorstep",
      customerAction: "Client",
    },
    features: {
      showTableGrid: true,
      showKOT: false,
      showKDS: false,
      showBarcodeFirst: false,
      showStations: true,
      showVariants: false,
      showFuelBilling: false,
      defaultTerminalView: "grid",
    },
    primaryBillingRoute: "/dashboard/billing/checkout",
    defaultFloorTitle: "Service Stations & Bookings",
  },

  fuel: {
    id: "fuel",
    label: "Fuel Pump / Petrol Station",
    category: "service",
    terminology: {
      unitSingular: "Dispenser / Nozzle",
      unitPlural: "Dispensers",
      catalog: "Fuels & Lubes",
      orderTypeDining: "Drive-in",
      orderTypeTakeaway: "Direct Fill",
      orderTypeDelivery: "Bulk Tanker",
      customerAction: "Driver",
    },
    features: {
      showTableGrid: false,
      showKOT: false,
      showKDS: false,
      showBarcodeFirst: false,
      showStations: true,
      showVariants: false,
      showFuelBilling: true,
      defaultTerminalView: "list",
    },
    primaryBillingRoute: "/dashboard/fuel",
    defaultFloorTitle: "Fuel Dispensers & Stations",
  },
};

/**
 * Normalizes any businessType string stored in BusinessProfile
 * Defaults gracefully to "food" if not configured to prevent regressions.
 */
export function getBusinessMode(rawType?: string | null): BusinessModeConfig {
  if (!rawType) return BUSINESS_MODES.food;
  const key = rawType.toLowerCase().trim() as BusinessType;
  return BUSINESS_MODES[key] || BUSINESS_MODES.food;
}
