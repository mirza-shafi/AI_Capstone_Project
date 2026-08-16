import { AlertCircle, RefreshCw, Send, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError, reclassifyMessage, sendReply, suggestReply } from '../api/client'
import { timeAgo } from '../lib/time'
import type { Message } from '../types'
import { IntentBadge, UrgencyBadge } from './Badges'

type BusyState = 'classify' | 'suggest' | 'send' | null

export function MessageDetailPanel({
  message,
  onUpdated,
}: {
  message: Message
  onUpdated: (updated: Message) => void
}) {
  const [replyDraft, setReplyDraft] = useState(message.suggested_reply ?? '')
  const [busy, setBusy] = useState<BusyState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setReplyDraft(message.suggested_reply ?? '')
    setError(null)
  }, [message.id, message.suggested_reply])

  async function runAction(kind: BusyState, action: () => Promise<Message>) {
    setBusy(kind)
    setError(null)
    try {
      const updated = await action()
      onUpdated(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const pct = (c: number | null) => (c === null ? null : Math.round(c * 100))

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{message.customer.name}</h2>
          <p className="text-xs capitalize text-slate-400">
            {message.customer.channel} &middot; {timeAgo(message.created_at)}
          </p>
        </div>
        <button
          onClick={() => runAction('classify', () => reclassifyMessage(message.id))}
          disabled={busy !== null}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={13} className={busy === 'classify' ? 'animate-spin' : ''} />
          Reclassify
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <IntentBadge intent={message.intent} />
        <UrgencyBadge urgency={message.urgency} />
        {message.intent_confidence !== null && (
          <span className="text-[11px] text-slate-400">
            {pct(message.intent_confidence)}% intent &middot; {pct(message.urgency_confidence)}% urgency confidence
          </span>
        )}
      </div>

      <div className="mb-6 rounded-xl rounded-tl-sm bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 shadow-sm ring-1 ring-slate-200">
        {message.body}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message.status === 'replied' ? (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Sent reply</p>
          <div className="rounded-xl rounded-tr-sm bg-primary-light p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 ring-1 ring-primary/20">
            {message.sent_reply}
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Reply</p>
            <button
              onClick={() => runAction('suggest', () => suggestReply(message.id))}
              disabled={busy !== null}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={13} className={busy === 'suggest' ? 'animate-pulse' : ''} />
              {busy === 'suggest' ? 'Drafting…' : message.suggested_reply ? 'Regenerate with AI' : 'Draft with AI'}
            </button>
          </div>
          <textarea
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            rows={5}
            placeholder="Write a reply, or draft one with AI…"
            className="w-full resize-none rounded-xl border border-slate-300 p-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => runAction('send', () => sendReply(message.id, replyDraft))}
              disabled={busy !== null || !replyDraft.trim()}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} />
              Send reply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
