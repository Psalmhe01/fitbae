export const NATIVE_AUTH_CALLBACK = "com.fitbae.app://auth/callback";

export function authRedirectUrl(native, origin, recovery = false) {
  return native
    ? `${NATIVE_AUTH_CALLBACK}${recovery ? "?mode=reset" : ""}`
    : `${origin}${recovery ? "/auth?mode=reset" : "/dashboard"}`;
}

export function parseNativeAuthCallback(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "com.fitbae.app:" || url.hostname !== "auth"
      || url.pathname !== "/callback" || url.port || url.username || url.password) return null;
    return {
      code: url.searchParams.get("code"),
      error: url.searchParams.has("error") || url.searchParams.has("error_code"),
      recovery: url.searchParams.get("mode") === "reset",
    };
  } catch { return null; }
}

export function generationEndpoint(native, baseUrl = "") {
  if (!native) return "/api/generate-plan";
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Mobile workout generation requires a public HTTPS API origin.");
  }
  return `${url.origin}/api/generate-plan`;
}
