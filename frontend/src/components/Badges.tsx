import { AlertTriangle, Ban, LifeBuoy, ShoppingBag, type LucideIcon } from 'lucide-react'
import type { Intent, Urgency } from '../types'

const URGENCY_STYLES: Record<Urgency, string> = {
  High: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200',
  Medium: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200',
  Low: 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200',
}

const URGENCY_DOT: Record<Urgency, string> = {
  High: 'bg-red-600',
  Medium: 'bg-amber-500',
  Low: 'bg-emerald-600',
}

export function UrgencyBadge({ urgency }: { urgency: Urgency | null }) {
  if (!urgency) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Unclassified
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${URGENCY_STYLES[urgency]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${URGENCY_DOT[urgency]}`} />
      {urgency}
    </span>
  )
}

const INTENT_ICON: Record<Intent, LucideIcon> = {
  'Sales Inquiry': ShoppingBag,
  'Support-Technical': LifeBuoy,
  Complaint: AlertTriangle,
  'Spam-Irrelevant': Ban,
}

export function IntentBadge({ intent }: { intent: Intent | null }) {
  if (!intent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-400">
        Unclassified
      </span>
    )
  }
  const Icon = INTENT_ICON[intent]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
      <Icon size={13} strokeWidth={2} className="text-slate-400" />
      {intent}
    </span>
  )
}
