import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  LoaderCircle,
  RadioTower,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '~/components/ui/card';
import { formatBytes } from '~/components/downloads/download-format';
import type { DownloadSummary } from '~/components/downloads/download-types';

interface DownloadOverviewProps {
  summary: DownloadSummary;
  loading: boolean;
}

export function DownloadOverview({ summary, loading }: DownloadOverviewProps) {
  const Icon = loading ? LoaderCircle : Activity;

  return (
    <Card className="p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,0.44fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-800/70 bg-slate-950/42 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Icon className={loading ? 'size-4 animate-spin text-cyan-200' : 'size-4 text-cyan-200'} />
            Queue Focus
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <QueueStat
              icon={<RadioTower className="size-4" />}
              label="Active"
              value={summary.activeCount}
              tone="cyan"
            />
            <QueueStat icon={<Truck className="size-4" />} label="Move Jobs" value={summary.moveJobCount} tone="sky" />
            <QueueStat
              icon={<AlertTriangle className="size-4" />}
              label="Attention"
              value={summary.attentionCount}
              tone="amber"
            />
            <QueueStat
              icon={<CheckCircle2 className="size-4" />}
              label="Moved"
              value={summary.completedCount}
              tone="slate"
            />
            <QueueStat
              icon={<ArrowUp className="size-4" />}
              label="Seeding"
              value={summary.seedingCount}
              tone="emerald"
            />
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-800/70 bg-slate-950/42 p-4">
          <div className="text-sm font-medium text-slate-300">Transfer Rate</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <SpeedStat
              icon={<ArrowDown className="size-4" />}
              label="Download"
              value={`${formatBytes(summary.downloadSpeed)}/s`}
            />
            <SpeedStat
              icon={<ArrowUp className="size-4" />}
              label="Upload"
              value={`${formatBytes(summary.uploadSpeed)}/s`}
            />
          </div>
        </section>
      </div>
    </Card>
  );
}

function QueueStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'cyan' | 'sky' | 'amber' | 'emerald' | 'slate';
}) {
  const toneClass = {
    cyan: 'text-cyan-200',
    sky: 'text-sky-200',
    amber: 'text-amber-200',
    emerald: 'text-emerald-200',
    slate: 'text-slate-200',
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className={`mb-3 ${toneClass}`}>{icon}</div>
      <div className={`text-2xl font-semibold leading-none tracking-tight ${toneClass}`}>{value}</div>
      <div className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</div>
    </div>
  );
}

function SpeedStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-cyan-200">{icon}</span>
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</span>
      </div>
      <div className="shrink-0 whitespace-nowrap text-base font-semibold tracking-tight text-slate-50">{value}</div>
    </div>
  );
}
