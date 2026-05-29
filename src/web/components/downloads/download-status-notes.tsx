import { Info } from 'lucide-react';

export function DownloadStatusNotes() {
  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3 text-xs text-slate-500">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold uppercase tracking-[0.16em] text-slate-400 marker:hidden">
        <Info className="size-3.5 text-cyan-300" />
        Status Notes
      </summary>
      <div className="mt-3 grid gap-2">
        <StatusNote label="Needs Attention" text="Missing qB status or a qB/API error that may need manual checking." />
        <StatusNote label="Active" text="Tracked and expected to exist in qBittorrent." />
        <StatusNote
          label="Ready to move"
          text="qB finished downloading and the download server has created a library transfer job."
        />
        <StatusNote
          label="Moving"
          text="A library agent has claimed the job and is copying the file into the library."
        />
        <StatusNote
          label="Move failed"
          text="The library agent reported an error; the downloaded source is kept for retry or manual checking."
        />
        <StatusNote label="Seeding" text="Moved to the library, still present in qB until cleanup limit is reached." />
        <StatusNote label="Moved" text="Copied into the library and no longer visible in qBittorrent." />
        <StatusNote label="Cleaned" text="Moved, then removed from qBittorrent together with its source files." />
        <StatusNote label="Not found" text="Tracked locally, but qB currently has no matching torrent." />
        <StatusNote label="qB unavailable" text="The server could not read qB status during this refresh." />
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
