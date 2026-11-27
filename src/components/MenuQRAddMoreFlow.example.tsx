/**
 * MenuQR AddMore Flow - Integration Guide
 * 
 * This file demonstrates how to integrate the MenuQRAddMoreFlow component
 * into your existing menu system.
 */

import React, { useState } from "react";
import MenuQRAddMoreFlow from "@/components/MenuQRAddMoreFlow";

/**
 * EXAMPLE 1: Basic Implementation
 * ─────────────────────────────────
 * Use this in your menu page when a customer wants to add more items
 */
export function BasicAddMoreExample() {
  const [showAddMore, setShowAddMore] = useState(false);

  const handleAddMore = () => {
    setShowAddMore(true);
  };

  return (
    <div>
      {!showAddMore ? (
        <button onClick={handleAddMore} className="add-more-btn green">
          ➕ Add More Items
        </button>
      ) : (
        <MenuQRAddMoreFlow
          onClose={() => setShowAddMore(false)}
          orderData={{
            orderId: "#MH2X9K",
            tableId: "T-04",
            status: "received",
            items: [
              { name: "Butter Chicken", qty: 1, price: 380 },
              { name: "Garlic Naan", qty: 2, price: 160 },
            ],
            createdAt: "2 min ago",
            currentTotal: 540,
          }}
        />
      )}
    </div>
  );
}

/**
 * EXAMPLE 2: Case-Specific Implementation
 * ────────────────────────────────────────
 * Handle different cases (merge, separate, round2) based on order status
 */
export function CaseSpecificAddMoreExample() {
  const [showAddMore, setShowAddMore] = useState(false);
  const [orderStatus, setOrderStatus] = useState<"received" | "preparing" | "served">("received");

  const getCaseType = (status: "received" | "preparing" | "served") => {
    switch (status) {
      case "received":
        return "merge";
      case "preparing":
        return "separate";
      case "served":
        return "round2";
    }
  };

  const handleAddMore = () => {
    setShowAddMore(true);
  };

  return (
    <div>
      <div className="order-status-section">
        <h3>Current Order Status: {orderStatus}</h3>
        <button onClick={handleAddMore} className="add-more-btn green">
          ➕ Add More Items
        </button>
      </div>

      {showAddMore && (
        <MenuQRAddMoreFlow
          onClose={() => setShowAddMore(false)}
          caseType={getCaseType(orderStatus)}
          orderData={{
            orderId: "#MH2X9K",
            tableId: "T-04",
            status: orderStatus,
            items: [
              { name: "Butter Chicken", qty: 1, price: 380 },
              { name: "Garlic Naan", qty: 2, price: 160 },
            ],
            createdAt: "2 min ago",
            currentTotal: 540,
          }}
        />
      )}
    </div>
  );
}

/**
 * EXAMPLE 3: Integration with Real Data
 * ──────────────────────────────────────
 * Fetch real order data and integrate with your API
 */
export function IntegratedAddMoreExample() {
  const [showAddMore, setShowAddMore] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchOrderData = async (orderId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      setOrderData(data);
      setShowAddMore(true);
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoreItems = async (newItems: any[], caseType: string) => {
    try {
      const response = await fetch("/api/orders/add-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.id,
          newItems,
          caseType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Items added successfully:", result);
        setShowAddMore(false);
        // Refresh order data or update UI
      }
    } catch (error) {
      console.error("Error adding items:", error);
    }
  };

  return (
    <div>
      {!showAddMore ? (
        <button onClick={() => fetchOrderData("order-123")} disabled={loading}>
          {loading ? "Loading..." : "➕ Add More Items"}
        </button>
      ) : (
        orderData && (
          <MenuQRAddMoreFlow
            onClose={() => setShowAddMore(false)}
            orderData={orderData}
          />
        )
      )}
    </div>
  );
}

/**
 * EXAMPLE 4: Using in Kitchen Display System
 * ───────────────────────────────────────────
 * Show the kitchen view to business staff
 */
export function KitchenDisplayExample() {
  const [showKitchenView, setShowKitchenView] = useState(false);

  return (
    <div>
      <button onClick={() => setShowKitchenView(!showKitchenView)}>
        {showKitchenView ? "Hide Kitchen View" : "Show Kitchen View"}
      </button>

      {showKitchenView && (
        // Navigate directly to kitchen view
        <MenuQRAddMoreFlow
          caseType="merge" // This will be overridden by showing kitchen view
        />
      )}
    </div>
  );
}

/**
 * INTEGRATION STEPS:
 * 
 * 1. IMPORT THE COMPONENT
 *    import MenuQRAddMoreFlow from "@/components/MenuQRAddMoreFlow";
 * 
 * 2. DETERMINE ORDER STATUS
 *    - "received" → Show CASE 1 (Merge) - GREEN button
 *    - "preparing" → Show CASE 2 (Separate) - ORANGE button
 *    - "served" → Show CASE 3 (Round 2) - BLUE button
 * 
 * 3. PASS REQUIRED PROPS
 *    - orderId: Current order ID
 *    - tableId: Table number
 *    - orderStatus: Current order status
 *    - currentItems: Items in the order
 *    - onClose: Callback to close the flow
 * 
 * 4. HANDLE API CALLS
 *    - Case 1 (Merge): PUT /api/orders/{orderId}/items
 *    - Case 2 (Separate): POST /api/orders (new order) + add items
 *    - Case 3 (Round 2): POST /api/orders/round2
 * 
 * 5. UPDATE KITCHEN DISPLAY
 *    - After adding items, update kitchen display system
 *    - Show merged items with green highlight for Case 1
 *    - Show separate order cards for Case 2
 *    - Show "Round 2" badge for Case 3
 * 
 * 6. UPDATE BILLING SYSTEM
 *    - Combine all orders in final bill
 *    - Calculate single GST for session total
 *    - Show individual order breakdown
 * 
 * API ENDPOINTS NEEDED:
 * 
 * PUT /api/orders/{orderId}/items
 * - Merge new items to existing order (Case 1)
 * - Body: { items: CartItem[], caseType: "merge" }
 * - Response: { success: true, orderId, updatedItems, newTotal }
 * 
 * POST /api/orders
 * - Create new order for Case 2 (Separate)
 * - Body: { tableId, items: CartItem[], parentOrderId, caseType: "separate" }
 * - Response: { success: true, newOrderId }
 * 
 * POST /api/orders/{orderId}/round2
 * - Create Round 2 order (Case 3)
 * - Body: { items: CartItem[], caseType: "round2" }
 * - Response: { success: true, round2OrderId, sessionTotal }
 * 
 * GET /api/orders/{orderId}/combined-bill
 * - Get combined bill for all orders in session
 * - Response: { orders: Order[], subtotal, tax, total }
 */

/**
 * KITCHEN DISPLAY INTEGRATION:
 * 
 * For Case 1 (Merge):
 * - Show <merge-tag>✓ 2 items added — total 4 items</merge-tag>
 * - Highlight new items with green background
 * - Show kitchen the combined order items
 * 
 * For Case 2 (Separate):
 * - Create separate order cards
 * - Show Order #1 (preparing) and Order #2 (new) side by side
 * - Each with independent action buttons (Confirm, Start, Ready, Served)
 * 
 * For Case 3 (Round 2):
 * - Show previous order as greyed out/faded
 * - Show Round 2 as new order with "customer wants more!" tag
 * - Same priority as new orders
 */

/**
 * DATABASE SCHEMA UPDATES NEEDED:
 * 
 * ALTER TABLE orders ADD COLUMN (
 *   parent_order_id UUID,
 *   case_type VARCHAR(20), -- 'merge', 'separate', 'round2'
 *   merged_at TIMESTAMP
 * );
 * 
 * CREATE TABLE order_relations (
 *   id UUID PRIMARY KEY,
 *   parent_order_id UUID,
 *   child_order_id UUID,
 *   relation_type VARCHAR(20), -- 'merge', 'separate', 'round2'
 *   created_at TIMESTAMP
 * );
 * 
 * CREATE TABLE session_orders (
 *   id UUID PRIMARY KEY,
 *   session_id UUID,
 *   table_id UUID,
 *   total_amount DECIMAL,
 *   orders_count INT,
 *   created_at TIMESTAMP
 * );
 */

export default BasicAddMoreExample;
