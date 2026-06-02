const BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(method, path, body) {
  const opts = {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
};

export async function uploadDocument(file, province, actName, sourceUrl) {
  const form = new FormData();
  form.append("file", file);
  if (province) form.append("province", province);
  if (actName) form.append("act_name", actName);
  if (sourceUrl) form.append("source_url", sourceUrl);

  const res = await fetch(`${BASE}/admin/documents/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}
