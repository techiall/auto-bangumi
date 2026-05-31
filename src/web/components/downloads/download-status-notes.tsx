import { Info } from 'lucide-react';

export function DownloadStatusNotes() {
  return (
    <details className="rounded-2xl border border-slate-800/80 bg-slate-950/55 px-4 py-3 text-xs text-slate-500">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold uppercase tracking-[0.16em] text-slate-400 marker:hidden">
        <Info className="size-3.5 text-cyan-300" />
        Status Notes
      </summary>
      <div className="mt-3 grid gap-2">
        <StatusNote
          label="Views"
          text="Sections are independent; one episode can appear in Seeding and Move Jobs at the same time."
        />
        <StatusNote
          label="Needs Attention"
          text="qB read errors, missing qB torrents, or failed move jobs. Retry move appears here after a move failure."
        />
        <StatusNote label="Active Queue" text="qB torrents that are still downloading or checking." />
        <StatusNote
          label="Move Jobs"
          text="Files currently claimed by the library agent and being copied into the library."
        />
        <StatusNote
          label="Seeding"
          text="Completed qB torrents that are still present in qB, including files already moved but still sharing."
        />
        <StatusNote
          label="Moved History"
          text="Files copied into the library. They may also remain in Seeding until qB reaches the share limit."
        />
        <StatusNote
          label="Cleaned"
          text="Moved first, then removed from qBittorrent and its download storage after ratio or time limits stop it."
        />
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
