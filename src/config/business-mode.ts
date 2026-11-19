/**
 * Business Mode Configuration Engine
 * Kravy Universal POS Platform (Retail-First + Universal Business POS Platform)
 *
 * Architecture Principles:
 * 1. RETAIL & GENERAL BUSINESS IS THE PRIMARY DEFAULT IN THIS PROJECT.
 * 2. ONE PLATFORM, ONE BILLING ENGINE, ONE DATABASE ARCHITECTURE.
 * 3. Unified order lifecycle: PENDING -> ACCEPTED -> PREPARING (Packing) -> READY (Pickup/Dispatch) -> COMPLETED.
 * 4. Backward-compatible with DB strings and existing settlement / inventory engines.
 * 5. Terminology automatically adapts: No restaurant kitchen/table/dining jargon for retailers.
 */

export type BusinessType =
  | "retail"       // Grocery, Supermarket, Mini Mart (PRIMARY DEFAULT)
  | "fashion"      // Garments, Clothing, Footwear, Boutique
  | "electronics"  // Electronics, Mobile Store, Computer Hardware
  | "general"      // General Store, Wholesale, Stationery, Hardware
  | "service"      // Salon, Spa, Repair, Auto Services
  | "fuel"         // Petrol Pump, Fuel Station
  | "food";        // Restaurant, Cafe, Bakery (Legacy / Optional)

export interface OrderStatusDetails {
  key: string;
  label: string;
  actionLabel: string;
  nextStatus?: string;
  customerHeading: string;
  customerDesc: string;
  badgeClass: string;
}

export interface BusinessModeConfig {
  id: BusinessType;
  label: string;
  category: "retail" | "service" | "dining";
  
  // Terminology adaptations
  terminology: {
    unitSingular: string;      // "Counter" / "Station" vs "Table"
    unitPlural: string;        // "Counters" / "Stations" vs "Tables"
    catalog: string;           // "Products" / "Catalog" vs "Menu"
    orderTypeDining: string;   // "Counter Sale" / "In-Store" vs "Dining"
    orderTypeTakeaway: string; // "Store Pickup" vs "Takeaway"
    orderTypeDelivery: string; // "Home Delivery" / "Shipment" vs "Delivery"
    customerAction: string;    // "Store Customer" / "Shopper" vs "Table Guest"
  };

  // Order Lifecycle Status Mapping
  statusMap: Record<string, OrderStatusDetails>;

  // Feature Toggles
  features: {
    showTableGrid: boolean;       // Visual layout for stations or dining floors
    showKOT: boolean;             // Kitchen Order Token (Restaurant only)
    showKDS: boolean;             // Kitchen Display System
    showBarcodeFirst: boolean;    // Auto-focus barcode input for instant scan-to-cart
    showStations: boolean;        // Floor/Counter/Station management
    showVariants: boolean;        // Size/Color/IMEI/Serial variants (Fashion/Electronics)
    showFuelBilling: boolean;     // Fuel dispenser billing
    defaultTerminalView: "list" | "grid"; // Orders Stream vs Grid
  };

  primaryBillingRoute: string;
  defaultFloorTitle: string;
}

const RETAIL_STATUS_MAP: Record<string, OrderStatusDetails> = {
  PENDING: {
    key: "PENDING",
    label: "New Order",
    actionLabel: "Confirm Order",
    nextStatus: "ACCEPTED",
    customerHeading: "Order Received",
    customerDesc: "We've received your order and the store is reviewing it.",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
  },
  ACCEPTED: {
    key: "ACCEPTED",
    label: "Confirmed",
    actionLabel: "Start Packing",
    nextStatus: "PREPARING",
    customerHeading: "Order Confirmed",
    customerDesc: "Your order is confirmed. Store staff is gathering your items.",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
  },
  PREPARING: {
    key: "PREPARING",
    label: "Packing / Processing",
    actionLabel: "Mark as Packed & Ready",
    nextStatus: "READY",
    customerHeading: "Packing In Progress",
    customerDesc: "Your items are being picked, quality checked and packed.",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300",
  },
  READY: {
    key: "READY",
    label: "Ready for Pickup",
    actionLabel: "Complete & Settle",
    nextStatus: "COMPLETED",
    customerHeading: "Ready at Counter",
    customerDesc: "Your order is packed and ready for pickup at the counter or dispatch.",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
  },
  SERVED: {
    key: "SERVED",
    label: "Handed Over",
    actionLabel: "Complete",
    nextStatus: "COMPLETED",
    customerHeading: "Handed Over",
    customerDesc: "Package has been handed over to customer / courier.",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300",
  },
  COMPLETED: {
    key: "COMPLETED",
    label: "Completed",
    actionLabel: "Billed",
    customerHeading: "Completed",
    customerDesc: "Order has been settled and completed. Thank you for shopping with us!",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
  },
};

const RESTAURANT_STATUS_MAP: Record<string, OrderStatusDetails> = {
  PENDING: {
    key: "PENDING",
    label: "New Table Order",
    actionLabel: "Accept Order",
    nextStatus: "ACCEPTED",
    customerHeading: "Order Placed",
    customerDesc: "Your order has been sent to the kitchen.",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
  },
  ACCEPTED: {
    key: "ACCEPTED",
    label: "Accepted",
    actionLabel: "Send to Kitchen",
    nextStatus: "PREPARING",
    customerHeading: "Order Accepted",
    customerDesc: "Order accepted by the restaurant.",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300",
  },
  PREPARING: {
    key: "PREPARING",
    label: "Cooking in Kitchen",
    actionLabel: "Food Ready",
    nextStatus: "READY",
    customerHeading: "Cooking with Care",
    customerDesc: "Our chef is preparing your fresh meal.",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300",
  },
  READY: {
    key: "READY",
    label: "Ready to Serve",
    actionLabel: "Serve to Table",
    nextStatus: "COMPLETED",
    customerHeading: "Ready to Serve",
    customerDesc: "Your meal is ready and being served to your table.",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
  },
  SERVED: {
    key: "SERVED",
    label: "Served",
    actionLabel: "Settle Bill",
    nextStatus: "COMPLETED",
    customerHeading: "Served",
    customerDesc: "Enjoy your meal!",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300",
  },
  COMPLETED: {
    key: "COMPLETED",
    label: "Completed",
    actionLabel: "Settled",
    customerHeading: "Completed",
    customerDesc: "Bill paid and completed. Visit again!",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
  },
};

export const BUSINESS_MODES: Record<BusinessType, BusinessModeConfig> = {
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
    statusMap: RETAIL_STATUS_MAP,
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
    defaultFloorTitle: "Store Stations & Live Orders",
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
      orderTypeTakeaway: "Store Pickup",
      orderTypeDelivery: "Courier / Delivery",
      customerAction: "Shopper",
    },
    statusMap: RETAIL_STATUS_MAP,
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
      orderTypeTakeaway: "Store Pickup",
      orderTypeDelivery: "Doorstep Delivery",
      customerAction: "Customer",
    },
    statusMap: RETAIL_STATUS_MAP,
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
      orderTypeTakeaway: "Store Pickup",
      orderTypeDelivery: "Delivery",
      customerAction: "Buyer",
    },
    statusMap: RETAIL_STATUS_MAP,
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
    statusMap: RETAIL_STATUS_MAP,
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
    statusMap: RETAIL_STATUS_MAP,
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

  food: {
    id: "food",
    label: "Restaurant / Cafe / Food Business",
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
    statusMap: RESTAURANT_STATUS_MAP,
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
};

/**
 * Normalizes any businessType string stored in BusinessProfile
 * Default is RETAIL for this project (kravy-pos-retailer)
 */
export function getBusinessMode(rawType?: string | null): BusinessModeConfig {
  if (!rawType) return BUSINESS_MODES.retail;
  const key = rawType.toLowerCase().trim() as BusinessType;
  return BUSINESS_MODES[key] || BUSINESS_MODES.retail;
}

/**
 * Helper to get clean status details for any business mode
 */
export function getOrderStatusDetails(status: string, businessType?: string | null): OrderStatusDetails {
  const mode = getBusinessMode(businessType);
  const normalized = (status || "PENDING").toUpperCase();
  return mode.statusMap[normalized] || {
    key: normalized,
    label: normalized,
    actionLabel: "Update",
    customerHeading: "Order Status",
    customerDesc: `Status: ${normalized}`,
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300",
  };
}
