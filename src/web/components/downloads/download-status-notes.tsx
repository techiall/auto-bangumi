import { Info } from 'lucide-react';
import { useI18n } from '~/lib/i18n';

export function DownloadStatusNotes() {
  const { t } = useI18n();

  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3 text-xs text-slate-500">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold uppercase tracking-[0.16em] text-slate-400 marker:hidden">
        <Info className="size-3.5 text-cyan-300" />
        {t('downloads.statusNotes')}
      </summary>
      <div className="mt-3 grid gap-2">
        <StatusNote label={t('downloads.notes.views.label')} text={t('downloads.notes.views.text')} />
        <StatusNote label={t('downloads.notes.attention.label')} text={t('downloads.notes.attention.text')} />
        <StatusNote label={t('downloads.notes.active.label')} text={t('downloads.notes.active.text')} />
        <StatusNote label={t('downloads.notes.moveJobs.label')} text={t('downloads.notes.moveJobs.text')} />
        <StatusNote label={t('downloads.notes.seeding.label')} text={t('downloads.notes.seeding.text')} />
        <StatusNote label={t('downloads.notes.history.label')} text={t('downloads.notes.history.text')} />
        <StatusNote label={t('downloads.notes.cleaned.label')} text={t('downloads.notes.cleaned.text')} />
        <StatusNote label={t('downloads.notes.notFound.label')} text={t('downloads.notes.notFound.text')} />
        <StatusNote label={t('downloads.notes.qbUnavailable.label')} text={t('downloads.notes.qbUnavailable.text')} />
      </div>
    </details>
  );
}

function StatusNote({ label, text }: { label: string; text: string }) {
  return (
    <div className="min-w-0">
      <span className="font-medium text-slate-300">{label}</span>
      <span className="mx-1 text-slate-700">-</span>
      <span>{text}</span>
    </div>
  );
}
