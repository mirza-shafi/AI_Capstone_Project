import { timeAgo } from '../lib/time'
import type { Message } from '../types'
import { UrgencyBadge } from './Badges'

export function MessageListItem({
  message,
  selected,
  onClick,
}: {
  message: Message
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col gap-1.5 border-b border-slate-100 px-3.5 py-3 text-left transition-colors ${
        selected ? 'bg-primary-light' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-slate-900">{message.customer.name}</span>
        <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(message.created_at)}</span>
      </div>
      <p className="line-clamp-2 text-xs text-slate-500">{message.body}</p>
      <div className="flex items-center gap-1.5">
        <UrgencyBadge urgency={message.urgency} />
        <span className="text-[11px] capitalize text-slate-400">{message.customer.channel}</span>
      </div>
    </button>
  )
}
