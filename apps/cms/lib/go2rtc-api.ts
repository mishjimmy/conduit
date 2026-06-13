// Server-side client for go2rtc's REST API. Adds/removes streams live (no file
// edit, no restart); go2rtc persists changes to its own config.
const base = process.env.GO2RTC_API_URL ?? "http://localhost:1984";

/** Create or update a stream named `name` with source `src` (rtsp/ffmpeg/exec). */
export async function upsertStream(name: string, src: string): Promise<void> {
  const url = `${base}/api/streams?name=${encodeURIComponent(name)}&src=${encodeURIComponent(src)}`;
  const res = await fetch(url, { method: "PUT" });
  if (!res.ok) throw new Error(`go2rtc upsert failed (${res.status})`);
}

/** Remove a stream by name. 404 is treated as already-gone. */
export async function removeStream(name: string): Promise<void> {
  const url = `${base}/api/streams?src=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`go2rtc delete failed (${res.status})`);
}
