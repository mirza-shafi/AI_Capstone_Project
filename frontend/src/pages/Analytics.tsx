import { CheckCircle2, Clock, Inbox, Timer, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAnalyticsSummary } from '../api/client'
import { DonutChart } from '../components/DonutChart'
import { useRefresh } from '../context/RefreshContext'
import type { AnalyticsSummary, Urgency } from '../types'

const URGENCY_ORDER: Urgency[] = ['High', 'Medium', 'Low']
const URGENCY_COLOR: Record<Urgency, string> = {
  High: 'bg-red-600',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-600',
}

const INTENT_COLORS: Record<string, string> = {
  'Sales Inquiry': '#0d9488',
  'Support-Technical': '#7c3aed',
  Complaint: '#d97706',
  'Spam-Irrelevant': '#94a3b8',
}

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', color: '#22c55e' },
  messenger: { label: 'Messenger', color: '#3b82f6' },
}

function formatMinutes(mins: number): string {
  if (mins < 1) return '<1m'
  if (mins < 60) return `${Math.round(mins)}m`
  const hours = Math.floor(mins / 60)
  const remaining = Math.round(mins % 60)
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string
  icon: LucideIcon
  iconClass: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function BarRow({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs font-medium text-slate-600">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-700">{value}</span>
    </div>
  )
}

export function Analytics() {
  const { refreshKey } = useRefresh()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAnalyticsSummary()
      .then(setSummary)
      .catch(() => setError('Could not load analytics — is the backend running?'))
  }, [refreshKey])

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>
  }
  if (!summary) {
    return <div className="p-6 text-sm text-slate-400">Loading…</div>
  }

  const intentEntries = Object.entries(summary.by_intent).sort((a, b) => b[1] - a[1])
  const maxUrgency = Math.max(1, ...URGENCY_ORDER.map((u) => summary.by_urgency[u] ?? 0))
  const resolutionRate = summary.total === 0 ? 0 : Math.round((summary.replied / summary.total) * 100)

  const channelEntries = Object.entries(summary.by_channel)
  const channelTotal = channelEntries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400">Inbox volume and response performance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total messages" value={String(summary.total)} icon={Inbox} iconClass="bg-primary-light text-primary" />
        <StatCard label="Pending" value={String(summary.pending)} icon={Clock} iconClass="bg-amber-50 text-amber-600" />
        <StatCard
          label="Avg. response time"
          value={summary.avg_response_minutes === null ? '—' : formatMinutes(summary.avg_response_minutes)}
          icon={Timer}
          iconClass="bg-violet-50 text-violet-600"
        />
        <StatCard label="Resolution rate" value={`${resolutionRate}%`} icon={CheckCircle2} iconClass="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Volume by intent</h3>
          {intentEntries.length === 0 ? (
            <p className="text-sm text-slate-400">No classified messages yet.</p>
          ) : (
            <div className="flex items-center gap-6">
              <DonutChart
                segments={intentEntries.map(([label, value]) => ({
                  label,
                  value,
                  color: INTENT_COLORS[label] ?? '#94a3b8',
                }))}
                centerLabel={{ value: String(summary.total), caption: 'total' }}
              />
              <ul className="min-w-0 flex-1 space-y-2">
                {intentEntries.map(([label, value]) => {
                  const pct = summary.total === 0 ? 0 : Math.round((value / summary.total) * 100)
                  return (
                    <li key={label} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: INTENT_COLORS[label] ?? '#94a3b8' }}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-600">{label}</span>
                      <span className="shrink-0 font-semibold text-slate-800">{value}</span>
                      <span className="w-9 shrink-0 text-right text-slate-400">{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Volume by urgency</h3>
          <div className="space-y-3">
            {URGENCY_ORDER.map((u) => (
              <BarRow key={u} label={u} value={summary.by_urgency[u] ?? 0} max={maxUrgency} colorClass={URGENCY_COLOR[u]} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Volume by channel</h3>
        {channelTotal === 0 ? (
          <p className="text-sm text-slate-400">No messages yet.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {channelEntries.map(([channel, value]) => (
                <div
                  key={channel}
                  style={{
                    width: `${(value / channelTotal) * 100}%`,
                    backgroundColor: CHANNEL_META[channel]?.color ?? '#94a3b8',
                  }}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              {channelEntries.map(([channel, value]) => (
                <div key={channel} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHANNEL_META[channel]?.color ?? '#94a3b8' }}
                  />
                  <span className="text-slate-600">{CHANNEL_META[channel]?.label ?? channel}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                  <span className="text-slate-400">({Math.round((value / channelTotal) * 100)}%)</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
