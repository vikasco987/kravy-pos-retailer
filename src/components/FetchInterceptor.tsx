"use client";

import { useEffect } from "react";

let isIntercepting = false;
let refreshPromise: Promise<boolean> | null = null;

export default function FetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined" || isIntercepting) return;
    isIntercepting = true;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [resource] = args;
      
      // Do not intercept the refresh token endpoints to avoid infinite loops
      if (typeof resource === 'string' && (resource.includes('/api/staff/refresh-token') || resource.includes('/api/auth/refresh-token'))) {
        return originalFetch(...args);
      }

      const startTime = performance.now();
      const reqUrl = typeof resource === "string" ? resource : resource instanceof URL ? resource.toString() : resource.url;
      const reqMethod = (args[1] && args[1].method) || "GET";
      let reqBody = undefined;
      if (args[1] && args[1].body) {
        try { reqBody = typeof args[1].body === 'string' ? JSON.parse(args[1].body) : args[1].body; } catch(e){}
      }

      let response = await originalFetch(...args);

      // If unauthorized, attempt to refresh the token
      if (response.status === 401) {
        // If a refresh is already in progress, wait for it
        if (!refreshPromise) {
          refreshPromise = originalFetch('/api/auth/refresh-token', { method: 'POST', credentials: 'include' })
            .then(async (res) => {
              if (res.ok) {
                console.log("[Auth] Successfully refreshed custom token.");
                return true;
              }
              const errorText = await res.text();
              console.warn(`[Auth] Custom token refresh failed (${res.status}):`, errorText);
              
              // If custom auth refresh fails, try staff refresh
              const staffRes = await originalFetch('/api/staff/refresh-token', { method: 'POST', credentials: 'include' });
              if (staffRes.ok) {
                console.log("[Auth] Successfully refreshed staff token.");
                return true;
              }
              const staffErrorText = await staffRes.text();
              console.warn(`[Auth] Staff token refresh failed (${staffRes.status}):`, staffErrorText);
              
              return false;
            })
            .catch((err) => {
              console.error("[Auth] Network error during token refresh:", err);
              return false;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const refreshSuccess = await refreshPromise;
        if (refreshSuccess) {
          // Retry the original request with the new access token (implicitly sent via cookie)
          response = await originalFetch(...args);
        } else {
          // If refresh fails, call logout to clear stale cookies then redirect to login screen
          if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/staff')) {
             try {
               await originalFetch('/api/auth/logout', { method: 'POST' });
             } catch (e) {
               console.error("Failed to clear session cookies", e);
             }
             window.location.href = window.location.pathname.startsWith('/staff') ? '/staff/login?error=session_expired' : '/auth/custom?error=session_expired';
          }
        }
      }

      const duration = performance.now() - startTime;
      
      // Clone response for debugging
      let resBody = null;
      let parseError = null;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        try {
          resBody = JSON.parse(text);
        } catch (e) {
          resBody = text;
          parseError = (e as Error).message;
        }
      } catch (e) {
        parseError = "Failed to clone/read response: " + (e as Error).message;
      }

      // Emit debug event for Developer Panel
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("agy-dev-debug", {
          detail: {
            url: reqUrl,
            method: reqMethod,
            status: response.status,
            duration,
            timestamp: new Date().toISOString(),
            requestBody: reqBody,
            responseBody: resBody,
            parseError,
            isError: !response.ok
          }
        }));
      }

      return response;
    };
    
  }, []);

  return null;
}
