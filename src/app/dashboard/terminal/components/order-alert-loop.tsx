"use client";

import { useEffect, useRef } from "react";
import { kravy } from "@/lib/sounds";

interface Props {
  pendingCount: number;
}

/**
 * 🚨 OrderAlertLoop
 * Plays a continuous Zomato-style alert if there are PENDING orders.
 * The alert stops once all pending orders are accepted or cleared.
 */
export default function OrderAlertLoop({ pendingCount }: Props) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pendingCount > 0) {
      // Start looping if not already started
      if (!intervalRef.current) {
        // Play immediately
        kravy.alertLoop();
        
        // Loop every 1.8 seconds
        intervalRef.current = setInterval(() => {
          kravy.alertLoop();
        }, 1800);
      }
    } else {
      // Clear loop if no pending orders
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pendingCount]);

  return null;
}
