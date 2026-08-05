export function getBackendBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8000";
  }

  return "/api";
}
