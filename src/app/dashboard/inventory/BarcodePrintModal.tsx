"use client";

import React, { useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import { X, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

export type BarcodeSize = 'small' | 'medium' | 'large';

interface Item {
  name: string;
  inventoryCode?: string | null;
  barcode?: string | null;
}

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Item[];
}

export default function BarcodePrintModal({ isOpen, onClose, items }: BarcodePrintModalProps) {
  const [size, setSize] = useState<BarcodeSize>('medium');
  const [isClient, setIsClient] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedItems(new Set(items.map((_, i) => i)));
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const printableItems = items.filter((_, i) => selectedItems.has(i));

  const toggleItem = (index: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedItems(newSet);
  };

  const handlePrint = () => {
    window.print();
  };

  // Physical module width calculation for Code 128 (approx 13 chars = ~198 modules including margins):
  // A4 printable width is ~750px. 
  // Small (3/row): ~250px available. width 1.0 => 198px. Fits perfectly with quiet zone!
  // Medium (2/row): ~375px available. width 1.4 => 277px. Fits perfectly!
  // Large (1/row): ~750px available. width 2.0 => 396px. Fits perfectly!
  const sizeConfig = {
    'small': { gridClass: 'grid-cols-3 gap-6', labelClass: 'aspect-[2.5/1] p-2', barcodeWidth: 1.0, barcodeHeight: 25, fontSize: 10, label: 'Small (3/row)' },
    'medium': { gridClass: 'grid-cols-2 gap-8', labelClass: 'aspect-[2.5/1] p-3', barcodeWidth: 1.4, barcodeHeight: 35, fontSize: 12, label: 'Medium (2/row)' },
    'large': { gridClass: 'grid-cols-1 gap-8', labelClass: 'aspect-[4/1] p-4 max-w-[500px] mx-auto', barcodeWidth: 2.0, barcodeHeight: 50, fontSize: 14, label: 'Large (1/row)' },
  };

  const config = sizeConfig[size];

  return (
    <>
      {/* UI Modal (hidden during print) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--kravy-surface)] rounded-2xl shadow-2xl border border-[var(--kravy-border)] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[var(--kravy-border)]">
                <div>
                  <h3 className="text-lg font-black text-[var(--kravy-text-primary)]">Print Barcodes</h3>
                  <p className="text-sm font-bold text-[var(--kravy-text-secondary)] mt-1">
                    {printableItems.length} items ready to print
                  </p>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--kravy-bg)] text-[var(--kravy-text-muted)] hover:text-[var(--kravy-text-primary)] transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-6">
                <div>
                  <label className="block text-xs font-black text-[var(--kravy-text-muted)] uppercase tracking-widest mb-3">
                    Label Size
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['small', 'medium', 'large'] as BarcodeSize[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                          size === s 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' 
                            : 'bg-[var(--kravy-bg)] border-[var(--kravy-border)] text-[var(--kravy-text-secondary)] hover:border-gray-300'
                        }`}
                      >
                        {sizeConfig[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                  <p className="text-sm font-bold text-orange-600">
                    A4 sheet layout will be generated based on your selected size. Ensure your printer settings are set to A4 with default margins.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-black text-[var(--kravy-text-muted)] uppercase tracking-widest">
                      Select Items to Print
                    </label>
                    <div className="space-x-2">
                      <button 
                        onClick={() => setSelectedItems(new Set(items.map((_, i) => i)))}
                        className="text-xs font-bold text-indigo-500 hover:text-indigo-600"
                      >
                        Select All
                      </button>
                      <span className="text-[var(--kravy-text-muted)]">|</span>
                      <button 
                        onClick={() => setSelectedItems(new Set())}
                        className="text-xs font-bold text-red-500 hover:text-red-600"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-[200px] overflow-y-auto border border-[var(--kravy-border)] rounded-xl divide-y divide-[var(--kravy-border)] custom-scrollbar">
                    {items.map((item, index) => (
                      <label key={index} className="flex items-center gap-3 p-3 hover:bg-[var(--kravy-bg)] cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.has(index)}
                          onChange={() => toggleItem(index)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[var(--kravy-text-primary)] truncate">{item.name}</p>
                          <p className="text-xs text-[var(--kravy-text-secondary)] truncate">
                            {item.inventoryCode || item.barcode || 'Auto-generated barcode'}
                          </p>
                        </div>
                      </label>
                    ))}
                    {items.length === 0 && (
                      <div className="p-4 text-center text-sm font-bold text-[var(--kravy-text-muted)]">
                        No items found
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[var(--kravy-border)] bg-[var(--kravy-bg)]/50 flex justify-end gap-3">
                <button 
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-[var(--kravy-text-secondary)] hover:bg-[var(--kravy-border)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handlePrint}
                  disabled={printableItems.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50"
                >
                  <Printer size={16} />
                  Print Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Layout (only visible during print) */}
      {isClient && document.body && createPortal(
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body > *:not(#barcode-print-root) {
                display: none !important;
              }
              body {
                background: white !important;
              }
            }
          `}} />
          <div id="barcode-print-root" className="hidden print:block absolute top-0 left-0 w-full bg-white text-black p-4 z-[9999]">
            <div className={`grid ${config.gridClass}`}>
              {printableItems.map((item, index) => {
                // Generate a fallback code using the item's ID or name hash if no barcode exists
                const fallbackCode = item.id ? item.id.substring(item.id.length - 6).toUpperCase() : item.name.substring(0, 4).toUpperCase() + '-' + index;
                const codeToPrint = item.inventoryCode || item.barcode || fallbackCode;
                
                return (
                  <div 
                    key={index} 
                    className={`${config.labelClass} flex flex-col items-center justify-center border border-dashed border-gray-400 text-center break-inside-avoid overflow-hidden`}
                  >
                    <div className="font-bold mb-1 truncate w-full px-1" style={{ fontSize: `${config.fontSize}px` }}>
                      {item.name}
                    </div>
                    <div className="w-full flex-1 flex items-center justify-center overflow-hidden [&>svg]:[shape-rendering:crispEdges]">
                      <Barcode 
                        key={`${index}-${size}`}
                        value={codeToPrint} 
                        width={config.barcodeWidth} 
                        height={config.barcodeHeight} 
                        fontSize={config.fontSize - 2}
                        displayValue={true}
                        margin={10}
                        background="#FFFFFF"
                        lineColor="#000000"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
