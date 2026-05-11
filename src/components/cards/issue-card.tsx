import { AlertTriangle, Clock3, Flame, UserCircle2 } from 'lucide-react';
import { getStaleLevel } from '@/lib/alerts';
import {
  formatRelativeAge,
  formatRelativeTime,
  formatStatusAge,
} from '@/lib/time';
import { getPriorityLabel } from '@/lib/display';
import type { DashboardIssue } from '@/types/dashboard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const priorityClass: Record<string, string> = {
  Highest: 'border-red-300 bg-red-100 text-red-800',
  High: 'border-orange-300 bg-orange-100 text-orange-800',
  Medium: 'border-sky-300 bg-sky-100 text-sky-800',
  Low: 'border-slate-300 bg-slate-100 text-slate-700',
  Lowest: 'border-slate-300 bg-slate-50 text-slate-600',
  Unknown: 'border-slate-300 bg-slate-50 text-slate-600',
};

export function IssueCard({
  issue,
  mode,
}: {
  issue: DashboardIssue;
  mode: 'standard' | 'tv';
}) {
  const staleLevel = getStaleLevel(issue);
  const epicColorStyle = issue.epic?.color
    ? { backgroundColor: issue.epic.color }
    : undefined;

  return (
    <article
      className={cn(
        'group rounded-lg border bg-card p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-operational',
        issue.isHotfix && 'border-red-300 bg-red-50 ring-1 ring-red-200',
        staleLevel === 'warning' &&
          !issue.isHotfix &&
          'border-amber-300 bg-amber-50',
        staleLevel === 'critical' &&
          !issue.isHotfix &&
          'border-orange-400 bg-orange-50',
        mode === 'tv' && 'p-4',
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
          {issue.storyPoints !== undefined ? (
            <Badge variant="secondary" className="font-semibold">
              SP: {issue.storyPoints}
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
          'mt-2 line-clamp-3 font-medium leading-snug',
          mode === 'tv' ? 'text-lg' : 'text-sm',
        )}
      >
        {issue.title.replace('[HOTFIX]', '').trim()}
      </h3>

      {issue.epic?.key || issue.epic?.name ? (
        <Badge
          variant="outline"
          className="mt-2 max-w-full truncate border border-slate-200 bg-slate-50 font-medium text-slate-700"
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

      <div className="mt-2">
        <Badge variant="secondary" className="max-w-full truncate">
          {issue.jiraStatus}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 text-muted-foreground">
        {issue.assignee.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={issue.assignee.avatarUrl}
            alt=""
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <UserCircle2 className="h-6 w-6" />
        )}
        <span
          className={cn('truncate', mode === 'tv' ? 'text-base' : 'text-xs')}
        >
          {issue.assignee.name}
        </span>
      </div>

      <footer
        className={cn(
          'mt-3 grid gap-1 border-t pt-3 text-muted-foreground',
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
        {staleLevel !== 'none' ? (
          <span
            className={cn(
              'mt-1 flex items-center gap-1 font-semibold',
              staleLevel === 'critical' ? 'text-orange-700' : 'text-amber-700',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Parado neste status
          </span>
        ) : null}
      </footer>
    </article>
  );
}
