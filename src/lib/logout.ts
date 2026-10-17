// Global unified logout utility to ensure cookies and local states are cleared completely
export async function performLogout(redirectTo: string = "/auth/custom?mode=login") {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Logout request error:", err);
  }

  try {
    if (typeof window !== "undefined") {
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear cookies on client side as well (for non-httpOnly or legacy cookies)
      const expiredCookie = "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0;";
      document.cookie = `kravy_auth_token${expiredCookie}`;
      document.cookie = `kravy_refresh_token${expiredCookie}`;
      document.cookie = `staff_token${expiredCookie}`;
      document.cookie = `staff_refresh_token${expiredCookie}`;

      // Perform a clean redirect
      window.location.replace(redirectTo);
    }
  } catch (err) {
    console.error("Storage/redirect error on logout:", err);
    if (typeof window !== "undefined") {
      window.location.href = redirectTo;
    }
  }
}
