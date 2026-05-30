export function formatInterval(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return `${ms}ms`;

  const units = [
    { label: 'h', value: 60 * 60 * 1000 },
    { label: 'm', value: 60 * 1000 },
    { label: 's', value: 1000 },
  ];

  for (const unit of units) {
    if (ms % unit.value === 0) return `${ms / unit.value}${unit.label}`;
  }

  return `${ms}ms`;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}
