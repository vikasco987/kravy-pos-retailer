import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const parsedMenu = await req.json();
        require('fs').writeFileSync('last_ai_response.json', JSON.stringify(parsedMenu, null, 2));
        
        let menuItems: any[] = [];
        if (Array.isArray(parsedMenu)) {
            menuItems = parsedMenu;
        } else if (parsedMenu.menu && Array.isArray(parsedMenu.menu)) {
            menuItems = parsedMenu.menu;
        } else if (parsedMenu.items && Array.isArray(parsedMenu.items)) {
            menuItems = parsedMenu.items;
        } else if (parsedMenu.data && Array.isArray(parsedMenu.data)) {
            menuItems = parsedMenu.data;
        } else {
            // fallback: find any array property
            for (const key in parsedMenu) {
                if (Array.isArray(parsedMenu[key])) {
                    menuItems = parsedMenu[key];
                    break;
                }
            }
        }

        // --- Robust Variant Normalization ---
        const variantSuffixes = ['small', 'medium', 'large', 's', 'm', 'l', 'half', 'full', 'quarter', 'regular', 'jumbo', '250g', '500g', '1kg'];
        const finalMenu: any[] = [];
        const grouped = new Map();
        let lastBaseItem = null;
        let fallbackBaseName = "";
        
        for (let i = 0; i < menuItems.length; i++) {
            let item = menuItems[i];
            if (!item || typeof item !== 'object') continue;
            
            let name = (item.name || "").trim();
            if (!name) continue;
            item.name = name; // ensure trimmed

            if (item.variants && item.variants.length > 0) {
                finalMenu.push({ type: 'normal', item });
                lastBaseItem = item;
                fallbackBaseName = item.name;
                continue;
            }

            let isVariant = false;
            let baseName = item.name || "";
            let variantName = "";
            
            for (const suffix of variantSuffixes) {
                // Exact suffix match
                const exactRegex = new RegExp(`^(${suffix})(?:\\s*\\))?$`, 'i');
                const exactMatch = (item.name || "").trim().match(exactRegex);
                
                if (exactMatch && fallbackBaseName) {
                    baseName = fallbackBaseName;
                    variantName = exactMatch[1].trim();
                    isVariant = true;
                    break;
                }
                
                // Suffix with separator
                const regex = new RegExp(`[\\s\\-_\\(]+(${suffix})(?:\\s*\\))?\\s*$`, 'i');
                const match = (item.name || "").match(regex);
                if (match) {
                    const potentialBase = item.name.replace(regex, '').trim();
                    if (potentialBase.length > 1) {
                        baseName = potentialBase;
                        variantName = match[1].trim();
                        isVariant = true;
                        break;
                    }
                }
            }
            
            if (isVariant) {
                const catKey = (item.category || "Uncategorized").trim().toLowerCase();
                const mapKey = `${catKey}::${baseName.toLowerCase()}`;
                
                if (!grouped.has(mapKey)) {
                    grouped.set(mapKey, { 
                        baseName: baseName, 
                        category: item.category, 
                        type: item.type, 
                        description: item.description, 
                        items: [] 
                    });
                }
                grouped.get(mapKey).items.push({ originalItem: item, variantName });
                fallbackBaseName = baseName;
            } else {
                finalMenu.push({ type: 'normal', item });
                fallbackBaseName = item.name;
            }
        }
        
        // Resolve grouped items
        const resolvedMenu: any[] = [];
        
        const baseItemMap = new Map();
        for (const entry of finalMenu) {
            if (entry.type === 'normal') {
                const catKey = (entry.item.category || "Uncategorized").trim().toLowerCase();
                const mapKey = `${catKey}::${(entry.item.name || "").toLowerCase()}`;
                if (!baseItemMap.has(mapKey)) {
                    baseItemMap.set(mapKey, []);
                }
                baseItemMap.get(mapKey).push(entry);
            }
        }

        for (const [mapKey, group] of grouped.entries()) {
            const matchingBaseEntries = baseItemMap.get(mapKey) || [];
            
            if (group.items.length > 1 || matchingBaseEntries.length > 0) {
                let baseItemToMutate: any = null;
                if (matchingBaseEntries.length > 0) {
                    baseItemToMutate = matchingBaseEntries[0].item;
                    matchingBaseEntries[0].type = 'merged'; 
                } else {
                    baseItemToMutate = {
                        name: group.baseName,
                        category: group.category,
                        type: group.type,
                        description: group.description,
                        price: group.items[0].originalItem.price,
                    };
                    resolvedMenu.push(baseItemToMutate);
                }
                
                // Format variants specifically for the kravy-pos-retailer schema
                if (!baseItemToMutate.variants || !Array.isArray(baseItemToMutate.variants)) {
                    baseItemToMutate.variants = [];
                }

                // Find or create a 'Size' group
                let sizeGroup = baseItemToMutate.variants.find((v: any) => v.groupName && v.groupName.toLowerCase().includes('size'));
                if (!sizeGroup) {
                    sizeGroup = {
                        id: Math.random().toString(36).substring(7),
                        groupName: "Size",
                        type: "radio",
                        required: true,
                        options: []
                    };
                    baseItemToMutate.variants.push(sizeGroup);
                }
                if (!sizeGroup.options) sizeGroup.options = [];
                
                for (const vItem of group.items) {
                    // Check if already exists
                    if (!sizeGroup.options.find((o: any) => o.name === vItem.variantName)) {
                        sizeGroup.options.push({
                            name: vItem.variantName,
                            price: vItem.originalItem.price
                        });
                    }
                }
            } else {
                resolvedMenu.push(group.items[0].originalItem);
            }
        }
        
        for (const entry of finalMenu) {
            const resolvedItem = entry.item;
            
            // If base price is 0 or missing, and variants exist, set it to the lowest variant price
            let parsedPrice = typeof resolvedItem.price === 'string' ? parseFloat(resolvedItem.price) : resolvedItem.price;
            if ((!parsedPrice || isNaN(parsedPrice) || parsedPrice === 0) && resolvedItem.variants && Array.isArray(resolvedItem.variants) && resolvedItem.variants.length > 0) {
                let lowestPrice = Infinity;
                for (const group of resolvedItem.variants) {
                    const opts = (group.options && Array.isArray(group.options)) ? group.options : (group.name && group.price !== undefined ? [group] : []);
                    for (const opt of opts) {
                        const optPrice = typeof opt.price === 'string' ? parseFloat(opt.price) : opt.price;
                        if (optPrice !== undefined && !isNaN(optPrice) && optPrice > 0 && optPrice < lowestPrice) {
                            lowestPrice = optPrice;
                        }
                    }
                }
                if (lowestPrice !== Infinity) {
                    resolvedItem.price = lowestPrice;
                }
            } else {
                resolvedItem.price = parsedPrice || 0;
            }

            resolvedMenu.push(resolvedItem);
        }

        return NextResponse.json({
            success: true,
            restaurantName: parsedMenu.restaurantName || "AI Scraped Restaurant",
            address: parsedMenu.address || "Delhi NCR",
            timings: parsedMenu.timings || "11:00 AM - 11:00 PM",
            phone: parsedMenu.phone || "9999999999",
            menu: resolvedMenu
        });

    } catch (e: any) {
        console.error("🚨 [Menu Post Process] Failed:", e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
