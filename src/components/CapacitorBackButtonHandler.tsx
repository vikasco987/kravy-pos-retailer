"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

export default function CapacitorBackButtonHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appPlugin: any;

    const setupBackButton = async () => {
      try {
        const { App } = await import("@capacitor/app");
        appPlugin = App;
        App.addListener("backButton", (event) => {
          if (window.location.pathname !== "/dashboard" && window.location.pathname !== "/") {
            router.back();
          } else {
            App.exitApp();
          }
        });
      } catch (err) {
        console.warn("Failed to load Capacitor App plugin", err);
      }
    };

    setupBackButton();

    return () => {
      if (appPlugin) {
        appPlugin.removeAllListeners();
      }
    };
  }, [router]);

  return null;
}
