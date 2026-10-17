"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Lock, 
  Check, 
  X, 
  Save, 
  AlertCircle,
  Loader2,
  Trash2,
  UserCheck,
  UserX,
  Ban,
  LayoutGrid,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  PlusCircle,
  Upload,
  Settings,
  Package,
  QrCode,
  Key,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Camera,
  TrendingUp,
  PieChart,
  UserCircle,
  Percent,
  Archive,
  HelpCircle,
  BarChart3,
  IndianRupee,
  Edit3,
  CheckCircle2,
  MessageCircle,
  ChefHat
} from "lucide-react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthContext";
import { useConfirm } from "@/components/ConfirmContext";


const PERMISSION_GROUPS = [
  {
    title: "Store Operations",
    icon: <LayoutGrid className="text-blue-500" size={18} />,
    paths: [
      { path: "/dashboard", label: "Store Dashboard" },
      { path: "/dashboard/billing/checkout", label: "Quick POS Billing" },
      { path: "/dashboard/terminal", label: "Floor Management" },
      { path: "/dashboard/kds", label: "Kitchen Display (KDS)" },
      { path: "/dashboard/kitchen", label: "Kitchen Terminal" },
      { path: "/dashboard/tables", label: "Table Settings" },
      { path: "/dashboard/qr-orders", label: "QR Order Terminal" },
      { path: "/dashboard/rooms", label: "Hotel Room Stay" },
      { path: "/dashboard/workflow", label: "Legacy Kitchen Workflow" },
    ]
  },
  {
    title: "Kitchen Display (KDS) Actions",
    icon: <ChefHat className="text-amber-500" size={18} />,
    paths: [
      { path: "kds-start-cooking", label: "Allow: Start Cooking / Prepare" },
      { path: "kds-item-prepared", label: "Allow: Mark Individual Item Ready" },
      { path: "kds-mark-ready", label: "Allow: Mark Full KOT Ready" },
      { path: "kds-complete-order", label: "Allow: Complete / Serve Ticket" },
      { path: "kds-recall-order", label: "Allow: Recall Completed KOTs" },
      { path: "kds-item-summary", label: "Allow: View Item Summary Drawer" },
      { path: "kds-settings", label: "Allow: Customize KDS Layout & Settings" },
    ]
  },
  {
    title: "Billing & History",
    icon: <Receipt className="text-orange-500" size={18} />,
    paths: [
      { path: "/dashboard/billing", label: "Past Bills / History" },
      { path: "edit-bill", label: "Allow: Edit Past Bills" },
      { path: "delete-bill", label: "Allow: Delete Past Bills" },
      { path: "mark-as-paid", label: "Allow: Change Payment Status" },
      { path: "whatsapp-bill", label: "Allow: WhatsApp Billing" },
    ]
  },
  {
    title: "POS Actions",
    icon: <ShoppingCart className="text-emerald-500" size={18} />,
    paths: [
      { path: "pos-discount", label: "Allow: Apply Discounts" },
      { path: "pos-edit-price", label: "Allow: Edit Item Prices" },
      { path: "pos-delete-item", label: "Allow: Delete Items from Cart" },
    ]
  },
  {
    title: "Kitchen Actions",
    icon: <Activity className="text-red-500" size={18} />,
    paths: [
      { path: "kit-complete-order", label: "Allow: Mark Order as Ready" },
      { path: "kit-cancel-order", label: "Allow: Cancel/Remove KOT" },
    ]
  },
  {
    title: "Menu & Inventory",
    icon: <UtensilsCrossed className="text-purple-500" size={18} />,
    paths: [
      { path: "/dashboard/menu/view", label: "Browse Products" },
      { path: "/dashboard/menu-editor", label: "Interactive Editor" },
      { path: "/dashboard/menu/addons", label: "Add-on clusters" },
      { path: "/dashboard/ai-scraper", label: "AI Menu Scraper" },
      { path: "/dashboard/menu/upload", label: "Add Single Item" },
      { path: "/dashboard/store-item-upload", label: "Excel Bulk Import" },
      { path: "/dashboard/menu/edit", label: "Category & Editor" },
      { path: "edit", label: "Legacy Edit POS" },
      { path: "/dashboard/inventory", label: "Inventory Stock" },
      { path: "inv-edit-stock", label: "Allow: Update Stock Levels" },
      { path: "menu-delete-item", label: "Allow: Delete Menu Items" },
    ]
  },
  {
    title: "Reports & Analytics",
    icon: <TrendingUp className="text-cyan-500" size={18} />,
    paths: [
      { path: "/dashboard/reports/sales/daily", label: "Daily Sales Report" },
      { path: "/dashboard/reports/sales/revenue", label: "Revenue Analysis" },
      { path: "/dashboard/reports/payments", label: "Mode of Payment" },
      { path: "/dashboard/reports/performance", label: "Business Growth" },
      { path: "/dashboard/reports/gst", label: "GST Reports" },
    ]
  },
  {
    title: "Administration",
    icon: <Settings className="text-slate-400" size={18} />,
    paths: [
      { path: "/dashboard/parties", label: "Customer Parties" },
      { path: "view-customer-phone", label: "Allow: View Customer Phone" },
      { path: "print-customer-phone", label: "Allow: Print Customer Phone" },
      { path: "/dashboard/staff", label: "Staff Management" },
      { path: "/dashboard/combos", label: "Marketing Hub" },
      { path: "/dashboard/gallery", label: "Gallery Manager" },
      { path: "/dashboard/profile", label: "Business Profile" },
      { path: "/dashboard/settings", label: "POS Settings" },
      { path: "/dashboard/settings/tax", label: "Tax Management" },
      { path: "/dashboard/backup", label: "Security & Backup" },
      { path: "/dashboard/billing/deleted", label: "Archive & Trash" },
      { path: "/dashboard/help", label: "Help & Support" },
    ]
  }
];

type StaffMember = {
  id: string;
  name: string;
  email: string;
  clerkId: string;
  role: string;
  allowedPaths: string[];
  isDisabled: boolean;
};

export default function StaffManagementPage() {
  const { confirm } = useConfirm();
  const router = useRouter();
  const { user } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", phone: "" });
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editInfoData, setEditInfoData] = useState({ name: "", phone: "" });

  useEffect(() => {
    fetch("/api/user/me")
      .then(res => res.json())
      .then(data => {
        const isOwner = data.role === "OWNER" || data.role === "SELLER" || data.role === "ADMIN";
        const hasPerm = data.allowedPaths?.includes("/dashboard/staff");
        setIsAdmin(isOwner);
        setCanManage(isOwner || hasPerm);
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/seller/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (error) {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await fetch("/api/seller/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff)
      });

      if (res.ok) {
        toast.success("Staff member added successfully");
        setNewStaff({ name: "", email: "", password: "", phone: "" });
        fetchStaff();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add staff");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleTogglePath = (path: string) => {
    if (!selectedStaff) return;
    const currentPaths = selectedStaff.allowedPaths || [];
    const newPaths = currentPaths.includes(path)
      ? currentPaths.filter(p => p !== path)
      : [...currentPaths, path];
    
    setSelectedStaff({ ...selectedStaff, allowedPaths: newPaths });
  };

  const handleToggleGroup = (paths: string[]) => {
    if (!selectedStaff) return;
    const currentPaths = selectedStaff.allowedPaths || [];
    const allSelected = paths.every(p => currentPaths.includes(p));
    
    let newPaths = [...currentPaths];
    if (allSelected) {
      newPaths = newPaths.filter(p => !paths.includes(p));
    } else {
      paths.forEach(p => {
        if (!newPaths.includes(p)) newPaths.push(p);
      });
    }
    setSelectedStaff({ ...selectedStaff, allowedPaths: newPaths });
  };

  const savePermissions = async () => {
    if (!selectedStaff) return;
    setSavingPermissions(true);
    try {
      const res = await fetch("/api/seller/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          clerkId: selectedStaff.clerkId,
          allowedPaths: selectedStaff.allowedPaths,
          newPassword: updatingPassword || undefined
        })
      });

      if (res.ok) {
        toast.success(updatingPassword ? "Permissions & Password updated" : "Permissions updated");
        setUpdatingPassword("");
        setIsEditingInfo(false);
        fetchStaff();
        setSelectedStaff(null);
      } else {
        toast.error("Failed to update staff member");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSavingPermissions(false);
    }
  };

  const saveProfileInfo = async () => {
    if (!selectedStaff) return;
    setSavingPermissions(true);
    try {
      const res = await fetch("/api/seller/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaff.id,
          name: editInfoData.name,
          phone: editInfoData.phone
        })
      });

      if (res.ok) {
        toast.success("Profile information updated");
        setIsEditingInfo(false);
        fetchStaff();
        setSelectedStaff(null);
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Network error");
    } finally {
      setSavingPermissions(false);
    }
  };

  const deleteStaff = async (member: StaffMember) => {
    if (!await confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) return;
    
    try {
      const url = new URL("/api/seller/staff", window.location.origin);
      if (member.clerkId) url.searchParams.set("clerkId", member.clerkId);
      url.searchParams.set("id", member.id);

      const res = await fetch(url.toString(), { method: "DELETE" });
      if (res.ok) {
        toast.success("Staff member deleted");
        fetchStaff();
        if (selectedStaff?.id === member.id) setSelectedStaff(null);
      } else {
        toast.error("Failed to delete staff");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const toggleBlockStaff = async (member: StaffMember) => {
    const action = member.isDisabled ? "unblock" : "block";
    if (!await confirm(`Are you sure you want to ${action} ${member.name}?`)) return;

    try {
      const res = await fetch("/api/seller/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: member.id,
          clerkId: member.clerkId,
          isDisabled: !member.isDisabled
        })
      });

      if (res.ok) {
        toast.success(`Staff member ${action}ed`);
        fetchStaff();
        if (selectedStaff?.id === member.id) {
          setSelectedStaff({ ...selectedStaff, isDisabled: !member.isDisabled });
        }
      } else {
        toast.error(`Failed to ${action} staff`);
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 sm:pb-5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Manage Staff Access
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Control what your restaurant staff can see and do.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {isAdmin && (
            <button 
              onClick={async () => router.push("/dashboard/docs/staff-access")}
              className="flex items-center gap-2 bg-indigo-600 text-white px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl border border-indigo-700 hover:bg-indigo-500 transition-all font-bold text-xs sm:text-sm shadow-sm whitespace-nowrap shrink-0"
            >
              <Zap size={15} className="shrink-0" /> 
              <span>Technical Docs</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 px-3.5 py-2 sm:px-4 sm:py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50 whitespace-nowrap shrink-0">
            <Shield className="text-indigo-600 dark:text-indigo-400 shrink-0" size={16} />
            <span className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-100">Owner Controls Active</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          {canManage && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-slate-900 dark:text-white">
                <UserPlus size={80} />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                <UserPlus className="text-indigo-600 dark:text-indigo-400" size={20} />
                Add New Staff Member
              </h2>
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rahul Singh"
                    value={newStaff.name}
                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                    <input
                      required
                      type="email"
                      placeholder="rahul@kravypos.com"
                      value={newStaff.email}
                      onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-24 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        const random = Math.random().toString(36).slice(-5);
                        setNewStaff({...newStaff, email: `staff.${random}@kravypos.com`});
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white"
                    >
                      Auto-Gen
                    </button>
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newStaff.phone}
                    onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Generate Password</label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Set a secure password"
                      value={newStaff.password}
                      onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-20 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={async () => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-indigo-600 p-1"
                      >
                        {showPassword ? <UserX size={14} /> : <Lock size={14} />}
                      </button>
                      <button 
                        type="button"
                        onClick={async () => {
                          const pass = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + "!";
                          setNewStaff({...newStaff, password: pass});
                          setShowPassword(true);
                        }}
                        className="text-[10px] font-bold bg-white dark:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white"
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="sm:col-span-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold py-2.5 sm:py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm shadow-md"
                >
                  {isAdding ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  Add Staff to Restaurant
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 ml-2">
              <Users className="text-blue-600 dark:text-blue-400" size={20} />
              Current Staff ({staff.length})
            </h2>
            <div className="grid gap-3">
              {staff.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-10 text-center">
                   <AlertCircle className="mx-auto text-slate-400 dark:text-slate-600 mb-2" />
                   <p className="text-slate-500 dark:text-slate-400 font-medium">No staff members found.</p>
                </div>
              ) : (
                staff.map(member => (
                  <motion.div
                    key={member.id}
                    layoutId={member.id}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all ${selectedStaff?.id === member.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${member.isDisabled ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'}`}>
                        {member.isDisabled ? <UserX size={20} /> : <UserCheck size={20} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`font-bold text-sm sm:text-base flex items-center flex-wrap gap-1.5 transition-all ${member.isDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-white'}`}>
                          <span className="truncate">{member.name}</span>
                          {member.isDisabled && <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md uppercase font-black shrink-0">Blocked</span>}
                        </div>
                        <div className={`text-xs font-medium truncate transition-all ${member.isDisabled ? 'text-slate-300 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <button
                        onClick={async () => toggleBlockStaff(member)}
                        title={member.isDisabled ? "Unblock Staff" : "Block Staff"}
                        className={`p-2 rounded-xl transition-all ${member.isDisabled ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60' : 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-950/80'}`}
                      >
                        {member.isDisabled ? <UserCheck size={18} /> : <Ban size={18} />}
                      </button>
                      <button
                        onClick={async () => deleteStaff(member)}
                        title="Delete Staff"
                        className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-950/80 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={async () => {
                          setSelectedStaff(member);
                          setIsEditingInfo(false);
                          setEditInfoData({ name: member.name, phone: (member as any).phone || "" });
                        }}
                        className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                      >
                        Settings
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-5">
           <AnimatePresence mode="wait">
             {selectedStaff ? (
               <motion.div
                 key="terminal-active"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 shadow-xl p-3 sm:p-5 xl:sticky xl:top-6 h-fit"
               >
                 <div className="flex items-center justify-between gap-2 mb-6 sm:mb-8">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                       <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shrink-0">
                          <Lock size={16} />
                       </div>
                       <h3 className="text-white font-black text-sm sm:text-base truncate">Edit: <span className="text-orange-400">{selectedStaff.name}</span></h3>
                    </div>
                    <button onClick={async () => setSelectedStaff(null)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0">
                       <X size={20} />
                    </button>
                 </div>

                  <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6">
                    <button 
                      onClick={async () => setIsEditingInfo(false)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isEditingInfo ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Permissions
                    </button>
                    <button 
                      onClick={async () => setIsEditingInfo(true)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isEditingInfo ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Profile Info
                    </button>
                  </div>

                  {!isEditingInfo ? (
                    <>
                      <p className="text-slate-400 text-xs mb-5 font-medium leading-relaxed">
                        Select the modules this staff member can access. Unticked items will be hidden from their sidebar immediately.
                      </p>
                      <div className="mb-6 p-3.5 sm:p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                           <Key size={12} className="text-orange-400" />
                           Reset Staff Password
                        </label>
                        <div className="flex gap-2">
                           <input 
                             type="text"
                             placeholder="New password (optional)"
                             value={updatingPassword}
                             onChange={(e) => setUpdatingPassword(e.target.value)}
                             className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-orange-500 outline-none"
                           />
                           <button 
                             type="button"
                             onClick={async () => setUpdatingPassword(Math.random().toString(36).slice(-8))}
                             className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl"
                           >
                             <Sparkles size={14} />
                           </button>
                        </div>
                        {updatingPassword && (
                           <p className="text-[9px] text-orange-300/70 font-medium">⚠️ Password will be updated when you save.</p>
                        )}
                      </div>

                      <div className="space-y-4 mb-6 max-h-[450px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                          {PERMISSION_GROUPS.map((group, idx) => {
                            const groupPaths = group.paths.map(p => p.path);
                            const allSelected = groupPaths.every(p => selectedStaff.allowedPaths?.includes(p));
                            const someSelected = groupPaths.some(p => selectedStaff.allowedPaths?.includes(p));
                            
                            return (
                              <div key={idx} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3.5 bg-slate-800/80 border-b border-slate-700/50">
                                  <div className="flex items-center gap-3">
                                    {group.icon}
                                    <h4 className="text-xs sm:text-sm font-black text-white truncate">{group.title}</h4>
                                  </div>
                                  <button
                                    onClick={() => handleToggleGroup(groupPaths)}
                                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap transition-all ${allSelected ? 'bg-indigo-500 text-white' : someSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                  >
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                  </button>
                                </div>
                                <div className="p-2 sm:p-2.5 grid grid-cols-1 2xl:grid-cols-2 gap-1.5 sm:gap-2">
                                  {group.paths.map(item => {
                                    const isActive = selectedStaff.allowedPaths?.includes(item.path);
                                    return (
                                      <button
                                        key={item.path}
                                        onClick={async () => handleTogglePath(item.path)}
                                        className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all ${isActive ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-bold text-left leading-tight">{item.label}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${isActive ? 'bg-indigo-500 text-white' : 'border border-slate-700'}`}>
                                           {isActive && <Check size={12} />}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                       </div>

                      <button
                         onClick={savePermissions}
                         disabled={savingPermissions}
                         className="w-full bg-indigo-600 text-white font-black py-3 sm:py-3.5 rounded-xl sm:rounded-2xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 text-xs sm:text-sm"
                      >
                         {savingPermissions ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                         Update Permissions
                      </button>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">Display Name</label>
                        <input 
                          type="text"
                          value={editInfoData.name}
                          onChange={(e) => setEditInfoData({...editInfoData, name: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">Contact Number</label>
                        <input 
                          type="tel"
                          value={editInfoData.phone}
                          onChange={(e) => setEditInfoData({...editInfoData, phone: e.target.value})}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                         <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <AlertCircle size={12} /> Email Restricted
                         </p>
                         <p className="text-[11px] text-slate-400">Staff email login ID ({selectedStaff.email}) cannot be changed after account creation to maintain security logs.</p>
                      </div>
                      <button
                         onClick={saveProfileInfo}
                         disabled={savingPermissions}
                         className="w-full bg-orange-600 text-white font-black py-3 sm:py-3.5 rounded-xl sm:rounded-2xl hover:bg-orange-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 text-xs sm:text-sm"
                      >
                         {savingPermissions ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                         Save Profile Changes
                      </button>
                    </div>
                  )}
               </motion.div>
             ) : (
               <motion.div
                 key="terminal-empty"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
               >
                 <div className="w-16 h-16 rounded-3xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
                    <Lock size={32} />
                 </div>
                 <h3 className="text-slate-800 font-black">Staff Control Terminal</h3>
                 <p className="text-slate-500 text-sm max-w-[250px] mt-2">
                   Select a staff member from the list to manage their dashboard visibility.
                 </p>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
