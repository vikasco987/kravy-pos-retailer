"use client";

import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export type DeviceType = "phone" | "tablet" | "desktop";

export interface DeviceInfo {
  deviceType: DeviceType;
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isMobile: boolean;       // Legacy compatibility (true for phone & tablet-portrait when using mobile drawer)
  isNativeApp: boolean;
  isMobileOrApp: boolean;
  isTouch: boolean;
  orientation: "portrait" | "landscape";
  mounted: boolean;
}

/**
 * Robust device & layout detection hook:
 * - Detects Phone vs Tablet vs Desktop using viewport dimensions, aspect ratio & touch capability
 * - Correctly handles iPads (even requesting desktop site), Android tablets, folding phones & laptops
 * - Responds live to resize & orientationchange without reload
 * - Zero hydration mismatches by defaulting safely until mounted
 */
export function useDeviceDetect(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: "desktop",
    isPhone: false,
    isTablet: false,
    isDesktop: true,
    isMobile: false,
    isNativeApp: false,
    isMobileOrApp: false,
    isTouch: false,
    orientation: "landscape",
    mounted: false,
  });

  useEffect(() => {
    const detect = () => {
      if (typeof window === "undefined") return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const orientation = width >= height ? "landscape" : "portrait";

      const isNative = Capacitor.isNativePlatform() || Boolean((window as any).__KRAVY_APP__);

      // Touch capability detection (reliable on tablets & phones)
      const isTouch = 
        ("ontouchstart" in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

      // iPad detection (iPadOS reports Macintosh in UA, but has maxTouchPoints > 1)
      const isIPad = 
        /iPad/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      // Explicit mobile phone user agent detection
      const isPhoneUA = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Android tablet UA (has Android but lacks 'Mobile')
      const isAndroidTabletUA = /Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);

      // Determine device category
      // Priorities:
      // 1. Native physical dimensions: phones rarely exceed 600px in shortest dimension
      // 2. Tablets have shortest dimension >= 600px and max width < 1200px (or iPad UA)
      // 3. Desktops and touch laptops (width >= 1024px and not explicitly tablet UA)
      let deviceType: DeviceType = "desktop";

      if (isIPad || isAndroidTabletUA) {
        // Explicit tablet hardware/browser
        deviceType = "tablet";
      } else if (isPhoneUA) {
        // Phone user agent: verify if it's actually a large fold or tablet
        if (Math.min(width, height) >= 600) {
          deviceType = "tablet";
        } else {
          deviceType = "phone";
        }
      } else {
        // Non-mobile UA or touch laptop/desktop browser:
        // Prioritize viewport dimension logic so touch-enabled laptops (e.g. 1366px, 1440px, 1920px)
        // are never misclassified as tablets.
        if (width < 640) {
          deviceType = "phone";
        } else if (width < 1024) {
          deviceType = "tablet";
        } else {
          deviceType = "desktop";
        }
      }

      const isPhone = deviceType === "phone";
      const isTablet = deviceType === "tablet";
      const isDesktop = deviceType === "desktop";

      setDeviceInfo({
        deviceType,
        isPhone,
        isTablet,
        isDesktop,
        isMobile: isPhone,
        isNativeApp: isNative,
        isMobileOrApp: isPhone || isNative,
        isTouch,
        orientation,
        mounted: true,
      });
    };

    detect();

    window.addEventListener("resize", detect, { passive: true });
    window.addEventListener("orientationchange", detect, { passive: true });

    return () => {
      window.removeEventListener("resize", detect);
      window.removeEventListener("orientationchange", detect);
    };
  }, []);

  return deviceInfo;
}
