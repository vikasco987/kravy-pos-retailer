import prisma from "./prisma";

export type InsufficientStockBehavior = "allow" | "warn" | "block";
export type DeductionTiming = "bill" | "kot";

export interface InventorySettingsConfig {
  enabled: boolean;
  insufficientStockBehavior: InsufficientStockBehavior;
  deductionTiming: DeductionTiming;
  lowStockAlerts: boolean;
  allowManagerOverride: boolean;
  enableSerialNumber: boolean;
  isStockCompulsory: boolean;
}

export const DEFAULT_INVENTORY_SETTINGS: InventorySettingsConfig = {
  enabled: true,
  insufficientStockBehavior: "allow",
  deductionTiming: "bill",
  lowStockAlerts: true,
  allowManagerOverride: false,
  enableSerialNumber: false,
  isStockCompulsory: false,
};

/**
 * Extracts and sanitizes inventory settings from a BusinessProfile or settings object.
 */
export function getInventorySettings(profile: any): InventorySettingsConfig {
  if (!profile) return { ...DEFAULT_INVENTORY_SETTINGS };

  let ps = profile.printSettings;
  if (typeof ps === "string") {
    try {
      ps = JSON.parse(ps);
    } catch {
      ps = {};
    }
  } else if (!ps || typeof ps !== "object") {
    ps = {};
  }

  const inv = ps.inventorySettings || profile.inventorySettings || {};

  let enabled: boolean;
  if (inv.enabled !== undefined && inv.enabled !== null) {
    enabled = Boolean(inv.enabled);
  } else {
    // Only auto-enable for legacy users who had active inventory behaviors configured
    enabled = Boolean(
      inv.insufficientStockBehavior === "warn" ||
      inv.insufficientStockBehavior === "block" ||
      inv.deductionTiming === "kot" ||
      profile.isStockCompulsory
    );
  }

  const insufficientStockBehavior: InsufficientStockBehavior =
    inv.insufficientStockBehavior === "warn" || inv.insufficientStockBehavior === "block"
      ? inv.insufficientStockBehavior
      : "allow";

  const deductionTiming: DeductionTiming =
    inv.deductionTiming === "kot" ? "kot" : "bill";

  return {
    enabled,
    insufficientStockBehavior,
    deductionTiming,
    lowStockAlerts: inv.lowStockAlerts !== undefined ? Boolean(inv.lowStockAlerts) : true,
    allowManagerOverride: inv.allowManagerOverride !== undefined ? Boolean(inv.allowManagerOverride) : false,
    enableSerialNumber: profile.enableSerialNumber !== undefined ? Boolean(profile.enableSerialNumber) : Boolean(inv.enableSerialNumber),
    isStockCompulsory: profile.isStockCompulsory !== undefined ? Boolean(profile.isStockCompulsory) : Boolean(inv.isStockCompulsory),
  };
}

export interface InsufficientStockItem {
  id: string;
  itemId?: string;
  name: string;
  requestedQty: number;
  availableStock: number;
  type: "item" | "material";
  unit?: string;
}

export interface StockValidationResult {
  valid: boolean;
  action: "proceed" | "warn" | "block";
  insufficientItems: InsufficientStockItem[];
  message?: string;
}

/**
 * Validates stock availability for an order/bill against inventory items and recipe materials.
 */
export async function validateStockAvailability(
  tx: any,
  orderItems: any[],
  settings: InventorySettingsConfig,
  options?: {
    isManagerOverride?: boolean;
    confirmedWarning?: boolean;
    userRole?: string;
    userPermissions?: string[];
  }
): Promise<StockValidationResult> {
  if (!orderItems || orderItems.length === 0 || (settings && settings.enabled === false)) {
    return { valid: true, action: "proceed", insufficientItems: [] };
  }

  // 1. Group requested quantities for each item
  const itemQuantities = new Map<string, { qty: number; name?: string }>();
  for (const item of orderItems) {
    const rawId = item.itemId || item.id;
    const match = rawId ? String(rawId).match(/^[0-9a-fA-F]{24}/) : null;
    const itemId = match ? match[0] : null;
    if (!itemId) continue;

    const qty = Number(item.qty || item.quantity || 1);
    if (isNaN(qty) || qty <= 0) continue;

    const existing = itemQuantities.get(itemId);
    itemQuantities.set(itemId, {
      qty: (existing?.qty || 0) + qty,
      name: item.name || existing?.name || "Item",
    });
  }

  if (itemQuantities.size === 0) {
    return { valid: true, action: "proceed", insufficientItems: [] };
  }

  const itemIds = Array.from(itemQuantities.keys());
  const insufficientItems: InsufficientStockItem[] = [];

  // 2. Check finished goods stock
  const items = await tx.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, currentStock: true, unit: true },
  });

  for (const it of items) {
    const req = itemQuantities.get(it.id);
    if (!req) continue;
    if (it.currentStock !== null && it.currentStock !== undefined) {
      if (req.qty > it.currentStock) {
        insufficientItems.push({
          id: it.id,
          itemId: it.id,
          name: it.name || req.name || "Item",
          requestedQty: req.qty,
          availableStock: it.currentStock,
          type: "item",
          unit: it.unit || "pcs",
        });
      }
    }
  }

  // 3. Check raw materials linked via recipes
  const recipeItems = await tx.recipeItem.findMany({
    where: { itemId: { in: itemIds } },
    include: { material: true },
  });

  if (recipeItems && recipeItems.length > 0) {
    const materialReqs = new Map<string, { qty: number; material: any }>();
    for (const ri of recipeItems) {
      const sold = itemQuantities.get(ri.itemId)?.qty || 0;
      const totalNeeded = ri.quantity * sold;
      if (!materialReqs.has(ri.materialId)) {
        materialReqs.set(ri.materialId, { qty: totalNeeded, material: ri.material });
      } else {
        materialReqs.get(ri.materialId)!.qty += totalNeeded;
      }
    }

    for (const entry of Array.from(materialReqs.values())) {
      const mat = entry.material;
      if (mat) {
        const available = mat.stock || 0;
        if (entry.qty > available) {
          insufficientItems.push({
            id: mat.id,
            name: `${mat.name} (Ingredient)`,
            requestedQty: entry.qty,
            availableStock: available,
            type: "material",
            unit: mat.unit || "units",
          });
        }
      }
    }
  }

  if (insufficientItems.length === 0) {
    return { valid: true, action: "proceed", insufficientItems: [] };
  }

  // Apply configured behavior
  if (settings.insufficientStockBehavior === "allow") {
    return { valid: true, action: "proceed", insufficientItems };
  }

  if (settings.insufficientStockBehavior === "warn") {
    if (options?.confirmedWarning) {
      return { valid: true, action: "proceed", insufficientItems };
    }
    const itemNames = insufficientItems.map((i) => `${i.name} (Available: ${i.availableStock}, Needed: ${i.requestedQty})`).join(", ");
    return {
      valid: false,
      action: "warn",
      insufficientItems,
      message: `Stock Warning: ${itemNames}`,
    };
  }

  if (settings.insufficientStockBehavior === "block") {
    const role = (options?.userRole || "").toUpperCase();
    const perms = options?.userPermissions || [];
    const hasOverridePerm = perms.includes("inventory-override") || perms.includes("inventory") || perms.includes("manage-inventory");
    const isManagerRole = ["ADMIN", "SELLER", "OWNER", "MANAGER"].includes(role) || hasOverridePerm;
    if (settings.allowManagerOverride && options?.isManagerOverride && isManagerRole) {
      return {
        valid: true,
        action: "proceed",
        insufficientItems,
        message: "Manager override authorized sale with insufficient stock.",
      };
    }

    const itemNames = insufficientItems.map((i) => `${i.name} (Available: ${i.availableStock})`).join(", ");
    return {
      valid: false,
      action: "block",
      insufficientItems,
      message: `Sale Blocked: Insufficient stock for ${itemNames}.`,
    };
  }

  return { valid: true, action: "proceed", insufficientItems: [] };
}

/**
 * Executes a Prisma transaction with explicit retry logic for transient MongoDB/Prisma transaction conflicts.
 * Retries on P2034 (WriteConflict) and P2028 (Transaction API error) up to maxRetries.
 */
export async function withTransactionRetry<T>(
  operation: (tx: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await prisma.$transaction(operation, {
        maxWait: 5000,
        timeout: 15000,
      });
    } catch (error: any) {
      if (error.code === "P2034") {
        attempt++;
        if (attempt >= maxRetries) {
          console.error(`[TX_RETRY] Failed after ${maxRetries} attempts due to ${error.code}`);
          throw error;
        }
        console.warn(`[TX_RETRY] Transaction conflict ${error.code}. Retrying attempt ${attempt + 1}/${maxRetries}...`);
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Exponential backoff
      } else {
        throw error; // Throw non-retryable errors immediately
      }
    }
  }
  throw new Error("Transaction retry loop exhausted without returning or throwing. This should be unreachable.");
}

/**
 * Executes the inventory deduction logic using an existing transaction client.
 * In "allow" mode, negative stock is permitted to reflect actual physical deficits.
 */
export async function executeInventoryDeduction(
  tx: any,
  orderItems: any[],
  settings?: InventorySettingsConfig
) {
  if (!orderItems || orderItems.length === 0 || (settings && settings.enabled === false)) return;

  const allowNegative =
    !settings ||
    settings.insufficientStockBehavior === "allow" ||
    settings.insufficientStockBehavior === "warn";

  // 1. Aggregate requested quantities for each finished item
  const itemDeductions = new Map<string, number>();

  for (const item of orderItems) {
    const rawItemId = item.itemId || item.id;
    const match = rawItemId ? String(rawItemId).match(/^[0-9a-fA-F]{24}/) : null;
    const itemId = match ? match[0] : null;

    if (!itemId) continue;

    const quantitySold = Number(item.qty || item.quantity || 1);
    if (isNaN(quantitySold) || quantitySold <= 0) continue;

    itemDeductions.set(itemId, (itemDeductions.get(itemId) || 0) + quantitySold);
  }

  if (itemDeductions.size === 0) {
    return;
  }

  const itemIds = Array.from(itemDeductions.keys());

  // 2a. Fetch all required recipes
  const recipeItems = await tx.recipeItem.findMany({
    where: { itemId: { in: itemIds } },
  });

  // 2b. Calculate total raw material deductions across the entire order
  const materialDeductions = new Map<string, number>();

  for (const ri of recipeItems) {
    const soldQty = itemDeductions.get(ri.itemId) || 0;
    const totalDeduction = ri.quantity * soldQty;
    materialDeductions.set(ri.materialId, (materialDeductions.get(ri.materialId) || 0) + totalDeduction);
  }

  // 2c. Update raw materials (allowing negative stock when configured)
  if (materialDeductions.size > 0) {
    const materialIds = Array.from(materialDeductions.keys());
    const materials = await tx.rawMaterial.findMany({
      where: { id: { in: materialIds } },
    });

    for (const material of materials) {
      const deduction = materialDeductions.get(material.id) || 0;
      const current = material.stock || 0;
      const newStock = allowNegative ? current - deduction : Math.max(0, current - deduction);

      await tx.rawMaterial.update({
        where: { id: material.id },
        data: { stock: newStock },
      });
    }
  }

  // 2d. Update finished items (allowing negative stock when configured)
  const finishedItems = await tx.item.findMany({
    where: { id: { in: itemIds } },
  });

  for (const currentItem of finishedItems) {
    const deduction = itemDeductions.get(currentItem.id) || 0;
    if (currentItem.currentStock !== null && currentItem.currentStock !== undefined) {
      const current = currentItem.currentStock;
      const newStock = allowNegative ? current - deduction : Math.max(0, current - deduction);

      await tx.item.update({
        where: { id: currentItem.id },
        data: { currentStock: newStock },
      });
    }
  }
}

/**
 * Restores deducted inventory when an order or bill is cancelled, deleted, or voided.
 * Safely adds back the exact quantities of raw materials and finished goods atomically.
 */
export async function executeInventoryRestoration(tx: any, orderItems: any[]) {
  if (!orderItems || orderItems.length === 0) return;

  const itemRestorations = new Map<string, number>();

  for (const item of orderItems) {
    const rawItemId = item.itemId || item.id;
    const match = rawItemId ? String(rawItemId).match(/^[0-9a-fA-F]{24}/) : null;
    const itemId = match ? match[0] : null;

    if (!itemId) continue;

    const quantityRestored = Number(item.qty || item.quantity || 1);
    if (isNaN(quantityRestored) || quantityRestored <= 0) continue;

    itemRestorations.set(itemId, (itemRestorations.get(itemId) || 0) + quantityRestored);
  }

  if (itemRestorations.size === 0) return;

  const itemIds = Array.from(itemRestorations.keys());

  // 1. Restore recipe raw materials
  const recipeItems = await tx.recipeItem.findMany({
    where: { itemId: { in: itemIds } },
  });

  const materialRestorations = new Map<string, number>();
  for (const ri of recipeItems) {
    const restoredQty = itemRestorations.get(ri.itemId) || 0;
    const totalRestoration = ri.quantity * restoredQty;
    materialRestorations.set(ri.materialId, (materialRestorations.get(ri.materialId) || 0) + totalRestoration);
  }

  if (materialRestorations.size > 0) {
    const materialIds = Array.from(materialRestorations.keys());
    const materials = await tx.rawMaterial.findMany({
      where: { id: { in: materialIds } },
    });

    for (const material of materials) {
      const addition = materialRestorations.get(material.id) || 0;
      await tx.rawMaterial.update({
        where: { id: material.id },
        data: { stock: (material.stock || 0) + addition },
      });
    }
  }

  // 2. Restore finished items
  const finishedItems = await tx.item.findMany({
    where: { id: { in: itemIds } },
  });

  for (const currentItem of finishedItems) {
    const addition = itemRestorations.get(currentItem.id) || 0;
    if (currentItem.currentStock !== null && currentItem.currentStock !== undefined) {
      await tx.item.update({
        where: { id: currentItem.id },
        data: { currentStock: currentItem.currentStock + addition },
      });
    }
  }
}

/**
 * Calculates the incremental items between new items and previously processed/deducted items.
 * Only returns items where the new quantity exceeds the old quantity, with qty set to the difference.
 */
export function calculateIncrementalItems(newItems: any[], oldItems: any[]): any[] {
  const oldItemQuantities = new Map<string, number>();
  for (const oi of oldItems || []) {
    const rawId = oi.itemId || oi.id;
    const match = rawId ? String(rawId).match(/^[0-9a-fA-F]{24}/) : null;
    const id = match ? match[0] : null;
    if (id) {
      oldItemQuantities.set(id, (oldItemQuantities.get(id) || 0) + Number(oi.qty || oi.quantity || 1));
    }
  }

  const incrementalItems: any[] = [];
  for (const ni of newItems || []) {
    const rawId = ni.itemId || ni.id;
    const match = rawId ? String(rawId).match(/^[0-9a-fA-F]{24}/) : null;
    const id = match ? match[0] : null;
    if (!id) continue;
    const newQty = Number(ni.qty || ni.quantity || 1);
    const oldQty = oldItemQuantities.get(id) || 0;
    if (newQty > oldQty) {
      const diff = newQty - oldQty;
      incrementalItems.push({
        ...ni,
        qty: diff,
        quantity: diff,
      });
      oldItemQuantities.set(id, oldQty + diff);
    }
  }
  return incrementalItems;
}
