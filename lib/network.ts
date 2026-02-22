import Constants from "expo-constants";
import { Platform } from "react-native";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getExplicitApiEnv(): string | null {
  const candidates = [process.env.EXPO_PUBLIC_API_URL, process.env.EXPO_PUBLIC_RORK_API_BASE_URL];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === "auto") return null;
    return trimTrailingSlash(trimmed);
  }
  return null;
}

function extractHostFromExpoConstants(): string | null {
  const constantsAny = Constants as any;

  const hostUri: string | undefined =
    constantsAny?.expoConfig?.hostUri ??
    constantsAny?.manifest2?.extra?.expoClient?.hostUri ??
    constantsAny?.manifest?.debuggerHost ??
    constantsAny?.expoGoConfig?.debuggerHost;

  if (!hostUri || typeof hostUri !== "string") return null;

  const withoutProtocol = hostUri.replace(/^https?:\/\//, "");
  const host = withoutProtocol.split(":")[0]?.trim();
  return host || null;
}

function isTunnelHost(host: string): boolean {
  return [
    ".ngrok-free.app",
    ".ngrok.io",
    "trycloudflare.com",
    "exp.direct",
    "exp.host",
    "expo.dev",
  ].some((suffix) => host.includes(suffix));
}

export function getApiBaseUrl(): string {
  const explicit = getExplicitApiEnv();
  if (explicit) return explicit;

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  const expoHost = extractHostFromExpoConstants();
  if (expoHost) {
    // If using Expo tunnel (ngrok / exp.direct), prefer https and no port
    if (isTunnelHost(expoHost)) {
      return `https://${expoHost}`;
    }
    return `http://${expoHost}:3001`;
  }

  // Emulator fallback
  if (Platform.OS === "android") return "http://10.0.2.2:3001";

  // iOS simulator or desktop fallback
  return "http://localhost:3001";
}

