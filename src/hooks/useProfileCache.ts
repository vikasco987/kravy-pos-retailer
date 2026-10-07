import { useState, useEffect, useCallback } from "react";

// In-memory cache structure
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Global state
let globalCache: CacheEntry | null = null;
let activePromise: Promise<any> | null = null;

// Configuration
const STALE_TIME = 60 * 1000; // 60 seconds

export function useProfileCache() {
  // Initialize state from synchronous cache if available
  const [profile, setProfile] = useState<any>(globalCache?.data || null);
  const [loading, setLoading] = useState(!globalCache);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (force: boolean = false) => {
    // Deduplication: Return existing promise if already fetching
    if (activePromise && !force) {
      return activePromise;
    }

    try {
      activePromise = fetch(`/api/profile?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      }).then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }
        const text = await res.text();
        if (!text) return null;
        return JSON.parse(text);
      });

      const data = await activePromise;
      
      // Update global cache
      globalCache = {
        data,
        timestamp: Date.now()
      };
      
      setProfile(data);
      setError(null);
      return data;
    } catch (err: any) {
      console.error("Profile fetch failed:", err);
      setError(err);
      
      // If we don't have ANY cache, clear it so we don't get stuck
      if (!globalCache) {
         setProfile(null);
      }
      throw err;
    } finally {
      activePromise = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. If cache exists, check if stale
    if (globalCache) {
      const isStale = Date.now() - globalCache.timestamp > STALE_TIME;
      
      if (isStale) {
        // Silently revalidate in background without setting loading=true
        fetchProfile(false).catch(() => {});
      } else {
        // Cache is fresh, make sure loading is false
        setLoading(false);
      }
    } else {
      // 2. No cache exists, must fetch and show loading state
      setLoading(true);
      fetchProfile(false).catch(() => {});
    }
  }, [fetchProfile]);

  /**
   * Optimistically update the UI and optionally trigger a background revalidation
   * to ensure server state matches client state.
   */
  const updateProfile = useCallback((newProfileData: any, shouldRevalidate: boolean = true) => {
    if (globalCache) {
      const merged = { ...globalCache.data, ...newProfileData };
      globalCache = {
        data: merged,
        // Mark as fresh
        timestamp: Date.now() 
      };
      setProfile(merged);
    } else {
      globalCache = {
        data: newProfileData,
        timestamp: Date.now()
      };
      setProfile(newProfileData);
    }

    if (shouldRevalidate) {
       // Fire and forget revalidation to sync with DB
       fetchProfile(true).catch(() => {});
    }
  }, [fetchProfile]);

  return { 
    profile, 
    loading, 
    error,
    updateProfile,
    // Expose explicit invalidate method
    invalidateCache: () => fetchProfile(true)
  };
}

// Global utility for hard-resetting cache (e.g. on logout or business switch)
export function clearProfileCache() {
  globalCache = null;
  activePromise = null;
}
