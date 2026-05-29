import { Archive, Check, ChevronDown, RotateCcw, Rss, Trash2, X } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Field } from '~/components/subscription/shared';
import { inferMikanBangumiUrl, splitCommaList } from '~/lib/subscription';
import type { SubscriptionConfig, UpdateSeasonPayload } from '~/types';

interface SubscriptionCardProps {
  subscription: SubscriptionConfig;
  index: number;
  onDelete: (index: number) => void;
  onUpdate: (index: number, payload: UpdateSeasonPayload) => void;
}

export const SubscriptionCard = memo(function SubscriptionCard({
  subscription,
  index,
  onDelete,
  onUpdate,
}: SubscriptionCardProps) {
  const mikanUrl = inferMikanBangumiUrl(subscription.rss);
  const [expanded, setExpanded] = useState(false);
  const [folder, setFolder] = useState(subscription.folder);
  const [season, setSeason] = useState(String(subscription.season));
  const [filters, setFilters] = useState(subscription.filters?.join(', ') ?? '');

  useEffect(() => {
    setFolder(subscription.folder);
    setSeason(String(subscription.season));
    setFilters(subscription.filters?.join(', ') ?? '');
  }, [subscription.filters, subscription.folder, subscription.season]);

  function resetForm() {
    setFolder(subscription.folder);
    setSeason(String(subscription.season));
    setFilters(subscription.filters?.join(', ') ?? '');
  }

  function save() {
    const nextSeason = Number(season);
    if (!Number.isInteger(nextSeason) || nextSeason <= 0) return;

    onUpdate(index, {
      folder: folder.trim() || subscription.title,
      season: nextSeason,
      filters: splitCommaList(filters),
      archived: subscription.archived,
    });
    setExpanded(false);
  }

  function toggleArchive() {
    onUpdate(index, {
      folder: subscription.folder,
      season: subscription.season,
      filters: subscription.filters ?? [],
      archived: !subscription.archived,
    });
    setExpanded(false);
  }

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors [contain-intrinsic-size:9rem] [content-visibility:auto] ${
        subscription.archived
          ? 'border-amber-900/70 bg-amber-950/14 hover:border-amber-800/80 hover:bg-amber-950/20'
          : 'border-slate-800 bg-slate-900/48 hover:border-slate-700 hover:bg-slate-900/70'
      }`}>
      <div
        role="button"
        tabIndex={0}
        className="grid cursor-pointer gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}>
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            {mikanUrl ? (
              <a
                href={mikanUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="min-w-0 truncate font-medium text-slate-100 underline decoration-slate-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-400">
                <span className="truncate">{subscription.title}</span>
              </a>
            ) : (
              <div className="min-w-0 truncate font-medium text-slate-100">{subscription.title}</div>
            )}
            <a
              href={subscription.rss}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-800 bg-cyan-950/70 px-2.5 py-0.5 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-500 hover:bg-cyan-900 hover:text-cyan-50">
              <Rss className="size-3.5" />
              RSS
            </a>
          </div>
          <SubscriptionMeta subscription={subscription} />
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          {subscription.archived ? (
            <div className="rounded-full border border-amber-800/70 bg-amber-950/80 px-2.5 py-0.5 text-xs font-medium text-amber-200">
              Archived
            </div>
          ) : null}
          <div className="rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-0.5 text-xs font-medium text-slate-400">
            Edit
          </div>
          <ChevronDown
            className={`size-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </div>
      </div>

      {expanded ? (
        <div
          className="mt-4 rounded-xl border border-slate-800 bg-slate-950/64 p-3"
          onClick={(event) => event.stopPropagation()}>
          <div className="grid gap-3 md:grid-cols-[7rem_1fr]">
            <Field label="Season">
              <Input type="number" min="1" value={season} onChange={(event) => setSeason(event.target.value)} />
            </Field>
            <Field label="Folder">
              <Input value={folder} onChange={(event) => setFolder(event.target.value)} />
            </Field>
            <Field label="Title Filters">
              <Input
                value={filters}
                onChange={(event) => setFilters(event.target.value)}
                placeholder="One or more keywords, separated by commas. e.g. 1080p, CHS"
                className="h-12 text-base"
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <Button variant="danger" size="sm" className="w-fit whitespace-nowrap" onClick={() => onDelete(index)}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" className="w-fit whitespace-nowrap" onClick={toggleArchive}>
                {subscription.archived ? <RotateCcw className="mr-2 size-4" /> : <Archive className="mr-2 size-4" />}
                {subscription.archived ? 'Restore' : 'Archive'}
              </Button>
              <Button variant="soft" size="sm" className="w-fit whitespace-nowrap" onClick={save}>
                <Check className="mr-2 size-4" />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-fit whitespace-nowrap"
                onClick={() => {
                  resetForm();
                  setExpanded(false);
                }}>
                <X className="mr-2 size-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

function SubscriptionMeta({ subscription }: { subscription: SubscriptionConfig }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
      <span>
        <span className="text-slate-500">Season</span>{' '}
        <span className="font-medium text-slate-200">{subscription.season}</span>
      </span>
      <span>
        <span className="text-slate-500">Folder</span>{' '}
        <span className="font-medium text-slate-200">{subscription.folder}</span>
      </span>
      {subscription.filters?.length ? (
        <span>
          <span className="text-slate-500">Filters</span>{' '}
          <span className="font-medium text-slate-200">{subscription.filters.join(' / ')}</span>
        </span>
      ) : null}
    </div>
  );
}
