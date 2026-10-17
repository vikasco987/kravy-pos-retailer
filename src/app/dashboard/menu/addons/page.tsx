"use client";
import { useCurrency } from "@/lib/currency-context";
import { useState, useEffect } from 'react'
import { Plus, Layers, ArrowLeft, Search, Loader2, Sparkles, Filter, MoreHorizontal, LayoutGrid, Zap, UtensilsCrossed, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast, Toaster } from 'react-hot-toast'
import AddonGroupsModal from '@/components/MenuEditor/AddonGroupsModal'
import Link from 'next/link'
import { useConfirm } from "@/components/ConfirmContext";


export default function AddonClustersPage() {
  const { currencySymbol: sym } = useCurrency();

  const { confirm } = useConfirm();
  const [groups, setGroups] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [clusterSearch, setClusterSearch] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  const filteredGroups = groups.filter(g => 
     g.name.toLowerCase().includes(clusterSearch.toLowerCase())
  )

  async function fetchAll() {
    setLoading(true)
    try {
      const [addonRes, itemRes, catRes] = await Promise.all([
        fetch('/api/menu-editor/addon-groups'),
        fetch('/api/items'),
        fetch('/api/categories')
      ])
      const adds = await addonRes.json()
      const itms = await itemRes.json()
      const cats = await catRes.json()
      
      setGroups(adds)
      setItems(itms)
      setCategories(cats)
    } catch (err) {
      toast.error("Failed to load ecosystem data")
    } finally {
      setLoading(false)
    }
  }

  async function fetchGroupsOnly() {
    try {
      const res = await fetch('/api/menu-editor/addon-groups')
      const data = await res.json()
      setGroups(data)
    } catch (err) {}
  }

  async function handleSaveGroup(data: any) {
    const method = data.id ? 'PUT' : 'POST'
    try {
      const res = await fetch('/api/menu-editor/addon-groups', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (res.ok) {
        toast.promise(fetchGroupsOnly(), {
          loading: 'Syncing...',
          success: 'Cluster configuration finalized!',
          error: 'Sync error'
        })
        setShowModal(false)
      } else {
        toast.error("Failed to save cluster")
      }
    } catch (err) {
      toast.error("Network synchronization failed")
    }
  }

  async function handleDeleteGroup(id: string) {
    if (!await confirm("Are you sure you want to decommission this cluster? All item linkages will be severed.")) return
    try {
      const res = await fetch(`/api/menu-editor/addon-groups?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Cluster decommissioned successfully")
        fetchGroupsOnly()
      }
    } catch (err) {
      toast.error("Deletion protocol failed")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 font-sans selection:bg-red-50 dark:selection:bg-red-900/30 selection:text-red-600 transition-colors duration-500">
      <Toaster position="top-right" />
      
      {/* 🔮 MESH GRADIENT BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-20 transition-opacity duration-700">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-100 dark:bg-red-900/30 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-50 dark:bg-indigo-900/30 rounded-full blur-[150px]" />
      </div>

      {/* 🚀 ELITE HEADER */}
      <header className="sticky top-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-3xl border-b border-slate-100/50 dark:border-slate-800/50 px-8 py-8 z-[100] shadow-sm transition-all duration-500">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-3">
              <div className="flex items-center gap-4">
                  <Link href="/dashboard/menu-editor" className="group flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-red-500 transition-all">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Return to Architect</span>
                  </Link>
                  <div className="h-4 w-[1.5px] bg-slate-100 dark:bg-slate-800" />
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[0.6rem] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/50">
                    <Zap size={10} fill="currentColor" /> System Core
                  </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-xl shadow-red-500/30">
                    <Layers size={30} />
                 </div>
                 <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none flex items-center gap-3">
                       Add-on <span className="text-red-600">Clusters</span>
                       <Sparkles size={24} className="text-amber-400" />
                    </h1>
                    <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.35em] text-[0.65rem] mt-2">
                       Define advanced customization logic for your menu ecosystem
                    </p>
                 </div>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-4 px-6 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl transition-colors">
                 <div className="text-right">
                    <p className="text-[0.6rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active ecosystem</p>
                    <p className="text-[0.9rem] font-black text-slate-900 dark:text-slate-100">{groups.length} Cluster Nodes</p>
                 </div>
                 <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700" />
                 <div className="text-right">
                    <p className="text-[0.6rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Linked Assets</p>
                    <p className="text-[0.9rem] font-black text-slate-900 dark:text-slate-100">{items.length} Menu Items</p>
                 </div>
              </div>

              <button 
                onClick={async () => setShowModal(true)}
                className="group relative px-8 py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-[1.8rem] font-black uppercase tracking-widest text-[0.8rem] shadow-2xl shadow-slate-900/30 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-3 overflow-hidden"
              >
                 <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-500 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
                  <Plus size={22} strokeWidth={3} className="relative z-10" />
                  <span className="relative z-10">Initialize Node</span>
               </button>
           </div>
        </div>
      </header>

      {/* 🛠️ WORKSPACE AREA */}
      <div className="max-w-[1400px] mx-auto px-8 mt-16 relative z-10">
        
        {/* 🔍 CONTROL BAR */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
           <div className="w-full max-w-xl space-y-4">
              <div className="flex items-center gap-3 px-2">
                 <Filter size={14} className="text-slate-300 dark:text-slate-600" />
                 <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-sans">Deployment Registry</span>
              </div>
              <div className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-indigo-500/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                 <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-red-500 transition-colors" />
                 <input 
                   value={clusterSearch}
                   onChange={e => setClusterSearch(e.target.value)}
                   placeholder="Identify cluster group by name or configuration..."
                   className="relative w-full h-16 pl-16 pr-8 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-[1.1rem] font-black outline-none focus:border-red-100 dark:focus:border-red-900/30 text-slate-900 dark:text-white shadow-xl shadow-slate-200/20 dark:shadow-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-700"
                 />
              </div>
           </div>

           <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <button className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg transition-all duration-300"><LayoutGrid size={20} /></button>
              <button className="w-10 h-10 rounded-xl bg-transparent text-slate-300 dark:text-slate-600 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"><MoreHorizontal size={20} /></button>
           </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-48 gap-8">
             <div className="relative">
                <div className="w-20 h-20 border-[8px] border-red-50 dark:border-red-950 border-t-red-500 rounded-full animate-spin" />
                <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500" size={24} />
             </div>
             <p className="text-[0.8rem] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600 animate-pulse transition-colors">Syncing Architect Layers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
             <AnimatePresence>
                {filteredGroups.map((group, idx) => (
                  <motion.div 
                    key={group.id}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05, type: 'spring', damping: 20 }}
                    className="group relative"
                  >
                     {/* PREMIUM CARD */}
                     <div className="bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800/50 p-8 rounded-[3rem] shadow-sm hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] dark:hover:shadow-none hover:border-red-100 dark:hover:border-red-900/50 transition-all duration-500 relative overflow-hidden h-full flex flex-col">
                        
                        {/* DECORATIVE BACKGROUND ICON */}
                        <Layers size={120} className="absolute -bottom-10 -right-10 text-slate-50/50 dark:text-slate-800/20 rotate-12 group-hover:scale-110 transition-transform duration-700" />

                        {/* CARD ACTIONS */}
                        <div className="absolute top-8 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                           <button 
                             onClick={async () => handleDeleteGroup(group.id)}
                             className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-50 dark:text-rose-400 hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                           >
                              <Plus size={18} className="rotate-45" />
                           </button>
                        </div>

                        <div className="space-y-6 relative z-10 flex-1 flex flex-col">
                           <div className="flex items-start gap-5">
                              <div className="w-16 h-16 rounded-[1.8rem] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-red-500 group-hover:from-red-50 group-hover:to-red-100 dark:group-hover:from-red-900/20 dark:group-hover:to-red-900/40 transition-all duration-500 shadow-inner">
                                 <Layers size={28} />
                              </div>
                              <div className="pt-1">
                                 <h3 className="text-[1.4rem] font-black text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-red-600 transition-colors uppercase">{group.name}</h3>
                                 <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[0.6rem] font-black uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/50">
                                       <CheckCircle2 size={10} /> {group.items?.length || 0} Options
                                    </div>
                                    {group.isCompulsory && (
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[0.6rem] font-black uppercase tracking-wider border border-amber-100 dark:border-amber-900/50">
                                         <AlertCircle size={10} /> Compulsory
                                      </div>
                                    )}
                                 </div>
                              </div>
                           </div>

                           <div className="h-[1.5px] bg-slate-50 dark:bg-slate-800 w-full" />

                           {/* CONFIGURATION OPTIONS PREVIEW */}
                           <div className="space-y-4">
                              <p className="text-[0.65rem] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                                 <Zap size={10} fill="currentColor" className="text-amber-400" />
                                 Configuration Nodes
                               </p>
                               <div className="grid grid-cols-1 gap-2">
                                 {(group.items as any[])?.slice(0, 3).map((it, idx) => (
                                    <div key={idx} className="flex justify-between items-center px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-100 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all">
                                       <span className="text-[0.85rem] font-black text-slate-600 dark:text-slate-400">{it.name}</span>
                                       <span className="text-[0.85rem] font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg shadow-sm border border-slate-50 dark:border-slate-800">{sym}{it.price}</span>
                                    </div>
                                 ))}
                                 {group.items?.length > 3 && (
                                    <p className="text-[0.7rem] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest pl-4 mt-1 italic">
                                       + {group.items.length - 3} auxiliary choices
                                    </p>
                                 )}
                               </div>
                            </div>

                           {/* LINKED ASSETS PREVIEW */}
                           <div className="space-y-4 pt-2 mt-auto">
                              <p className="text-[0.65rem] font-black text-blue-300 dark:text-blue-500 uppercase tracking-[0.25em] pl-1 flex items-center gap-2">
                                 <UtensilsCrossed size={10} />
                                 Deployment Surface
                              </p>
                              
                              {/* Categories inheritance (NEW) */}
                              {group.categoryIds && group.categoryIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 pl-1 mb-2">
                                  {group.categoryIds.map((cid: string) => {
                                    const cat = categories.find(c => c.id === cid);
                                    if (!cat) return null;
                                    return (
                                      <div key={cid} className="text-[0.62rem] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30 flex items-center gap-1.5 uppercase tracking-wider">
                                         <LayoutGrid size={10} /> {cat.name}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 pl-1">
                                 {group.itemsOnMenu?.slice(0, 4).map((itm: any) => (
                                    <div key={itm.id} className="text-[0.68rem] font-black text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-100/50 dark:border-blue-800/30 shadow-sm backdrop-blur-sm">
                                       {itm.name}
                                    </div>
                                 ))}
                                 {group.itemsOnMenu?.length > 4 && (
                                    <div className="text-[0.65rem] font-black text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex items-center justify-center">
                                       +{group.itemsOnMenu.length - 4} Assets
                                    </div>
                                 )}
                                 {(!group.itemsOnMenu || group.itemsOnMenu.length === 0) && (!group.categoryIds || group.categoryIds.length === 0) && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-dashed border-amber-100 dark:border-amber-900/30 text-amber-500 dark:text-amber-600 text-[0.7rem] font-black uppercase tracking-widest w-full justify-center underline-offset-4 transition-all">
                                       Ready for Deployment
                                    </div>
                                 )}
                              </div>
                           </div>

                           <div className="pt-6">
                              <button 
                                onClick={async () => {
                                  setEditingGroup(group);
                                  setShowModal(true);
                                }}
                                className="w-full py-5 rounded-[1.8rem] bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black text-[0.8rem] uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:shadow-red-500/20 hover:bg-red-600 hover:dark:bg-red-600 hover:dark:text-white hover:scale-[1.02] active:scale-95 transition-all duration-300"
                              >
                                 Architect Node
                              </button>
                           </div>
                        </div>
                     </div>
                  </motion.div>
                ))}
             </AnimatePresence>

             {filteredGroups.length === 0 && !loading && (
               <div className="col-span-full py-48 flex flex-col items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[4rem] bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm gap-8 opacity-60">
                  <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-200 dark:text-slate-700">
                     <Layers size={48} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-[1.2rem] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">No Cluster Nodes Identified</p>
                    <p className="text-[0.75rem] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Initialize a new cluster to expand your customization ecosystem</p>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <AddonGroupsModal 
            groups={groups}
            initialGroup={editingGroup}
            allItems={items}
            categories={categories}
            onSave={handleSaveGroup}
            onDelete={handleDeleteGroup}
            onClose={() => {
              setShowModal(false);
              setEditingGroup(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
