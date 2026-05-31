import { Check, ExternalLink, Layers3, LoaderCircle, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useId } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Field, GroupOption, StateBox } from '~/components/subscription/shared';
import { useI18n } from '~/lib/i18n';
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
  const { t } = useI18n();
  const formId = useId();
  const titleId = `${formId}-title`;
  const seasonId = `${formId}-season`;
  const folderId = `${formId}-folder`;
  const filtersId = `${formId}-filters`;

  return (
    <form
      className="grid min-w-0 gap-4 overflow-hidden rounded-2xl border border-cyan-800/70 bg-slate-950/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_16px_44px_rgba(8,145,178,0.1)]"
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
          <div className="mt-1 text-sm text-slate-500">{t('subscriptions.bangumiId', { id: bangumi.id })}</div>
        </div>
        <Badge variant="outline" className="border-cyan-800 bg-cyan-950 text-cyan-100">
          {selectedGroup ? selectedGroup.name : t('subscriptions.noSubtitleGroup')}
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
        <section className="min-w-0 space-y-3">
          <div className="text-sm font-medium text-slate-100">{t('subscriptions.subtitleGroup')}</div>
          <div className="grid max-h-72 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(17rem,100%),1fr))] gap-2 overflow-x-hidden overflow-y-auto pr-1">
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
              <StateBox icon={<Layers3 className="size-4" />} text={t('subscriptions.noSubtitleGroupsFound')} />
            )}
          </div>
        </section>

        <section className="min-w-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_8rem]">
            <Field id={titleId} label={t('common.title')}>
              <Input
                id={titleId}
                value={form.title}
                onChange={(event) => onFormChange({ ...form, title: event.target.value })}
              />
            </Field>

            <Field id={seasonId} label={t('common.season')}>
              <Input
                id={seasonId}
                type="number"
                min="1"
                value={form.season}
                onChange={(event) => onFormChange({ ...form, season: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Field id={folderId} label={t('common.folder')}>
              <Input
                id={folderId}
                value={form.folder}
                onChange={(event) => onFormChange({ ...form, folder: event.target.value })}
                placeholder={t('subscriptions.placeholderFolder')}
              />
            </Field>

            <Field id={filtersId} label={t('subscriptions.titleFilters')}>
              <Input
                id={filtersId}
                value={form.filters}
                onChange={(event) => onFormChange({ ...form, filters: event.target.value })}
                placeholder={t('subscriptions.placeholderTitleFilters')}
                className="h-12 text-base"
              />
            </Field>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button type="button" variant="outline" size="lg" className="w-full sm:w-fit" onClick={onCancel}>
              <X className="mr-2 size-4" />
              {t('common.cancel')}
            </Button>
            <Button type="submit" size="lg" className="w-full sm:w-fit" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              {t('common.save')}
            </Button>
          </div>
        </section>
      </div>
    </form>
  );
}
