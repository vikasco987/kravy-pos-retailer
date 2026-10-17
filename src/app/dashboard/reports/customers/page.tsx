import { getServerCurrency } from '@/lib/server-currency';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEffectiveClerkId } from "@/lib/auth-utils";
import { ChevronLeft, Users, UserPlus, UserCheck, Heart, Search, Download, Calendar, User, Phone, Zap, Star, ShieldCheck, Clock, ArrowRight, BadgePercent } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

export default async function CustomerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const effectiveId = await getEffectiveClerkId();
  const { sym } = await getServerCurrency();
  if (!effectiveId) redirect("/auth/custom");

  const { filter = "All" } = await searchParams;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [allBills, pastBills, historicalBills, parties] = await Promise.all([
     prisma.billManager.findMany({
        where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { gte: startOfDay } },
        orderBy: { createdAt: "desc" }
     }),
     prisma.billManager.findMany({
        where: { clerkUserId: effectiveId, isDeleted: false, createdAt: { lt: startOfDay } },
        select: { customerPhone: true }
     }),
     prisma.billManager.findMany({
        where: { clerkUserId: effectiveId, isDeleted: false },
        select: { customerName: true, customerPhone: true, total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500
     }),
     prisma.party.findMany({
        where: { createdBy: effectiveId },
        select: { name: true, phone: true, loyaltyPoints: true }
     })
  ]);

  const pastPhones = new Set(pastBills.map(b => b.customerPhone).filter(Boolean));
  const cleanPhone = (phone?: string | null) => phone ? phone.replace(/[\s\-\(\)\+]/g, "").slice(-10) : "";
  const partyMap = new Map(parties.map(p => [cleanPhone(p.phone), p]));
  const crmMap = new Map<string, { name: string; phone: string; visits: number; totalSpend: number; lastVisit: Date; loyaltyPoints: number }>();

  historicalBills.forEach((bill) => {
     const phone = cleanPhone(bill.customerPhone);
     if (!phone) return;
     const party = partyMap.get(phone);
     const existing = crmMap.get(phone);
     const name = bill.customerName || party?.name || "Guest";
     if (!existing) {
        crmMap.set(phone, {
          name,
          phone,
          visits: 1,
          totalSpend: bill.total || 0,
          lastVisit: bill.createdAt,
          loyaltyPoints: party?.loyaltyPoints || 0
        });
        return;
     }
     existing.visits += 1;
     existing.totalSpend += bill.total || 0;
     if (bill.createdAt > existing.lastVisit) existing.lastVisit = bill.createdAt;
     existing.loyaltyPoints = party?.loyaltyPoints || existing.loyaltyPoints;
  });

  const repeatOfferCandidates = Array.from(crmMap.values())
    .filter(c => c.visits >= 2)
    .map(c => {
      const inactiveDays = Math.floor((now.getTime() - c.lastVisit.getTime()) / (1000 * 60 * 60 * 24));
      const suggestedCode = inactiveDays >= 30 ? "WINBACK10" : c.visits >= 5 ? "LOYAL15" : "REPEAT10";
      const reason = inactiveDays >= 30 ? `${inactiveDays} days inactive` : c.visits >= 5 ? "high repeat visitor" : "repeat customer";
      return { ...c, inactiveDays, suggestedCode, reason };
    })
    .sort((a, b) => (b.visits - a.visits) || (b.totalSpend - a.totalSpend))
    .slice(0, 6);
  
  // Categorize
  const customers = allBills.map(bill => {
     const isIdentifiable = !!bill.customerPhone;
     const isRepeat = isIdentifiable && pastPhones.has(bill.customerPhone);
     const type = !isIdentifiable ? "WalkIn" : (isRepeat ? "Repeat" : "New");
     return { ...bill, type };
  });

  const filteredCustomers = filter === "All" ? customers : customers.filter(c => c.type === filter);

  // Stats
  const newCount = customers.filter(c => c.type === "New").length;
  const repeatCount = customers.filter(c => c.type === "Repeat").length;
  const walkInCount = customers.filter(c => c.type === "WalkIn").length;
  const totalCount = customers.length;

  const format = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", padding: "16px", background: "var(--kravy-bg)", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link href="/dashboard" style={{
            width: "52px", height: "52px", borderRadius: "18px", background: "var(--kravy-surface)",
            border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kravy-text-primary)",
            boxShadow: "0 8px 16px rgba(0,0,0,0.06)"
          }}>
            <ChevronLeft size={28} />
          </Link>
          <div>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-2.2px", lineHeight: 1, marginBottom: "8px" }}>Loyalty Matrix</h1>
            <p style={{ fontSize: "0.9rem", color: "var(--kravy-text-muted)", display: "flex", alignItems: "center", gap: "10px" }}>
              <Heart size={16} style={{ color: "#EF4444" }} /> Customer Retention & Footfall Analytics
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
           <div style={{ padding: "10px 20px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 800 }}>
              {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
           </div>
           <button style={{ padding: "12px", background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "14px", color: "var(--kravy-text-muted)" }}><Download size={20} /></button>
        </div>
      </div>

      {/* ── Sentiment Hub ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "32px" }}>
         {[
           { label: "Total Reach", val: totalCount, icon: <Users />, color: "#06B6D4", key: "All" },
           { label: "New Leads", val: newCount, icon: <UserPlus />, color: "#10B981", key: "New" },
           { label: "Loyal Base", val: repeatCount, icon: <UserCheck />, color: "#F59E0B", key: "Repeat" },
           { label: "Walk-ins", val: walkInCount, icon: <User />, color: "#64748B", key: "WalkIn" }
         ].map(s => (
            <Link key={s.key} href={`/dashboard/reports/customers?filter=${s.key}`} style={{ 
              background: filter === s.key ? "var(--kravy-surface)" : "transparent",
              border: filter === s.key ? "2px solid" : "1px solid var(--kravy-border)",
              borderColor: filter === s.key ? s.color : "var(--kravy-border)",
              borderRadius: "32px", padding: "32px", textDecoration: "none", transition: "all 0.3s",
              boxShadow: filter === s.key ? `0 20px 40px ${s.color}15` : "none"
            }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${s.color}15`, color: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                  {filter === s.key && <Zap size={16} style={{ color: s.color }} />}
               </div>
               <div style={{ fontSize: "2.5rem", fontWeight: 950, color: "var(--kravy-text-primary)", lineHeight: 1 }}>{s.val}</div>
               <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginTop: "8px" }}>{s.label}</div>
            </Link>
         ))}
      </div>

      {/* ── Repeat Offer Candidates ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "32px", padding: "28px", boxShadow: "0 20px 50px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "22px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 950, color: "var(--kravy-text-primary)", margin: 0 }}>Repeat Visit Offers</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--kravy-text-muted)", marginTop: "6px", fontWeight: 700 }}>Customers who should receive a comeback or loyalty coupon.</p>
          </div>
          <Link href="/dashboard/offers" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "14px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", color: "var(--kravy-text-primary)", fontSize: "0.75rem", fontWeight: 900, textTransform: "uppercase" }}>
            <BadgePercent size={16} /> Manage Offers
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          {repeatOfferCandidates.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", padding: "28px", borderRadius: "22px", background: "var(--kravy-bg-2)", color: "var(--kravy-text-muted)", fontWeight: 800, textAlign: "center" }}>
              Repeat customer data will appear after identifiable customers place more than one order.
            </div>
          ) : repeatOfferCandidates.map(c => (
            <div key={c.phone} style={{ border: "1px solid var(--kravy-border)", borderRadius: "22px", padding: "20px", background: "var(--kravy-bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "1rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{c.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--kravy-text-faint)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}><Phone size={12} /> {c.phone}</div>
                </div>
                <span style={{ padding: "6px 10px", borderRadius: "999px", background: "#FFF7ED", color: "#EA580C", fontSize: "0.68rem", fontWeight: 950 }}>{c.suggestedCode}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "18px" }}>
                <div style={{ padding: "12px", borderRadius: "16px", background: "var(--kravy-surface)" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Visits</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{c.visits}</div>
                </div>
                <div style={{ padding: "12px", borderRadius: "16px", background: "var(--kravy-surface)" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase" }}>Spend</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{sym}{format(c.totalSpend)}</div>
                </div>
              </div>
              <div style={{ marginTop: "14px", fontSize: "0.72rem", color: "var(--kravy-text-muted)", fontWeight: 800 }}>{c.reason} • {c.loyaltyPoints} loyalty pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Analytics Ledger ── */}
      <div style={{ background: "var(--kravy-surface)", border: "1px solid var(--kravy-border)", borderRadius: "44px", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.05)" }}>
         <div style={{ padding: "40px 52px", borderBottom: "1px solid var(--kravy-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
               <div style={{ padding: "10px 20px", borderRadius: "14px", background: "var(--kravy-bg-2)", border: "1px solid var(--kravy-border)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Star size={18} style={{ color: "#F59E0B" }} />
                  <span style={{ fontWeight: 900, fontSize: "0.95rem" }}>{filter} Segment Audit</span>
               </div>
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--kravy-text-muted)" }}>
               {filteredCustomers.length} PROFILES DETECTED TODAY
            </div>
         </div>
         <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderSpacing: 0 }}>
               <thead>
                  <tr style={{ background: "rgba(0,0,0,0.01)" }}>
                     <th style={{ padding: "24px 52px", textAlign: "left", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Customer Identity</th>
                     <th style={{ padding: "24px 52px", textAlign: "center", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Loyalty Status</th>
                     <th style={{ padding: "24px 52px", textAlign: "right", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Session Time</th>
                     <th style={{ padding: "24px 52px", textAlign: "right", fontSize: "0.8rem", fontWeight: 900, color: "var(--kravy-text-muted)", textTransform: "uppercase", letterSpacing: "1.5px" }}>Transaction Value</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: "120px", textAlign: "center" }}>
                        <div style={{ width: "80px", height: "80px", borderRadius: "24px", background: "var(--kravy-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--kravy-text-faint)" }}><Search size={40} /></div>
                        <p style={{ fontWeight: 900, color: "var(--kravy-text-muted)" }}>No customers found in this segment today.</p>
                    </td></tr>
                  ) : filteredCustomers.map(c => (
                     <tr key={c.id} style={{ borderTop: "1px solid var(--kravy-border)", transition: "all 0.2s" }}>
                        <td style={{ padding: "28px 52px" }}>
                           <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                              <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "var(--kravy-bg-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--kravy-brand)" }}>
                                 <User size={24} />
                              </div>
                              <div>
                                 <div style={{ fontSize: "1.1rem", fontWeight: 950, color: "var(--kravy-text-primary)" }}>{c.customerName || "Walk-in Guest"}</div>
                                 <div style={{ fontSize: "0.8rem", color: "var(--kravy-text-faint)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <Phone size={12} /> {c.customerPhone || "Unidentifiable"}
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td style={{ padding: "28px 52px", textAlign: "center" }}>
                           <span style={{ 
                              fontSize: "0.7rem", fontWeight: 950, letterSpacing: "1px", padding: "6px 20px",
                              borderRadius: "12px", border: "1.5px solid",
                              background: c.type === "Repeat" ? "#FFFBEB" : (c.type === "New" ? "#F0FDF4" : "#F8FAFC"),
                              color: c.type === "Repeat" ? "#D97706" : (c.type === "New" ? "#10B981" : "#64748B"),
                              borderColor: c.type === "Repeat" ? "#D97706" : (c.type === "New" ? "#10B981" : "#64748B"),
                              textTransform: "uppercase"
                           }}>
                              {c.type} Customer
                           </span>
                        </td>
                        <td style={{ padding: "28px 52px", textAlign: "right" }}>
                           <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", fontSize: "0.9rem", fontWeight: 800 }}>
                              <Clock size={16} /> {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </div>
                        </td>
                        <td style={{ padding: "28px 52px", textAlign: "right" }}>
                           <div style={{ fontSize: "1.75rem", fontWeight: 950, color: "var(--kravy-text-primary)", letterSpacing: "-1.8px" }}>{sym}{format(c.total)}</div>
                           <div style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 900, marginTop: "4px" }}>BILLABLE SESSION</div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
