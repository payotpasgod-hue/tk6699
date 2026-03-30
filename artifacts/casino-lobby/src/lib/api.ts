const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = JSON.parse(localStorage.getItem("tk6699-auth") || "{}")?.state?.token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      res.ok
        ? "Unexpected server response. Please try again."
        : `Server error (${res.status}). Please try again.`
    );
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  return data;
}
