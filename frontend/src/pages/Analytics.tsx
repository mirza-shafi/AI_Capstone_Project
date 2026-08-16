import { useEffect, useState } from 'react'
import { getAnalyticsSummary } from '../api/client'
import { useRefresh } from '../context/RefreshContext'
import type { AnalyticsSummary, Urgency } from '../types'

const URGENCY_ORDER: Urgency[] = ['High', 'Medium', 'Low']
const URGENCY_COLOR: Record<Urgency, string> = {
  High: 'bg-red-600',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-600',
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function BarRow({ label, value, max, colorClass }: { label: string; value: number; max: number; colorClass: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 truncate text-xs font-medium text-slate-600">{label}</span>
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
  const maxIntent = Math.max(1, ...intentEntries.map(([, v]) => v))
  const maxUrgency = Math.max(1, ...URGENCY_ORDER.map((u) => summary.by_urgency[u] ?? 0))

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total messages" value={summary.total} />
        <StatCard label="Pending" value={summary.pending} />
        <StatCard label="Replied" value={summary.replied} />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Volume by intent</h3>
        {intentEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No classified messages yet.</p>
        ) : (
          <div className="space-y-3">
            {intentEntries.map(([label, value]) => (
              <BarRow key={label} label={label} value={value} max={maxIntent} colorClass="bg-primary" />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Volume by urgency</h3>
        <div className="space-y-3">
          {URGENCY_ORDER.map((u) => (
            <BarRow
              key={u}
              label={u}
              value={summary.by_urgency[u] ?? 0}
              max={maxUrgency}
              colorClass={URGENCY_COLOR[u]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
