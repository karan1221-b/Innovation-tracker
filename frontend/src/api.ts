import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
export const API = `${BASE}/api`;
const TOKEN_KEY = "fixit_token";

export async function getToken() {
  return storage.secureGet<string>(TOKEN_KEY, "");
}
export async function setToken(t: string) {
  return storage.secureSet(TOKEN_KEY, t);
}
export async function clearToken() {
  return storage.secureRemove(TOKEN_KEY);
}

type Opts = { method?: string; body?: any; auth?: boolean };

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = (data && data.detail) || "Something went wrong. Please try again.";
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data as T;
}

export function fileUrl(path: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/")) return `${BASE}${path}`;
  return `${API}/files/${path}`;
}

export async function uploadFile(uri: string, name: string, type: string): Promise<{ path: string; url: string }> {
  const token = await getToken();
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed. Please try again.");
  return res.json();
}
