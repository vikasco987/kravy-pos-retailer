"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Plus, Search, Filter, Calendar, 
    Trash2, Edit3, IndianRupee, Tag, 
    FileText, CreditCard, Banknote, 
    LayoutDashboard, ArrowUpRight, 
    ArrowDownRight, PieChart, 
    MoreVertical, Download, X,
    ChevronLeft, ChevronRight,
    Utensils, Wallet, ShoppingCart, 
    Lightbulb, Users, Rocket,
    MoreHorizontal, Settings, Edit, Trash, AlertCircle, Info, Scale
} from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { kravy } from "@/lib/sounds";

const DEFAULT_CATEGORIES = [
    { name: "Ingredients", icon: "ShoppingCart", color: "#F59E0B" },
    { name: "Rent", icon: "Wallet", color: "#3B82F6" },
    { name: "Salaries", icon: "Users", color: "#6366F1" },
    { name: "Utilities", icon: "Lightbulb", color: "#10B981" },
    { name: "Marketing", icon: "Rocket", color: "#F43F5E" },
    { name: "Others", icon: "MoreHorizontal", color: "#64748B" },
];

const ICON_MAP: any = {
    ShoppingCart, Wallet, Users, Lightbulb, Rocket, MoreHorizontal, Utensils, Tag, CreditCard, Banknote
};

export default function ExpensesPage() {
    const router = useRouter();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");
    const [mounted, setMounted] = useState(false);

    // Custom Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'info';
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => {},
        type: 'info'
    });

    const [formData, setFormData] = useState({
        amount: "",
        category: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        paymentMode: "Cash",
    });

    const [catFormData, setCatFormData] = useState({
        id: "",
        name: "",
        color: "#64748B",
        icon: "MoreHorizontal"
    });

    useEffect(() => {
        setMounted(true);
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [expRes, catRes] = await Promise.all([
                fetch("/api/expenses"),
                fetch("/api/expenses/categories")
            ]);
            
            const expData = await expRes.json();
            const catData = await catRes.json();

            setExpenses(expData);
            
            if (catData.length === 0) {
                const seeded = await seedDefaultCategories();
                setCategories(seeded);
                setFormData(prev => ({ ...prev, category: seeded[0]?.name || "" }));
            } else {
                setCategories(catData);
                setFormData(prev => ({ ...prev, category: catData[0]?.name || "" }));
            }
        } catch (error) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const seedDefaultCategories = async () => {
        const created = [];
        for (const cat of DEFAULT_CATEGORIES) {
            try {
                const res = await fetch("/api/expenses/categories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cat),
                });
                if (res.ok) created.push(await res.json());
            } catch (e) {}
        }
        const res = await fetch("/api/expenses/categories");
        return await res.json();
    };

    const fetchExpenses = async () => {
        const res = await fetch("/api/expenses");
        const data = await res.json();
        setExpenses(data);
    };

    const fetchCategories = async () => {
        const res = await fetch("/api/expenses/categories");
        const data = await res.json();
        setCategories(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingExpense ? `/api/expenses/${editingExpense.id}` : "/api/expenses";
        const method = editingExpense ? "PATCH" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                kravy.success();
                toast.success(editingExpense ? "Expense updated" : "Expense added");
                setShowAddModal(false);
                setEditingExpense(null);
                setFormData({
                    amount: "",
                    category: categories[0]?.name || "",
                    description: "",
                    date: format(new Date(), "yyyy-MM-dd"),
                    paymentMode: "Cash",
                });
                fetchExpenses();
            }
        } catch (error) {
            toast.error("Failed to save expense");
        }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const method = catFormData.id ? "PATCH" : "POST";
        const url = catFormData.id ? `/api/expenses/categories/${catFormData.id}` : "/api/expenses/categories";

        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(catFormData),
            });

            if (res.ok) {
                toast.success(catFormData.id ? "Category updated" : "Category created");
                setCatFormData({ id: "", name: "", color: "#64748B", icon: "MoreHorizontal" });
                fetchCategories();
            }
        } catch (error) {
            toast.error("Failed to save category");
        }
    };

    const deleteCategory = (id: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: "Delete Category?",
            message: "This will remove the category. Existing expenses will remain but without category assignment.",
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/expenses/categories/${id}`, { method: "DELETE" });
                    if (res.ok) {
                        toast.success("Category deleted");
                        fetchCategories();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                } catch (error) {
                    toast.error("Failed to delete");
                }
            }
        });
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: "Delete Expense?",
            message: "Are you sure you want to permanently delete this expense record? This action cannot be undone.",
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
                    if (res.ok) {
                        kravy.ping();
                        toast.success("Expense deleted");
                        fetchExpenses();
                        setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    }
                } catch (error) {
                    toast.error("Failed to delete");
                }
            }
        });
    };

    const filteredExpenses = expenses.filter(exp => {
        const matchesSearch = exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             exp.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === "All" || exp.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="w-full space-y-4 pb-16 kravy-page-fade">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4 pl-12 md:pl-0">
                <div className="space-y-0.5">
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500 shrink-0" />
                        <span>Expenses</span>
                    </h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Track your daily operational costs</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button 
                        onClick={() => { kravy.click(); setShowCategoryModal(true); }}
                        className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black uppercase tracking-wider sm:tracking-widest text-[9px] sm:text-[10px] flex items-center gap-1.5 sm:gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 whitespace-nowrap shrink-0 shadow-sm"
                    >
                        <Settings size={14} className="shrink-0" />
                        <span>Categories</span>
                    </button>
                    <button 
                        onClick={() => { kravy.click(); router.push("/dashboard/expenses/pnl"); }}
                        className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-wider sm:tracking-widest text-[9px] sm:text-[10px] flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Scale size={14} className="shrink-0" />
                        <span>P&L</span>
                    </button>
                    <button 
                        onClick={() => { kravy.click(); router.push("/dashboard/expenses/reports"); }}
                        className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black uppercase tracking-wider sm:tracking-widest text-[9px] sm:text-[10px] flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <PieChart size={14} className="shrink-0" />
                        <span>Reports</span>
                    </button>
                    <button 
                        onClick={() => { kravy.toggle(); setShowAddModal(true); }}
                        className="h-9 sm:h-10 px-3.5 sm:px-5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black uppercase tracking-wider sm:tracking-widest text-[9px] sm:text-[10px] flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95 whitespace-nowrap shrink-0"
                    >
                        <Plus size={14} className="shrink-0" />
                        <span>Add Expense</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="flex md:grid md:grid-cols-3 gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 snap-x">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 shadow-sm relative overflow-hidden group min-w-[220px] md:min-w-0 flex-1 shrink-0 snap-start">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:scale-110 transition-transform"><ArrowUpRight size={48} className="text-rose-500" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Spending</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹{totalExpense.toLocaleString()}</h3>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 sm:p-5 rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group min-w-[220px] md:min-w-0 flex-1 shrink-0 snap-start">
                    <div className="absolute top-0 right-0 p-5 opacity-20 group-hover:rotate-12 transition-transform"><ShoppingCart size={48} /></div>
                    <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-2">Entries Count</p>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter">{filteredExpenses.length} Records</h3>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-4 sm:p-5 rounded-2xl bg-slate-900 dark:bg-white/10 text-white shadow-lg relative overflow-hidden group min-w-[220px] md:min-w-0 flex-1 shrink-0 snap-start">
                    <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:-rotate-12 transition-transform text-emerald-500"><Banknote size={48} /></div>
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">Primary Mode</p>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Cash Only</h3>
                </motion.div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 bg-white dark:bg-white/5 p-2 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm">
                <div className="relative flex-1 min-w-0 w-full group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" size={14} />
                    <input type="text" placeholder="Search by description or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-black/20 border-transparent rounded-lg text-xs focus:bg-white dark:focus:bg-black/40 focus:ring-2 focus:ring-rose-500/20 transition-all outline-none" />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 xl:pb-0 w-full xl:w-auto scrollbar-hide shrink-0">
                    <button onClick={() => { kravy.toggle(); setFilterCategory("All"); }} className={`h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${filterCategory === "All" ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow" : "bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-400 hover:text-slate-600"}`}>All</button>
                    {categories.map((cat) => (
                        <button key={cat.id} onClick={() => { kravy.toggle(); setFilterCategory(cat.name); }} className={`h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${filterCategory === cat.name ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow" : "bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-400 hover:text-slate-600"}`}>{cat.name}</button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-white/5">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mode</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {!loading && filteredExpenses.map((exp) => {
                                const catInfo = categories.find(c => c.name === exp.category) || { color: "#64748B", icon: "MoreHorizontal" };
                                const Icon = ICON_MAP[catInfo.icon] || MoreHorizontal;
                                return (
                                    <motion.tr key={exp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700 dark:text-white/80">{format(new Date(exp.date), "dd MMM yyyy")}</span>
                                                <span className="text-[9px] text-slate-400 font-mono italic">{format(new Date(exp.date), "hh:mm a")}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight" style={{ backgroundColor: `${catInfo.color}15`, color: catInfo.color }}><Icon size={10} />{exp.category}</div>
                                        </td>
                                        <td className="px-5 py-3.5 max-w-xs"><p className="text-xs text-slate-600 dark:text-slate-400 truncate font-medium">{exp.description || "—"}</p></td>
                                        <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">{exp.paymentMode === "Cash" ? <Banknote size={12} /> : <CreditCard size={12} />}<span className="text-[9px] font-black uppercase tracking-widest">{exp.paymentMode || "Cash"}</span></div></td>
                                        <td className="px-5 py-3.5 text-right"><span className="text-base font-black text-slate-900 dark:text-white tracking-tighter">₹{exp.amount.toLocaleString()}</span></td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button onClick={() => { kravy.open(); setEditingExpense(exp); setFormData({ amount: exp.amount.toString(), category: exp.category, description: exp.description || "", date: format(new Date(exp.date), "yyyy-MM-dd"), paymentMode: exp.paymentMode || "Cash" }); setShowAddModal(true); }} className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all" title="Edit"><Edit3 size={14} /></button>
                                                <button onClick={() => handleDelete(exp.id)} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all" title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Premium Confirmation Modal */}
            {mounted && typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {confirmModal.isOpen && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl" />
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-white/20">
                                <div className="p-10 text-center space-y-6">
                                    <div className={`w-20 h-20 rounded-[2.5rem] mx-auto flex items-center justify-center ${confirmModal.type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                        {confirmModal.type === 'danger' ? <AlertCircle size={40} strokeWidth={2.5} /> : <Info size={40} strokeWidth={2.5} />}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{confirmModal.title}</h3>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed px-4">{confirmModal.message}</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button 
                                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                            className="h-14 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => { kravy.click(); confirmModal.onConfirm(); }}
                                            className={`h-14 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${confirmModal.type === 'danger' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-indigo-500 shadow-indigo-500/20'}`}
                                        >
                                            Yes, Confirm
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Existing Modals (Categories) */}
            {mounted && typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {showCategoryModal && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative m-auto w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-black/20 shrink-0">
                                    <div>
                                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">Manage Categories</h2>
                                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Customize your expense groups</p>
                                    </div>
                                    <button onClick={() => setShowCategoryModal(false)} className="w-8 h-8 rounded-full bg-white dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shadow-sm shrink-0"><X size={18} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 space-y-4 sm:space-y-5">
                                    <form onSubmit={handleCategorySubmit} className="bg-slate-50 dark:bg-white/5 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-white/10 space-y-3.5 sm:space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <div className="space-y-1 sm:space-y-1.5">
                                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
                                                <input required type="text" value={catFormData.name} onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })} placeholder="e.g. Ingredients" className="w-full h-10 sm:h-11 px-3 bg-white dark:bg-black/40 border-2 border-transparent focus:border-rose-500/30 rounded-xl text-xs sm:text-sm font-bold outline-none transition-all shadow-sm" />
                                            </div>
                                            <div className="space-y-1 sm:space-y-1.5">
                                                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Color Picker</label>
                                                <div className="flex items-center gap-2">
                                                    <input type="color" value={catFormData.color} onChange={(e) => setCatFormData({ ...catFormData, color: e.target.value })} className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent shrink-0" />
                                                    <input type="text" value={catFormData.color} onChange={(e) => setCatFormData({ ...catFormData, color: e.target.value })} className="flex-1 min-w-0 h-10 sm:h-11 px-3 bg-white dark:bg-black/40 border-2 border-transparent focus:border-rose-500/30 rounded-xl text-xs font-mono outline-none transition-all shadow-sm" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Icon</label>
                                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                {Object.keys(ICON_MAP).map(iconName => {
                                                    const IconComp = ICON_MAP[iconName];
                                                    return (
                                                        <button key={iconName} type="button" onClick={() => setCatFormData({ ...catFormData, icon: iconName })} className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${catFormData.icon === iconName ? "bg-slate-900 text-white shadow-md scale-105" : "bg-white dark:bg-white/5 text-slate-400 hover:bg-slate-100"}`}>
                                                            <IconComp size={16} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 sm:gap-3 pt-1">
                                            <button type="submit" className="flex-1 h-10 sm:h-11 rounded-xl bg-rose-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-md shadow-rose-500/20 active:scale-95 transition-all">
                                                {catFormData.id ? "Update Category" : "Add New Category"}
                                            </button>
                                            {catFormData.id && (
                                                <button type="button" onClick={() => setCatFormData({ id: "", name: "", color: "#64748B", icon: "MoreHorizontal" })} className="h-10 sm:h-11 px-4 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                    <div className="space-y-3">
                                        <h3 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Existing Categories</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                            {categories.map(cat => {
                                                const Icon = ICON_MAP[cat.icon] || MoreHorizontal;
                                                return (
                                                    <div key={cat.id} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 flex items-center justify-between group">
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner shrink-0" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                                                                <Icon size={15} />
                                                            </div>
                                                            <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-white truncate">{cat.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button onClick={() => setCatFormData({ id: cat.id, name: cat.name, color: cat.color, icon: cat.icon })} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors" title="Edit"><Edit size={14} /></button>
                                                            <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Delete"><Trash size={14} /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Add / Edit Expense Modal */}
            {mounted && typeof document !== "undefined" && createPortal(
                <AnimatePresence>
                    {showAddModal && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="fixed inset-0 bg-slate-900/50 backdrop-blur-md" />
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="relative m-auto w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                                <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                                    <div>
                                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">{editingExpense ? "Edit Expense" : "New Expense"}</h2>
                                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Fill in the operational details</p>
                                    </div>
                                    <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors shrink-0"><X size={16} /></button>
                                </div>
                                <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-3 sm:space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
                                    <div className="space-y-1 sm:space-y-1.5"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (₹)</label><div className="relative"><IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" size={18} /><input required type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="w-full h-11 sm:h-12 pl-10 pr-4 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-rose-500/30 rounded-xl sm:rounded-2xl text-base sm:text-lg font-black outline-none transition-all" /></div></div>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1 sm:space-y-1.5"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-rose-500/30 rounded-xl text-xs sm:text-sm font-bold outline-none transition-all">{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                                        <div className="space-y-1 sm:space-y-1.5"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full h-9 sm:h-10 px-2.5 sm:px-3 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-rose-500/30 rounded-xl text-xs sm:text-sm font-bold outline-none transition-all" /></div>
                                    </div>
                                    <div className="space-y-1 sm:space-y-1.5"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="What was this expense for?" rows={2} className="w-full p-2.5 sm:p-3 bg-slate-50 dark:bg-black/40 border-2 border-transparent focus:border-rose-500/30 rounded-xl text-xs sm:text-sm font-bold outline-none transition-all resize-none" /></div>
                                    <div className="space-y-1 sm:space-y-1.5"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Mode</label><div className="grid grid-cols-2 gap-2.5 sm:gap-3">{["Cash", "UPI"].map(mode => (<button key={mode} type="button" onClick={() => { kravy.toggle(); setFormData({ ...formData, paymentMode: mode }); }} className={`h-9 sm:h-10 rounded-xl border-2 transition-all font-black text-[9px] sm:text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 ${formData.paymentMode === mode ? "bg-rose-500 border-rose-500 text-white shadow-md" : "bg-white dark:bg-black/20 border-slate-100 dark:border-white/10 text-slate-400 hover:border-rose-500/30"}`}>{mode === "Cash" ? <Banknote size={13} /> : <CreditCard size={13} />}{mode}</button>))}</div></div>
                                    <button type="submit" className="w-full h-10 sm:h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg transition-all active:scale-95 mt-1 shrink-0">{editingExpense ? "Save Changes" : "Create Expense Entry"}</button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
