import { Inbox as InboxIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { listMessages } from '../api/client'
import { MessageDetailPanel } from '../components/MessageDetailPanel'
import { MessageListItem } from '../components/MessageListItem'
import { useRefresh } from '../context/RefreshContext'
import type { Message } from '../types'

const INTENTS = ['Sales Inquiry', 'Support-Technical', 'Complaint', 'Spam-Irrelevant'] as const

const STATUS_TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'replied', label: 'Replied' },
  { value: '', label: 'All' },
] as const

export function Inbox() {
  const { refreshKey } = useRefresh()
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('pending')
  const [intent, setIntent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listMessages({ status: status || undefined, intent: intent || undefined })
      setMessages(data)
    } catch {
      setError('Could not load messages — is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [status, intent])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    if (selectedId === null && messages.length > 0) {
      setSelectedId(messages[0].id)
    } else if (selectedId !== null && !messages.some((m) => m.id === selectedId)) {
      setSelectedId(messages[0]?.id ?? null)
    }
  }, [messages, selectedId])

  const selected = useMemo(() => messages.find((m) => m.id === selectedId) ?? null, [messages, selectedId])

  function handleUpdated(updated: Message) {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="flex w-full max-w-xs flex-col border-r border-slate-200 bg-white md:max-w-sm">
        <div className="space-y-3 border-b border-slate-200 p-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-semibold transition-colors ${
                  status === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-primary"
          >
            <option value="">All intents</option>
            {INTENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-slate-400">Loading…</p>}
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-slate-400">
              <InboxIcon size={28} />
              <p className="text-sm">No messages here.</p>
            </div>
          )}
          {messages.map((m) => (
            <MessageListItem key={m.id} message={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
          ))}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto">
        {selected ? (
          <MessageDetailPanel key={selected.id} message={selected} onUpdated={handleUpdated} />
        ) : (
          !loading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select a message to view details.
            </div>
          )
        )}
      </section>
    </div>
  )
}
