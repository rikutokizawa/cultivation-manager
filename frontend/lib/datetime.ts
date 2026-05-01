function parseBackendTimestamp(value: string) {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function compareBackendTimestamps(a: string, b: string) {
  return parseBackendTimestamp(a).getTime() - parseBackendTimestamp(b).getTime();
}

export function formatJapanDateTime(value: string | undefined, options?: { seconds?: boolean }) {
  if (!value) {
    return "--";
  }

  const date = parseBackendTimestamp(value);
  return `${new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: options?.seconds ? "2-digit" : undefined,
  }).format(date)} JST`;
}

export function formatJapanChartLabel(value: string) {
  const date = parseBackendTimestamp(value);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
