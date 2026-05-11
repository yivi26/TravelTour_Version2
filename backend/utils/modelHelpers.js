export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeKeyword(value) {
  return String(value || "").trim();
}

export function buildPages(current, totalPages) {
  const pages = [];
  const c = Math.max(1, Math.min(totalPages, current));
  const start = Math.max(1, c - 1);
  const end = Math.min(totalPages, start + 2);
  for (let p = start; p <= end; p++) pages.push(p);
  return pages.length ? pages : [1];
}

