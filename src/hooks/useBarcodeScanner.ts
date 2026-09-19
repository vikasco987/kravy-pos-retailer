import { useEffect, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxLength?: number;
  timeoutMs?: number;
}

export function useBarcodeScanner({
  onScan,
  minLength = 4,
  maxLength = 20,
  timeoutMs = 200, // Increased timeout to support slower scanners (50ms was too fast for some)
}: UseBarcodeScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // We don't block input elements because a cashier might have the search bar focused when they scan.
      // However, we rely on the rapid speed of the scanner to differentiate it from human typing.

      const currentTime = performance.now();
      
      // If the time between key presses is greater than timeoutMs, it's likely a human typing.
      // Reset the buffer.
      if (currentTime - lastKeyTimeRef.current > timeoutMs) {
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        // Scanner finished reading the barcode
        const code = bufferRef.current.trim();
        if (code.length >= minLength && code.length <= maxLength) {
          onScan(code);
          
          // Optionally, if the user was focused on an input, we might want to clear it or blur it.
          // But preventing default is good enough for most cases to stop form submission.
          if (document.activeElement instanceof HTMLInputElement) {
              document.activeElement.blur();
              // Try to clear the input if it was just flooded by the scanner
              document.activeElement.value = '';
          }
          e.preventDefault();
          e.stopPropagation();
        }
        // Always clear buffer after Enter
        bufferRef.current = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Accumulate characters
        bufferRef.current += e.key;
        lastKeyTimeRef.current = currentTime;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [onScan, minLength, maxLength, timeoutMs]);
}
