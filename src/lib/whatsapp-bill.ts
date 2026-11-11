// WhatsApp Bill Sending — Meta Official Cloud API Integration (with Template & Text Fallback)
import axios from "axios";

// ── Types ──────────────────────────────────────────────────────────────────
export interface BillItem {
  name: string;
  qty: number;
  price: number;
  gstRate: number;
}

export interface BillData {
  billId?: string;
  templateId?: string;
  invoiceNo: string;
  date: string;
  restaurantName: string;
  restaurantAddress: string;
  gstin: string;
  customerPhone: string;
  customerName?: string;
  items: BillItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  paymentMode: string;
  fssai?: string;
  currencySymbol?: string;
}

// ── Sanitize Indian Phone Number ───────────────────────────────────────────
export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  return cleaned;
}

// ── Format bill as WhatsApp text message ──────────────────────────────────
export function formatBillText(bill: BillData): string {
  const line = "─".repeat(28);
  const dline = "═".repeat(28);

  const sym = bill.currencySymbol || "₹";

  const itemsText = (bill.items || [])
    .map((item, idx) => {
      const total = (item.qty * item.price).toFixed(2);
      return `  ${idx + 1}. *${item.name}*\n     ${item.qty} × ${sym}${item.price} = *${sym}${total}*`;
    })
    .join("\n");

  const discountLine =
    bill.discountAmount > 0
      ? `\n🏷️ Discount (${bill.discountCode || "Applied"}): *-${sym}${bill.discountAmount.toFixed(2)}*`
      : "";

  return `
🍽️ *${(bill.restaurantName || "RESTAURANT").toUpperCase()}*
📍 ${bill.restaurantAddress || ""}
${bill.gstin ? `GSTIN: ${bill.gstin}` : ""}${bill.fssai ? `\nFSSAI: ${bill.fssai}` : ""}
${dline}

📄 *Bill No:* ${bill.invoiceNo}
📅 *Date:* ${bill.date}
${bill.customerName ? `👤 *Customer:* ${bill.customerName}` : ""}
${line}

*ITEMS ORDERED:*
${itemsText}
${line}

💰 Subtotal: ${sym}${bill.subtotal.toFixed(2)}${discountLine}
📊 Taxable: ${sym}${bill.taxableAmount.toFixed(2)}
🏛️ CGST: ${sym}${bill.cgst.toFixed(2)}
🏛️ SGST: ${sym}${bill.sgst.toFixed(2)}
${dline}

✅ *TOTAL PAID: ${sym}${bill.grandTotal.toFixed(2)}*
💳 Payment Mode: ${bill.paymentMode}
${dline}

🙏 *Thank you for your visit!*
Aapka swagat phir se hai।
`.trim();
}

// ── Send WhatsApp Bill via Meta Cloud API ──────────────────────────────────
// Supports both Template (for Unknown/Cold numbers) & Session Text
export async function sendWhatsAppBill(bill: BillData): Promise<{
  success: boolean;
  messageSid?: string;
  error?: string;
}> {
  try {
    const phoneId = (process.env.META_WA_PHONE_NUMBER_ID || "476835372177437").trim();
    const token = (process.env.META_WA_TOKEN || "EAARMI34fPfgBQHeEyrhVA1K2Cs58P9ZCEL4eIxk2oXI70a7bZC0wRgtNjoFLzhuZA48nzDcIkQ804X55ZCRIdfnNLAxFMz4JRkzEEK6kCiftTPZCbUlfbrOkG2cRCBQZAOFquf8ZCvadaMK1oAdjZCIZAQIz8hODEvFVeYZB9XffzPcQS2MX3dwBj0LiWaeGmgGgZDZD").trim();
    const baseUrl = (process.env.META_WA_API_URL || "https://graph.facebook.com/v21.0").trim();

    if (!token) {
      console.error("❌ META_WA_TOKEN missing in .env");
      return { success: false, error: "Meta WhatsApp Token missing in environment" };
    }

    const recipient = cleanPhoneNumber(bill.customerPhone);
    const sym = bill.currencySymbol || "₹";

    // 1. Prepare items summary for Template
    const itemsSummary = (bill.items || [])
      .slice(0, 5) // Meta template body length constraint
      .map((it) => `${it.qty}x ${it.name}`)
      .join(", ") + ((bill.items?.length || 0) > 5 ? ` +${bill.items.length - 5} more` : "");

    const customerGreeting = bill.customerName?.trim() || "Customer";
    const paymentStatus = `PAID (${bill.paymentMode || "Cash"})`;
    const formattedTotal = `${bill.grandTotal.toFixed(2)}`;
    const businessName = (bill.restaurantName || "Kravy Restaurant").slice(0, 60);

    console.log(`🚀 Sending WhatsApp Bill to: ${recipient} (Preferred template: ${bill.templateId || "delivery_confirmation_1"})`);

    const preferredTemplate = bill.templateId || "delivery_confirmation_1";

    // ── IF USER PREFERS `order_details` (Reviews & Feedback) ──
    if (preferredTemplate === "order_details") {
      try {
        const templatePayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: "order_details",
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [
                  { type: "text", text: businessName }
                ]
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: customerGreeting },
                  { type: "text", text: itemsSummary || "Bill Receipt" },
                  { type: "text", text: formattedTotal },
                  { type: "text", text: paymentStatus }
                ]
              }
            ]
          }
        };

        const res = await axios.post(`${baseUrl}/${phoneId}/messages`, templatePayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });

        const messageId = res.data?.messages?.[0]?.id || "template_order_details_sent";
        console.log(`✅ [TEMPLATE: order_details] WhatsApp Bill delivered to ${recipient}! Message ID: ${messageId}`);
        return { success: true, messageSid: messageId };
      } catch (templateError: any) {
        console.warn("⚠️ order_details send encountered an issue, trying delivery_confirmation_1:", templateError.response?.data || templateError.message);
      }
    }

    // ── IF USER PREFERS `order_delivery_update` ──
    if (preferredTemplate === "order_delivery_update") {
      try {
        const templatePayload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template: {
            name: "order_delivery_update",
            language: { code: "en_US" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: customerGreeting },
                  { type: "text", text: bill.invoiceNo }
                ]
              }
            ]
          }
        };

        const res = await axios.post(`${baseUrl}/${phoneId}/messages`, templatePayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });

        const messageId = res.data?.messages?.[0]?.id || "template_delivery_update_sent";
        console.log(`✅ [TEMPLATE: order_delivery_update] WhatsApp delivered to ${recipient}! Message ID: ${messageId}`);
        return { success: true, messageSid: messageId };
      } catch (err: any) {
        console.warn("⚠️ order_delivery_update send failed, trying default:", err.response?.data || err.message);
      }
    }

    // ── ATTEMPT 1: SEND VIA APPROVED TEMPLATE (`delivery_confirmation_1`) WITH "View Bill" (PDF) BUTTON ──
    // Variables:
    // {{1}} = Customer Name (e.g. Vikas)
    // {{2}} = Restaurant Name (e.g. The Friends Cafe)
    // {{3}} = Bill Number (e.g. INV/2611/0158)
    // {{4}} = Grand Total (e.g. 102.00)
    // {{5}} = Payment Mode (e.g. Paid (Cash))
    // Button URL Dynamic Param = bill.billId || bill.invoiceNo (appended to https://billing.kravy.in/api/bill-manager/{{1}}/pdf)
    try {
      const billRef = bill.billId || bill.invoiceNo.replace(/\//g, "-");
      const templatePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: "delivery_confirmation_1",
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: customerGreeting },
                { type: "text", text: businessName },
                { type: "text", text: bill.invoiceNo },
                { type: "text", text: formattedTotal },
                { type: "text", text: paymentStatus }
              ]
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                { type: "text", text: billRef }
              ]
            }
          ]
        }
      };

      const res = await axios.post(`${baseUrl}/${phoneId}/messages`, templatePayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const messageId = res.data?.messages?.[0]?.id || "template_delivery_confirmation_1_sent";
      console.log(`✅ [TEMPLATE: delivery_confirmation_1] WhatsApp Bill delivered to ${recipient}! Message ID: ${messageId}`);
      return { success: true, messageSid: messageId };
    } catch (newTemplateErr: any) {
      console.warn("⚠️ delivery_confirmation_1 template send failed, trying order_details fallback:", newTemplateErr.response?.data || newTemplateErr.message);
    }

    // ── ATTEMPT 2: FALLBACK TO `order_details` TEMPLATE ───────────────────
    try {
      const templatePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "template",
        template: {
          name: "order_details",
          language: { code: "en" },
          components: [
            {
              type: "header",
              parameters: [
                { type: "text", text: businessName }
              ]
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: customerGreeting },
                { type: "text", text: itemsSummary || "Bill Receipt" },
                { type: "text", text: formattedTotal },
                { type: "text", text: paymentStatus }
              ]
            }
          ]
        }
      };

      const res = await axios.post(`${baseUrl}/${phoneId}/messages`, templatePayload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      const messageId = res.data?.messages?.[0]?.id || "template_order_details_sent";
      console.log(`✅ [TEMPLATE: order_details] WhatsApp Bill delivered to ${recipient}! Message ID: ${messageId}`);
      return { success: true, messageSid: messageId };
    } catch (templateError: any) {
      console.warn("⚠️ Template send encountered an issue, falling back to session text:", templateError.response?.data || templateError.message);
    }

    // ── ATTEMPT 3: FALLBACK TO FULL FORMATTED SESSION TEXT ────────────────
    const messageText = formatBillText(bill);
    const textResponse = await axios.post(
      `${baseUrl}/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: messageText,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const messageId = textResponse.data?.messages?.[0]?.id || "meta_sent";
    console.log(`✅ [SESSION_TEXT] WhatsApp bill sent to ${recipient}! Message ID: ${messageId}`);
    return { success: true, messageSid: messageId };

  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error("❌ Meta WhatsApp Send Bill Error:", errorDetails);
    const msg = error.response?.data?.error?.message || error.message || "Failed to send via Meta Cloud API";
    return { success: false, error: msg };
  }
}

// ── Send WhatsApp Bill With PDF Document ───────────────────────────────────
export async function sendWhatsAppBillWithPDF(
  bill: BillData,
  pdfUrl: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const phoneId = (process.env.META_WA_PHONE_NUMBER_ID || "476835372177437").trim();
    const token = (process.env.META_WA_TOKEN || "EAARMI34fPfgBQHeEyrhVA1K2Cs58P9ZCEL4eIxk2oXI70a7bZC0wRgtNjoFLzhuZA48nzDcIkQ804X55ZCRIdfnNLAxFMz4JRkzEEK6kCiftTPZCbUlfbrOkG2cRCBQZAOFquf8ZCvadaMK1oAdjZCIZAQIz8hODEvFVeYZB9XffzPcQS2MX3dwBj0LiWaeGmgGgZDZD").trim();
    const baseUrl = (process.env.META_WA_API_URL || "https://graph.facebook.com/v21.0").trim();

    if (!token) {
      return { success: false, error: "Meta WhatsApp Token missing in environment" };
    }

    const recipient = cleanPhoneNumber(bill.customerPhone);
    const sym = bill.currencySymbol || "₹";

    const response = await axios.post(
      `${baseUrl}/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "document",
        document: {
          link: pdfUrl,
          caption: `🧾 *${bill.restaurantName}* Bill #${bill.invoiceNo}\nTotal: ${sym}${bill.grandTotal.toFixed(2)}\n\nThank you! 🙏`,
          filename: `Bill-${bill.invoiceNo}.pdf`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const messageId = response.data?.messages?.[0]?.id || "meta_pdf_sent";
    return { success: true, messageSid: messageId };
  } catch (error: any) {
    const msg = error.response?.data?.error?.message || error.message || "Failed to send PDF via Meta";
    return { success: false, error: msg };
  }
}

// ── Send WhatsApp OTP via Meta Cloud API ───────────────────────────────────
export async function sendWhatsAppOTP(
  name: string,
  phone: string,
  otp: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const phoneId = (process.env.META_WA_PHONE_NUMBER_ID || "476835372177437").trim();
    const token = (process.env.META_WA_TOKEN || "EAARMI34fPfgBQHeEyrhVA1K2Cs58P9ZCEL4eIxk2oXI70a7bZC0wRgtNjoFLzhuZA48nzDcIkQ804X55ZCRIdfnNLAxFMz4JRkzEEK6kCiftTPZCbUlfbrOkG2cRCBQZAOFquf8ZCvadaMK1oAdjZCIZAQIz8hODEvFVeYZB9XffzPcQS2MX3dwBj0LiWaeGmgGgZDZD").trim();
    const baseUrl = (process.env.META_WA_API_URL || "https://graph.facebook.com/v21.0").trim();

    const recipient = cleanPhoneNumber(phone);

    const response = await axios.post(
      `${baseUrl}/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: {
          preview_url: false,
          body: `🔐 *Kravy POS Verification*\n\nHello ${name},\n\nYour 6-digit verification code is: *${otp}*\n\nThis code will expire in 10 minutes.\n\n🙏 Thank you for using Kravy!`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const messageId = response.data?.messages?.[0]?.id || "meta_otp_sent";
    return { success: true, messageSid: messageId };
  } catch (error: any) {
    const msg = error.response?.data?.error?.message || error.message;
    return { success: false, error: msg };
  }
}
