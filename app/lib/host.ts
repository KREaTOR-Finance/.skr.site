const ROOT_HOSTS = new Set(["skr.site", "www.skr.site", "localhost", "127.0.0.1"]);

export function normalizeSkrLabel(value: string): string | null {
  const lower = value.trim().toLowerCase().replace(/\.skr$/, "");
  if (!/^[a-z0-9-]{1,64}$/.test(lower)) return null;
  return lower;
}

export function extractSkrLabelFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  if (ROOT_HOSTS.has(host)) return null;
  if (!host.endsWith(".skr.site")) return null;
  return normalizeSkrLabel(host.replace(/\.skr\.site$/, ""));
}
