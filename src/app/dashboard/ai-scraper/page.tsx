'use client'
import { useState, useEffect } from 'react'
import { useAuthContext } from '@/components/AuthContext'
import { 
  Zap, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
  Play
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useConfirm } from "@/components/ConfirmContext";


export default function AIScraperPage() {
  const { confirm } = useConfirm();
  const { user } = useAuthContext()
  const clerkId = user?.id
  const [data, setData] = useState<{ pending: any[], completed: any[], stats: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingItem, setSyncingItem] = useState<string | null>(null)

  const foodSnapCount = data?.completed.filter(i => (i.imageUrl || i.image || i.cloudinaryUrl || "").includes("foodsnap") || i.source === "zomato_api" || i.source === "foodsnap").length || 0;
  const scrapedCount = (data?.completed.length || 0) - foodSnapCount;

  const SCRAPER_URL = process.env.NEXT_PUBLIC_SCRAPER_URL || "http://localhost:3005"

  useEffect(() => {
    if (clerkId) {
      fetchMenu()
    }
  }, [clerkId])

  async function fetchMenu() {
    setLoading(true)
    try {
      const res = await fetch(`${SCRAPER_URL}/api/external-menu/${clerkId}`)
      if (!res.ok) throw new Error("Scraper offline")
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
      toast.error("Could not connect to AI Scraper Engine (Port 3005)")
    } finally {
      setLoading(false)
    }
  }

  async function syncAll() {
    if (!await confirm("This will start a bulk sync for your entire menu. Continue?")) return
    setSyncingAll(true)
    try {
      const res = await fetch(`${SCRAPER_URL}/api/scrape-external`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: clerkId })
      })
      if (res.ok) {
        toast.success("Bulk sync job started! Check the Scraper Dashboard for real-time progress.")
      }
    } catch (err) {
      toast.error("Sync failed to start")
    } finally {
      setSyncingAll(false)
    }
  }

  async function syncSingle(item: any) {
    setSyncingItem(item.id)
    try {
      const res = await fetch(`${SCRAPER_URL}/api/scrape-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dish: item.name, 
          userId: clerkId, 
          externalId: item.id 
        })
      })
      if (res.ok) {
        toast.success(`Synced image for ${item.name}`)
        fetchMenu()
      }
    } catch (err) {
      toast.error("Single sync failed")
    } finally {
      setSyncingItem(null)
    }
  }

  if (!clerkId) return null

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <Zap className="text-orange-500 fill-orange-500" size={32} />
            AI Product Scraper
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            Automatically find and sync high-quality product images for your catalog items.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchMenu}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={syncAll}
            disabled={syncingAll || loading}
            className="bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-2xl text-white font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
          >
            <Play size={18} fill="currentColor" />
            {syncingAll ? "Syncing..." : "Sync Entire Menu"}
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center p-40 space-y-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Connecting to AI Cloud...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Pending Section */}
            {data?.pending && data.pending.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 opacity-60">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <h2 className="text-xs font-black uppercase tracking-widest">Missing Images ({data.pending.length})</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {data.pending.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex items-center justify-between hover:shadow-xl hover:shadow-gray-100 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 border border-gray-100 group-hover:bg-orange-50 transition-all">
                          <ImageIcon size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{item.name}</h3>
                          <p className="text-[10px] text-gray-400 font-mono">{item.id}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => syncSingle(item)}
                        disabled={syncingItem === item.id}
                        className="bg-gray-50 hover:bg-orange-500 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                      >
                        {syncingItem === item.id ? "Working..." : "Auto Sync"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Section Section Section */}
            {data?.completed && data.completed.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 opacity-60">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-black uppercase tracking-widest">Production Ready ({data.completed.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.completed.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden group hover:border-emerald-200 transition-all">
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        <img 
                          src={item.cloudinaryUrl} 
                          alt={item.foodName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg">
                          <CheckCircle2 className="text-emerald-500" size={16} />
                        </div>
                      </div>
                      <div className="p-5 flex justify-between items-center">
                        <div>
                          <h3 className="font-black text-gray-900 leading-tight">{item.foodName}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {item.cloudinaryUrl?.includes("foodsnap") || item.source === "zomato_api" || item.source === "foodsnap" ? (
                              <span className="text-[9px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded-md">FoodSnap DB</span>
                            ) : (
                              <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">Puppeteer AI</span>
                            )}
                            <span className="text-[9px] font-bold text-gray-400">{item.confidence}% Conf.</span>
                          </div>
                        </div>
                        <a 
                          href={item.cloudinaryUrl} 
                          target="_blank" 
                          className="p-2.5 bg-gray-50 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-xl transition-all"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!data?.pending.length && !data?.completed.length && (
              <div className="bg-white border-[3px] border-dashed border-gray-100 rounded-[3rem] p-32 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                  <Search size={32} className="text-gray-200" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800">No catalog items found</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2">Make sure you have items in your menu that need images.</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl" />
              <h3 className="text-xl font-black flex items-center gap-2">
                <Zap className="text-orange-500" size={20} fill="currentColor" />
                Engine Status
              </h3>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Health</span>
                  <span className="text-xs font-black text-emerald-400">ACTIVE ⚡</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Synced</span>
                  <span className="text-xl font-black">{data?.completed.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending</span>
                  <span className="text-xl font-black text-orange-500">{data?.pending.length || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">FoodSnap DB</span>
                  <span className="text-xl font-black text-emerald-400">{foodSnapCount}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">AI Scraped</span>
                  <span className="text-xl font-black text-blue-400">{scrapedCount}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono leading-relaxed">
                Connected to Kravy Scraper Node v2.4 in Mumbai Region. Images are served via Cloudinary CDN with 99.9% availability.
              </p>
            </div>

            <div className="bg-orange-50 rounded-[2.5rem] p-8 border border-orange-100 space-y-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-black text-gray-900">Expert Tip</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Our AI considers item names, categories, and descriptions to pick the most appetizing photos. For best results, keep item names concise like "Paneer Tikka" instead of "Special Masala Paneer Tikka Large".
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
