export type Intent = 'Sales Inquiry' | 'Support-Technical' | 'Complaint' | 'Spam-Irrelevant'
export type Urgency = 'Low' | 'Medium' | 'High'
export type Channel = 'messenger' | 'whatsapp'

export interface Customer {
  id: number
  name: string
  channel: Channel
}

export interface Message {
  id: number
  body: string
  intent: Intent | null
  intent_confidence: number | null
  urgency: Urgency | null
  urgency_confidence: number | null
  suggested_reply: string | null
  sent_reply: string | null
  status: 'pending' | 'replied'
  created_at: string
  replied_at: string | null
  customer: Customer
}

export interface AnalyticsSummary {
  total: number
  pending: number
  replied: number
  by_intent: Record<string, number>
  by_urgency: Record<string, number>
  by_channel: Record<string, number>
  avg_response_minutes: number | null
}
