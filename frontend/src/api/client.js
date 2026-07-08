const API_BASE = "/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function apiPost(path, body) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}
