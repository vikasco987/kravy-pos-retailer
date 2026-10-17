export interface ChangeRecord {
  field: string;
  label: string;
  before: any;
  after: any;
  summary?: string;
}

/**
 * Summarizes item array changes into human-readable compact differences.
 */
export function summarizeItemChanges(beforeItemsRaw: any, afterItemsRaw: any): string[] {
  let beforeList: any[] = [];
  let afterList: any[] = [];

  try {
    if (typeof beforeItemsRaw === "string") beforeList = JSON.parse(beforeItemsRaw);
    else if (Array.isArray(beforeItemsRaw)) beforeList = beforeItemsRaw;
    else if (beforeItemsRaw?.items && Array.isArray(beforeItemsRaw.items)) beforeList = beforeItemsRaw.items;
  } catch {}

  try {
    if (typeof afterItemsRaw === "string") afterList = JSON.parse(afterItemsRaw);
    else if (Array.isArray(afterItemsRaw)) afterList = afterItemsRaw;
    else if (afterItemsRaw?.items && Array.isArray(afterItemsRaw.items)) afterList = afterItemsRaw.items;
  } catch {}

  const beforeMap = new Map<string, { qty: number; rate: number }>();
  beforeList.forEach(it => {
    const key = String(it.name || it.itemName || "Item").trim();
    const qty = Number(it.quantity || it.qty || 0);
    const rate = Number(it.price || it.rate || it.sellingPrice || 0);
    const prev = beforeMap.get(key) || { qty: 0, rate };
    beforeMap.set(key, { qty: prev.qty + qty, rate });
  });

  const afterMap = new Map<string, { qty: number; rate: number }>();
  afterList.forEach(it => {
    const key = String(it.name || it.itemName || "Item").trim();
    const qty = Number(it.quantity || it.qty || 0);
    const rate = Number(it.price || it.rate || it.sellingPrice || 0);
    const prev = afterMap.get(key) || { qty: 0, rate };
    afterMap.set(key, { qty: prev.qty + qty, rate });
  });

  const summaries: string[] = [];

  // Check additions and qty modifications
  afterMap.forEach((newVal, name) => {
    const oldVal = beforeMap.get(name);
    if (!oldVal) {
      summaries.push(`Added "${name}" x${newVal.qty}`);
    } else {
      if (oldVal.qty !== newVal.qty) {
        summaries.push(`Qty for "${name}": ${oldVal.qty} → ${newVal.qty}`);
      }
      if (oldVal.rate !== newVal.rate) {
        summaries.push(`Rate for "${name}": ₹${oldVal.rate} → ₹${newVal.rate}`);
      }
    }
  });

  // Check removals
  beforeMap.forEach((oldVal, name) => {
    if (!afterMap.has(name)) {
      summaries.push(`Removed "${name}" (was x${oldVal.qty})`);
    }
  });

  return summaries;
}

/**
 * Computes a lightweight diff between an existing bill and updated fields.
 */
export function computeBillDiff(existingBill: any, updatedData: Record<string, any>): ChangeRecord[] {
  const changes: ChangeRecord[] = [];

  const fieldLabels: Record<string, string> = {
    total: "Bill Total",
    subtotal: "Subtotal",
    tax: "Tax",
    discountAmount: "Discount",
    discountCode: "Promo Code",
    deliveryCharges: "Delivery Charge",
    packagingCharges: "Packaging Charge",
    serviceCharge: "Service Charge",
    paymentMode: "Payment Mode",
    paymentStatus: "Payment Status",
    amountPaid: "Amount Paid",
    balanceDue: "Balance Due",
    customerName: "Customer Name",
    customerPhone: "Customer Phone",
    customerAddress: "Customer Address",
    buyerGSTIN: "Buyer GSTIN",
    placeOfSupply: "Place of Supply",
    tableName: "Table / Type",
    isHeld: "Hold Status",
    tokenNumber: "Token Number",
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    if (key in updatedData) {
      const oldVal = existingBill[key];
      const newVal = updatedData[key];

      // Treat null/undefined equivalence
      const normalizedOld = oldVal === undefined || oldVal === null ? "" : oldVal;
      const normalizedNew = newVal === undefined || newVal === null ? "" : newVal;

      if (typeof normalizedOld === "number" || typeof normalizedNew === "number") {
        if (Number(normalizedOld) !== Number(normalizedNew)) {
          changes.push({
            field: key,
            label,
            before: normalizedOld,
            after: normalizedNew,
          });
        }
      } else if (typeof normalizedOld === "boolean" || typeof normalizedNew === "boolean") {
        if (Boolean(normalizedOld) !== Boolean(normalizedNew)) {
          changes.push({
            field: key,
            label,
            before: Boolean(normalizedOld),
            after: Boolean(normalizedNew),
          });
        }
      } else {
        if (String(normalizedOld).trim() !== String(normalizedNew).trim()) {
          changes.push({
            field: key,
            label,
            before: normalizedOld,
            after: normalizedNew,
          });
        }
      }
    }
  }

  // Handle Items Diff
  if (updatedData.items) {
    const itemDiffs = summarizeItemChanges(existingBill.items, updatedData.items);
    if (itemDiffs.length > 0) {
      changes.push({
        field: "items",
        label: "Bill Items",
        before: `${Array.isArray(existingBill.items) ? existingBill.items.length : 0} items`,
        after: `${Array.isArray(updatedData.items) ? updatedData.items.length : 0} items`,
        summary: itemDiffs.join(" • "),
      });
    }
  }

  return changes;
}
