"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    ShoppingCart, 
    Plus, 
    Minus, 
    Star,
    Clock,
    CheckCircle,
    IndianRupee,
    Utensils,
    Leaf,
    MapPin,
    Locate,
    X,
    Moon,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";

interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price?: number | null;
    sellingPrice?: number | null;
    imageUrl?: string | null;
    isVeg?: boolean;
    isBestseller?: boolean;
    isRecommended?: boolean;
    isNew?: boolean;
    spiciness?: string;
    rating?: number;
    category?: { name: string };
}

interface CartItem extends MenuItem {
    quantity: number;
    addedAt: Date;
}

interface BusinessProfile {
    businessName?: string;
    logoUrl?: string;
    businessTagLine?: string;
    isOnline?: boolean;
    openingTime?: string;
    closingTime?: string;
    offlineMessage?: string;
    qrPayCashEnabled?: boolean;
    qrPayUpiEnabled?: boolean;
    qrPayCardEnabled?: boolean;
    upi?: string;
}

function QRMenuContent() {
    const searchParams = useSearchParams();
    const clerkId = searchParams.get('clerkId');
    const tableId = searchParams.get('tableId');
    const tableName = searchParams.get('tableName');

    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [profile, setProfile] = useState<BusinessProfile | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [isLocating, setIsLocating] = useState(false);
    const [dismissOfflineAlert, setDismissOfflineAlert] = useState(false);
    
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
    const [qrUrl, setQrUrl] = useState<string>("");

    useEffect(() => {
        if (selectedPaymentMethod === "UPI" && profile?.upi) {
            QRCode.toDataURL(`upi://pay?pa=${profile.upi}&pn=${encodeURIComponent(profile.businessName || 'Business')}&cu=INR`)
                .then(url => setQrUrl(url))
                .catch(err => console.error(err));
        }
    }, [selectedPaymentMethod, profile]);

    useEffect(() => {
        if (clerkId) {
            fetchData();
        }
    }, [clerkId]);

    const fetchData = async () => {
        try {
            const [itemsRes, profileRes] = await Promise.all([
                fetch(`/api/public/menu?clerkId=${clerkId}`),
                fetch(`/api/public/profile?clerkId=${clerkId}`)
            ]);

            if (itemsRes.ok && profileRes.ok) {
                const itemsData = await itemsRes.json();
                const profileData = await profileRes.json();
                
                setItems(itemsData);
                setProfile(profileData);
                
                // Extract categories
                const uniqueCategories = new Set<string>(
                    itemsData
                        .filter((item: MenuItem) => item.category?.name)
                        .map((item: MenuItem) => item.category!.name)
                );
                const cats = ["All", ...Array.from(uniqueCategories)];
                setCategories(cats);
            }
        } catch (error) {
            toast.error("Failed to load menu");
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(cartItem => cartItem.id === item.id);
            if (existing) {
                return prev.map(cartItem =>
                    cartItem.id === item.id
                        ? { ...cartItem, quantity: cartItem.quantity + 1 }
                        : cartItem
                );
            }
            return [...prev, { ...item, quantity: 1, addedAt: new Date() }];
        });
        toast.success(`${item.name} added to cart`);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(item =>
                    item.id === itemId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return prev.filter(item => item.id !== itemId);
        });
    };

    const getTax = () => {
        // Simple implementation for legacy page
        const taxRate = 5; // Fallback
        return cart.reduce((tax, item) => {
            const price = item.sellingPrice || item.price || 0;
            return tax + (price * item.quantity * taxRate / 100);
        }, 0);
    };

    const getTotalPrice = () => {
        const subtotal = cart.reduce((total, item) => {
            const price = item.sellingPrice || item.price || 0;
            return total + (price * item.quantity);
        }, 0);
        return subtotal + getTax();
    };

    const placeOrder = async () => {
        if (cart.length === 0) {
            toast.error("Your cart is empty");
            return;
        }

        if (!customerName.trim()) {
            toast.error("Please enter your name");
            return;
        }

        const hasPaymentOptionsEnabled = profile?.qrPayCashEnabled || profile?.qrPayUpiEnabled || profile?.qrPayCardEnabled;
        if (hasPaymentOptionsEnabled && !selectedPaymentMethod) {
            toast.error("Please select a payment method");
            return;
        }

        setPlacingOrder(true);
        try {
            const orderData = {
                clerkUserId: clerkId,
                tableId,
                tableName,
                items: cart.map(item => ({
                    name: item.name,
                    price: item.sellingPrice || item.price || 0,
                    quantity: item.quantity,
                    itemId: item.id,
                    addedAt: item.addedAt,
                    addedInCase: "main"
                })),
                total: getTotalPrice(),
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim() || undefined,
                customerAddress: customerAddress.trim() || undefined,
                paymentMethod: selectedPaymentMethod || "Pending"
            };

            const response = await fetch('/api/public/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                const order = await response.json();
                toast.success("Order placed successfully!");
                setCart([]);
                setCustomerName("");
                setCustomerPhone("");
                setCustomerAddress("");
                // Redirect to order tracking
                window.location.href = `/order-tracking/${order.id}`;
            } else {
                throw new Error("Failed to place order");
            }
        } catch (error) {
            toast.error("Failed to place order. Please try again.");
        } finally {
            setPlacingOrder(false);
        }
    };

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    if (data.display_name) {
                        setCustomerAddress(`${data.display_name}\n📍 Live Location: ${googleMapsUrl}`);
                        toast.success("Location & Map Link updated!");
                    } else {
                        setCustomerAddress(`Coordinates: ${latitude}, ${longitude}\n📍 Live Location: ${googleMapsUrl}`);
                        toast.info("Coordinates & Map Link added");
                    }
                } catch (error) {
                    toast.error("Failed to get address");
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                toast.error("Please enable location access");
                setIsLocating(false);
            }
        );
    };

    const checkIsOnline = () => {
        if (!profile) return true;
        if (profile.isOnline === false) return false;

        const now = new Date();
        const istTimeStr = now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
        const istTime = new Date(istTimeStr);
        const currentTime = istTime.getHours() * 60 + istTime.getMinutes();

        if (profile.openingTime && profile.closingTime) {
            const [openH, openM] = profile.openingTime.split(':').map(Number);
            const [closeH, closeM] = profile.closingTime.split(':').map(Number);
            const openTime = openH * 60 + openM;
            const closeTime = closeH * 60 + closeM;

            if (openTime < closeTime) {
                // Same day operation
                return currentTime >= openTime && currentTime <= closeTime;
            } else {
                // Overnight operation (e.g., 18:00 to 02:00)
                return currentTime >= openTime || currentTime <= closeTime;
            }
        }

        return true;
    };

    const isOnline = checkIsOnline();

    const filteredItems = selectedCategory === "All" 
        ? items 
        : items.filter(item => item.category?.name === selectedCategory);

    const groupedItems = useMemo(() => {
        const groups = new Map<string, any>();
        
        filteredItems.forEach(item => {
            const match = item.name.match(/^(.*?)\s*(?:\(|\[|-)?\s*\b(Half|Full|Quarter|Small|Medium|Large|Regular|Mini|Jumbo|Family)\b\s*(?:\)|\])?$/i);
            
            let baseName = item.name;
            let variantName = "Regular";
            
            if (match) {
                baseName = match[1].trim() || item.name;
                variantName = match[2].trim();
                variantName = variantName.charAt(0).toUpperCase() + variantName.slice(1).toLowerCase();
            }

            const key = baseName.toLowerCase();
            
            if (!groups.has(key)) {
                groups.set(key, {
                    baseName,
                    description: item.description,
                    isVeg: item.isVeg,
                    isBestseller: item.isBestseller,
                    isRecommended: item.isRecommended,
                    isNew: item.isNew,
                    spiciness: item.spiciness,
                    rating: item.rating,
                    category: item.category,
                    imageUrl: item.imageUrl,
                    variants: []
                });
            }
            
            const group = groups.get(key)!;
            if (item.description && (!group.description || item.description.length > group.description.length)) {
                group.description = item.description;
            }
            if (item.imageUrl && !group.imageUrl) {
                group.imageUrl = item.imageUrl;
            }
            group.variants.push({
                ...item,
                variantName: variantName !== "Regular" || match ? variantName : "Regular"
            });
        });
        
        // Sort variants: Small -> Half -> Medium -> Regular -> Full -> Large -> Jumbo -> Family
        const variantOrder: Record<string, number> = {
            "Small": 1, "Quarter": 2, "Half": 3, "Mini": 4, "Medium": 5, "Regular": 6, "Full": 7, "Large": 8, "Jumbo": 9, "Family": 10
        };

        const sortedGroups = Array.from(groups.values()).map(group => {
            group.variants.sort((a: any, b: any) => (variantOrder[a.variantName] || 99) - (variantOrder[b.variantName] || 99));
            return group;
        });

        return sortedGroups;
    }, [filteredItems]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                <div className="text-center">
                    <Utensils className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600">Loading menu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {profile?.logoUrl && (
                                <img src={profile.logoUrl} alt="Logo" className="h-10 w-10 rounded-lg" />
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {profile?.businessName || "Business"}
                                </h1>
                                {profile?.businessTagLine && (
                                    <p className="text-sm text-gray-600">{profile.businessTagLine}</p>
                                )}
                            </div>
                        </div>
                        {tableName && (
                            <Badge variant="outline" className="bg-orange-50">
                                Table: {tableName}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
            <AnimatePresence mode="wait">
                {!isOnline && dismissOfflineAlert && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-rose-600 text-white py-3 px-4 text-center font-bold sticky top-0 z-[60] flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                        onClick={() => setDismissOfflineAlert(false)}
                    >
                        <AlertTriangle size={18} className="animate-bounce" />
                        <span className="text-sm">ORDERING IS CURRENTLY DISABLED</span>
                        <span className="text-[10px] ml-2 opacity-70 underline">READ MORE</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-6xl mx-auto px-4 py-6">
                <AnimatePresence>
                    {!isOnline && !dismissOfflineAlert && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        >
                            <motion.div 
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden relative shadow-2xl border border-white/20"
                            >
                                {/* Close Button */}
                                <button 
                                    onClick={() => setDismissOfflineAlert(true)}
                                    className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors z-10"
                                >
                                    <X size={20} />
                                </button>

                                {/* Background Graphic */}
                                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-rose-500 to-purple-600 opacity-10" />

                                <div className="p-8 pt-12 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 relative">
                                        <div className="absolute inset-0 bg-rose-500/20 rounded-3xl animate-ping opacity-20" />
                                        <Moon size={40} className="relative z-10" />
                                    </div>

                                    <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Currently Closed</h2>
                                    <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                                        {profile?.offlineMessage || "Business is currently closed or not accepting orders."}
                                    </p>

                                    <div className="w-full space-y-3">
                                        <button 
                                            onClick={() => setDismissOfflineAlert(true)}
                                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            View Menu Anyway
                                            <Utensils size={18} className="group-hover:rotate-12 transition-transform" />
                                        </button>
                                        
                                        <div className="flex items-center justify-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-widest">
                                            <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                                            Ordering is Disabled
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Check back later for online ordering</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Menu Items */}
                    <div className="lg:col-span-2">
                        {/* Category Filter */}
                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                {categories.map(category => (
                                    <Button
                                        key={category}
                                        variant={selectedCategory === category ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategory(category)}
                                        className={selectedCategory === category ? "bg-orange-500 hover:bg-orange-600" : ""}
                                    >
                                        {category}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Menu Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupedItems.map((group, index) => (
                                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                                    <CardContent className="p-4 flex flex-col flex-1">
                                        <div className="flex space-x-4 mb-2">
                                            {group.imageUrl && (
                                                <img 
                                                    src={group.imageUrl} 
                                                    alt={group.baseName}
                                                    className="w-20 h-20 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                                                            <h3 className="font-semibold text-gray-900 leading-tight">{group.baseName}</h3>
                                                            {group.isVeg && <Leaf className="h-4 w-4 text-green-500 shrink-0" />}
                                                            {group.isBestseller && (
                                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[10px] shrink-0">
                                                                    Bestseller
                                                                </Badge>
                                                            )}
                                                            {group.isNew && (
                                                                <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px] shrink-0">
                                                                    New
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {group.description && (
                                                            <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                                                                {group.description}
                                                            </p>
                                                        )}
                                                        {group.rating && (
                                                            <div className="flex items-center space-x-1">
                                                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                                                <span className="text-xs text-gray-600">{group.rating}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-auto space-y-2 pt-2 border-t border-gray-100">
                                            {group.variants.map((v: any) => (
                                                <div key={v.id} className="flex items-center justify-between bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {v.variantName !== "Regular" ? v.variantName : (group.variants.length > 1 ? "Regular" : "")}
                                                    </span>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="font-bold text-orange-600 text-sm">
                                                            <IndianRupee className="h-3 w-3 inline" />
                                                            {v.sellingPrice || v.price || 0}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => addToCart(v)}
                                                            className="bg-orange-500 hover:bg-orange-600 h-8 w-8 p-0 rounded-full shadow-sm"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Cart */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-4">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-2 mb-4">
                                    <ShoppingCart className="h-5 w-5 text-orange-500" />
                                    <h2 className="font-semibold text-lg">Your Order</h2>
                                </div>

                                {/* Customer Info */}
                                <div className="space-y-3 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Your Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number (Optional)
                                        </label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="Enter phone number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Delivery Address (Optional)
                                            </label>
                                            <button 
                                                onClick={getCurrentLocation}
                                                disabled={isLocating}
                                                className="text-[10px] font-black text-orange-600 flex items-center gap-1 hover:bg-orange-50 px-2 py-1 rounded-md transition-colors"
                                            >
                                                {isLocating ? (
                                                    <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <Locate size={12} />
                                                )}
                                                {isLocating ? "Locating..." : "USE CURRENT LOCATION"}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                value={customerAddress}
                                                onChange={(e) => setCustomerAddress(e.target.value)}
                                                placeholder="Enter delivery address"
                                                rows={2}
                                                className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                                            />
                                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>

                                <Separator className="my-4" />

                                {/* Cart Items */}
                                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                                    {cart.length === 0 ? (
                                        <p className="text-gray-500 text-center py-4">Your cart is empty</p>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.id} className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{item.name}</p>
                                                    <p className="text-xs text-gray-600">
                                                        <IndianRupee className="h-3 w-3 inline" />
                                                        {item.sellingPrice || item.price || 0} × {item.quantity}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => removeFromCart(item.id)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="font-medium w-8 text-center">{item.quantity}</span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => addToCart(item)}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {cart.length > 0 && (
                                    <>
                                        <Separator className="my-4" />
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-semibold">Total:</span>
                                            <span className="font-bold text-lg text-orange-600">
                                                <IndianRupee className="h-5 w-5 inline" />
                                                {getTotalPrice()}
                                            </span>
                                        </div>

                                        {/* PAYMENT MODE SELECTION */}
                                        {(profile?.qrPayCashEnabled || profile?.qrPayUpiEnabled || profile?.qrPayCardEnabled) && (
                                            <div className="mb-6 space-y-3">
                                                <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Select Payment Method</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {profile?.qrPayUpiEnabled && (
                                                        <Button
                                                            variant="outline"
                                                            className={`h-12 border-2 ${selectedPaymentMethod === 'UPI' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}
                                                            onClick={() => setSelectedPaymentMethod('UPI')}
                                                        >
                                                            UPI
                                                        </Button>
                                                    )}
                                                    {profile?.qrPayCashEnabled && (
                                                        <Button
                                                            variant="outline"
                                                            className={`h-12 border-2 ${selectedPaymentMethod === 'Cash' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}
                                                            onClick={() => setSelectedPaymentMethod('Cash')}
                                                        >
                                                            Pay at Counter
                                                        </Button>
                                                    )}
                                                    {profile?.qrPayCardEnabled && (
                                                        <Button
                                                            variant="outline"
                                                            className={`h-12 border-2 ${selectedPaymentMethod === 'Card' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}
                                                            onClick={() => setSelectedPaymentMethod('Card')}
                                                        >
                                                            Card
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* UPI QR CODE DISPLAY */}
                                                <AnimatePresence>
                                                    {selectedPaymentMethod === 'UPI' && profile?.upi && qrUrl && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="mt-4 bg-white border-2 border-orange-100 rounded-xl p-4 flex flex-col items-center shadow-sm overflow-hidden"
                                                        >
                                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Scan to Pay Online</p>
                                                            <div className="bg-white p-2 border border-gray-100 rounded-xl shadow-sm mb-4">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={qrUrl} alt="UPI QR Code" className="w-48 h-48" />
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100 w-full justify-between">
                                                                <div className="truncate">
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">UPI ID</p>
                                                                    <p className="text-sm font-semibold text-gray-800 truncate">{profile.upi}</p>
                                                                </div>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="h-8 shrink-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(profile.upi || "");
                                                                        toast.success("UPI ID Copied!");
                                                                    }}
                                                                >
                                                                    Copy
                                                                </Button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}

                                        <Button
                                            onClick={placeOrder}
                                            disabled={placingOrder || !customerName.trim() || !isOnline}
                                            className={`w-full h-12 rounded-xl text-base font-bold shadow-lg transition-all ${
                                                isOnline 
                                                ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20" 
                                                : "bg-gray-400 cursor-not-allowed grayscale"
                                            }`}
                                        >
                                            {!isOnline ? (
                                                <div className="flex items-center gap-2">
                                                    <Moon size={18} />
                                                    Ordering Closed
                                                </div>
                                            ) : (
                                                placingOrder ? "Placing Order..." : "Place Order"
                                            )}
                                        </Button>
                                        {!isOnline && (
                                            <p className="text-[10px] text-rose-500 font-bold text-center mt-2 uppercase tracking-widest">
                                                Resturant is currently not accepting orders
                                            </p>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function QRMenuPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                <div className="text-center">
                    <Utensils className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-600">Loading menu...</p>
                </div>
            </div>
        }>
            <QRMenuContent />
        </Suspense>
    );
}

