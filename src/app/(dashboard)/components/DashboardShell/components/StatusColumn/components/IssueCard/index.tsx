"use client";

import { useState } from 'react';
import { AlertTriangle, CalendarClock, Clock3, Flame, RotateCcw, UserCircle2, X } from 'lucide-react';
import { getStaleLevel } from '@/lib/alerts';
import {
  formatRelativeAge,
  formatRelativeTime,
  formatStatusAge,
} from '@/lib/time';
import { formatDueDate, getDueDateTone } from '@/lib/due-date';
import { getPriorityLabel } from '@/lib/display';
import type { DashboardIssue } from '@/types/dashboard';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const priorityClass: Record<string, string> = {
  Highest:
    'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200',
  High: 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
  Medium:
    'border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  Low: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
  Lowest:
    'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
  Unknown:
    'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300',
};

const dueDateClass = {
  default:
    'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200',
  soon: 'border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200',
  overdue:
    'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/70 dark:text-red-200',
};

const rejectionDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatRejectionDate(value: string): string {
  return rejectionDateFormatter.format(new Date(value));
}

export function IssueCard({
  issue,
  mode,
}: {
  issue: DashboardIssue;
  mode: 'standard' | 'tv';
}) {
  const staleLevel = getStaleLevel(issue);
  const dueDateTone = issue.dueDate ? getDueDateTone(issue.dueDate) : undefined;
  const [isRejectionHistoryOpen, setIsRejectionHistoryOpen] = useState(false);
  const epicColorStyle = issue.epic?.color
    ? { backgroundColor: issue.epic.color }
    : undefined;

  return (
    <>
      <article
        className={cn(
          'group rounded-lg border bg-card p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-operational',
          issue.isHotfix &&
            'border-red-300 bg-red-50 ring-1 ring-red-200 dark:border-red-900/80 dark:bg-red-950/40 dark:ring-red-900/70',
          staleLevel === 'warning' &&
            !issue.isHotfix &&
            'border-amber-300 bg-amber-50 dark:border-yellow-600/70 dark:bg-yellow-950/30',
          staleLevel === 'critical' &&
            !issue.isHotfix &&
            'border-orange-400 bg-orange-50 dark:border-amber-500/80 dark:bg-amber-950/45 dark:ring-1 dark:ring-amber-400/20',
          mode === 'tv' && 'p-3',
        )}
      >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {issue.issueType.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issue.issueType.iconUrl}
              alt=""
              title={issue.issueType.name}
              className={cn('h-4 w-4 shrink-0', mode === 'tv' && 'h-5 w-5')}
            />
          ) : null}
          <a
            href={issue.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'font-semibold text-primary hover:underline',
              mode === 'tv' ? 'text-xl' : 'text-sm',
            )}
          >
            {issue.key}
          </a>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {issue.complexity ? (
            <Badge variant="secondary" className="font-semibold">
              {issue.complexity}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={cn('border', priorityClass[issue.priority])}
          >
            {getPriorityLabel(issue.priority)}
          </Badge>
          {issue.isHotfix ? (
            <Badge variant="hotfix">
              <Flame className="mr-1 h-3 w-3" />
              HOTFIX
            </Badge>
          ) : null}
        </div>
      </div>

      <h3
        className={cn(
          'mt-1.5 font-medium leading-snug',
          mode === 'tv' ? 'text-lg' : 'text-sm',
        )}
      >
        {issue.title.replace('[HOTFIX]', '').trim()}
      </h3>

      {issue.epic?.key || issue.epic?.name ? (
        <Badge
          variant="outline"
          className="mt-1.5 max-w-full truncate border border-slate-200 bg-slate-50 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        >
          {issue.epic.color ? (
            <span
              className="mr-1.5 h-2 w-2 shrink-0 rounded-full"
              style={epicColorStyle}
            />
          ) : null}
          Épico: {issue.epic.name} ({issue.epic.key})
        </Badge>
      ) : null}

      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <Badge variant="secondary" className="min-w-0 max-w-[48%] truncate">
          {issue.jiraStatus}
        </Badge>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-muted-foreground">
          {issue.assignee.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={issue.assignee.avatarUrl}
              alt=""
              className={cn('h-5 w-5 shrink-0 rounded-full', mode === 'tv' && 'h-6 w-6')}
            />
          ) : (
            <UserCircle2 className={cn('h-5 w-5 shrink-0', mode === 'tv' && 'h-6 w-6')} />
          )}
          <span
            className={cn('truncate text-right', mode === 'tv' ? 'text-sm' : 'text-xs')}
          >
            {issue.assignee.name}
          </span>
        </div>
      </div>

      <footer
        className={cn(
          'mt-2 grid gap-1 border-t pt-2 text-muted-foreground',
          mode === 'tv' ? 'text-sm' : 'text-xs',
        )}
      >
        <span className="flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" />
          {formatStatusAge(issue.jiraStatus, issue.statusChangedAt)}
        </span>
        <span>
          Criado há {formatRelativeAge(issue.createdAt)} · Atualizado{' '}
          {formatRelativeTime(issue.updatedAt)}
        </span>
        {issue.dueDate ? (
          <Badge
            variant="outline"
            className={cn(
              'mt-1 w-fit max-w-full gap-1.5 whitespace-normal px-2 py-1 text-left font-semibold leading-snug',
              dueDateClass[dueDateTone ?? 'default'],
            )}
          >
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            Data limite: {formatDueDate(issue.dueDate)}
          </Badge>
        ) : null}
         {issue.qaRejectionCount > 0 ? (
          <button
            type="button"
            className="flex w-fit items-center gap-1 rounded-sm text-left font-semibold text-amber-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-amber-200 mt-1"
            onClick={() => setIsRejectionHistoryOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reprovações QA: {issue.qaRejectionCount}
          </button>
        ) : null}
        {staleLevel !== 'none' ? (
          <span
            className={cn(
              'mt-1 flex items-center gap-1 font-semibold',
              staleLevel === 'critical'
                ? 'text-orange-700 dark:text-orange-200'
                : 'text-amber-700 dark:text-yellow-200',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Parado neste status
          </span>
        ) : null}
      </footer>

      </article>

      {isRejectionHistoryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`qa-rejections-${issue.id}`}
          onClick={() => setIsRejectionHistoryOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border bg-card p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`qa-rejections-${issue.id}`} className="text-base font-semibold text-foreground">
                  Histórico de reprovações QA
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {issue.key} · {issue.title.replace('[HOTFIX]', '').trim()}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Fechar"
                onClick={() => setIsRejectionHistoryOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {issue.qaRejections.map((rejection) => (
                <div
                  key={`${rejection.changedAt}-${rejection.toStatus}`}
                  className="rounded-md border bg-muted/30 p-3"
                >
                  <div className="text-sm font-semibold text-foreground">
                    {rejection.fromStatus} → {rejection.toStatus}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatRejectionDate(rejection.changedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
