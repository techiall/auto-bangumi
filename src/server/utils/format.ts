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
