import { Check, ExternalLink, Layers3, LoaderCircle, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Field, GroupOption, StateBox } from '~/components/subscription/shared';
import { cn } from '~/lib/utils';
import type { MikanBangumiDetail, MikanBangumiGroup } from '~/types';

export interface SubscriptionFormState {
  title: string;
  folder: string;
  season: string;
  filters: string;
  rss: string;
}

interface SubscriptionSettingsProps {
  bangumi: MikanBangumiDetail;
  selectedGroup: MikanBangumiGroup | null;
  selectedGroupId: number | null;
  form: SubscriptionFormState;
  isSubmitting: boolean;
  notice: { kind: 'success' | 'error'; message: string } | null;
  onGroupSelect: (groupId: number) => void;
  onFormChange: (form: SubscriptionFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function SubscriptionSettings({
  bangumi,
  selectedGroup,
  selectedGroupId,
  form,
  isSubmitting,
  notice,
  onGroupSelect,
  onFormChange,
  onSubmit,
  onCancel,
}: SubscriptionSettingsProps) {
  return (
    <form
      className="grid gap-4 rounded-2xl border border-cyan-900/70 bg-slate-950/90 p-4 shadow-[0_16px_44px_rgba(8,145,178,0.1)]"
      onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <a
            href={bangumi.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 truncate font-medium text-slate-100 hover:text-cyan-200">
            <span className="truncate">{bangumi.title}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </a>
          <div className="mt-1 text-sm text-slate-500">Bangumi ID: {bangumi.id}</div>
        </div>
        <Badge variant="outline" className="border-cyan-800 bg-cyan-950 text-cyan-100">
          {selectedGroup ? selectedGroup.name : 'No subtitle group selected'}
        </Badge>
      </div>

      {notice ? (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            notice.kind === 'error'
              ? 'border-rose-900 bg-rose-950/70 text-rose-100'
              : 'border-cyan-900 bg-cyan-950/70 text-cyan-100',
          )}>
          {notice.message}
        </div>
      ) : null}

      <div className="grid gap-5">
        <section className="space-y-3">
          <div className="text-sm font-medium text-slate-100">Subtitle Group</div>
          <div className="grid max-h-72 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
            {bangumi.groups.length ? (
              bangumi.groups.map((group) => (
                <GroupOption
                  key={group.id}
                  group={group}
                  active={group.id === selectedGroupId}
                  onClick={() => onGroupSelect(group.id)}
                />
              ))
            ) : (
              <StateBox
                icon={<Layers3 className="size-4" />}
                text="No subtitle groups found. The default bangumi RSS will be used."
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
            <Field label="Title">
              <Input value={form.title} onChange={(event) => onFormChange({ ...form, title: event.target.value })} />
            </Field>

            <Field label="Season">
              <Input
                type="number"
                min="1"
                value={form.season}
                onChange={(event) => onFormChange({ ...form, season: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Folder">
              <Input
                value={form.folder}
                onChange={(event) => onFormChange({ ...form, folder: event.target.value })}
                placeholder="e.g. Natsume Yuujinchou"
              />
            </Field>

            <Field label="Title Filters">
              <Input
                value={form.filters}
                onChange={(event) => onFormChange({ ...form, filters: event.target.value })}
                placeholder="e.g. 1080p, CHS"
                className="h-12 text-base"
              />
            </Field>
          </div>

          <div className="grid gap-2">
            <Label>RSS</Label>
            <div className="max-h-24 overflow-y-auto break-all rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-400">
              {form.rss}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="lg" className="w-fit" onClick={onCancel}>
              <X className="mr-2 size-4" />
              Cancel
            </Button>
            <Button type="submit" size="lg" className="w-fit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              Save
            </Button>
          </div>
        </section>
      </div>
    </form>
  );
}
