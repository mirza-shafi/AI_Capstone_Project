import type { AnalyticsSummary, Message } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.detail ?? `Request failed (${response.status})`)
  }
  return response.json()
}

export function listMessages(params: { status?: string; intent?: string } = {}): Promise<Message[]> {
  const query = new URLSearchParams()
  if (params.status !== undefined) query.set('status', params.status)
  if (params.intent) query.set('intent', params.intent)
  const qs = query.toString()
  return request<Message[]>(`/messages${qs ? `?${qs}` : ''}`)
}

export function getMessage(id: number): Promise<Message> {
  return request<Message>(`/messages/${id}`)
}

export function createMessage(payload: {
  customer_name: string
  channel: string
  body: string
}): Promise<Message> {
  return request<Message>('/messages', { method: 'POST', body: JSON.stringify(payload) })
}

export function reclassifyMessage(id: number): Promise<Message> {
  return request<Message>(`/messages/${id}/classify`, { method: 'POST' })
}

export function suggestReply(id: number): Promise<Message> {
  return request<Message>(`/messages/${id}/suggest-reply`, { method: 'POST' })
}

export function sendReply(id: number, replyText: string): Promise<Message> {
  return request<Message>(`/messages/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ reply_text: replyText }),
  })
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return request<AnalyticsSummary>('/analytics/summary')
}
