/** fetch JSON dari browser dengan pesan error manusiawi. */
export async function apiFetch<T = unknown>(
  url: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet.");
  }
  if (res.status === 401) {
    throw new Error("Sesi berakhir. Silakan masuk kembali.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Terjadi kesalahan.");
  return data as T;
}
