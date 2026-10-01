import { FormEvent, useState } from 'react'
import { Bot, CheckCircle2, LoaderCircle, Send, Sparkles, XCircle } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'
import { Card, PageContainer } from '../components/ui'
import { cancelAiProposal, chatWithAi, confirmAiProposal, getProducts, type AiProposal, type Movement, type Product } from '../services/api'

type ProposalCard = AiProposal & { currentStock: number | null; unit: string; request: string; result?: Movement }
type Message = { id: number; role: 'user' | 'assistant'; text: string; proposal?: ProposalCard }

const examples = [
  'How many Type-C cables do we have?',
  'Show me low-stock products.',
  'Which products are out of stock?',
  'Add 40 Type-C cables from Ali Traders.',
]

function operationLabel(operation: AiProposal['movement_type']) {
  return operation === 'STOCK_IN' ? 'Stock in' : operation === 'SALE' ? 'Sale' : 'Damage'
}

function Proposal({ proposal, processing, onConfirm, onCancel }: { proposal: ProposalCard; processing: boolean; onConfirm: () => void; onCancel: () => void }) {
  const quantity = Number(proposal.quantity)
  const stockAfter = proposal.currentStock === null ? null : proposal.movement_type === 'STOCK_IN' ? proposal.currentStock + quantity : proposal.currentStock - quantity
  const confirmed = proposal.status === 'CONFIRMED'
  const cancelled = proposal.status === 'CANCELLED'
  return <div className={`ai-proposal ${proposal.status.toLowerCase()}`}>
    <div className="proposal-heading"><div><p className="eyebrow">Stock change proposal</p><h3>{proposal.product}</h3></div><span className="proposal-status">{confirmed ? 'Confirmed' : cancelled ? 'Cancelled' : 'Pending approval'}</span></div>
    <dl className="proposal-details"><div><dt>Operation</dt><dd>{operationLabel(proposal.movement_type)}</dd></div><div><dt>Quantity</dt><dd>{quantity} {proposal.unit}</dd></div><div><dt>Current stock</dt><dd>{proposal.currentStock === null ? 'Loading live stock…' : `${proposal.currentStock} ${proposal.unit}`}</dd></div><div><dt>After confirmation</dt><dd>{stockAfter === null ? 'Will be rechecked' : `${stockAfter} ${proposal.unit}`}</dd></div>{proposal.supplier && <div><dt>Supplier</dt><dd>{proposal.supplier}</dd></div>}{proposal.movement_type === 'DAMAGE' && <div><dt>Reason</dt><dd>{proposal.request}</dd></div>}</dl>
    {confirmed && <p className="proposal-result"><CheckCircle2 size={17} /> Stock change confirmed{proposal.result ? `: ${proposal.result.stock_before} → ${proposal.result.stock_after} ${proposal.unit}.` : '.'}</p>}
    {cancelled && <p className="proposal-result cancelled"><XCircle size={17} /> Cancelled. No stock was changed.</p>}
    {!confirmed && !cancelled && <div className="proposal-actions"><button type="button" className="button" disabled={processing} onClick={onConfirm}>{processing ? 'Processing…' : 'Confirm stock change'}</button><button type="button" className="secondary-button" disabled={processing} onClick={onCancel}>Cancel</button></div>}
  </div>
}

export function AiAssistantPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'assistant', text: 'Hello! Ask me about live inventory, or describe a stock change and I will prepare it for your confirmation.' }])
  const [sending, setSending] = useState(false)
  const [processingProposal, setProcessingProposal] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function liveProduct(name: string): Promise<Product | undefined> {
    const products = await getProducts(token)
    return products.find(product => product.name.toLowerCase() === name.toLowerCase())
  }

  async function sendPrompt(prompt = input) {
    const message = prompt.trim()
    if (!message || !token || sending) return
    setMessages(previous => [...previous, { id: Date.now(), role: 'user', text: message }])
    setInput(''); setSending(true); setError('')
    try {
      const response = await chatWithAi(token, message)
      let proposal: ProposalCard | undefined
      if (response.proposal) {
        let product: Product | undefined
        try { product = await liveProduct(response.proposal.product) } catch { /* Confirmation remains authoritative if this display lookup fails. */ }
        proposal = { ...response.proposal, currentStock: product?.current_stock ?? null, unit: product?.unit ?? 'units', request: message }
      }
      setMessages(previous => [...previous, { id: Date.now() + 1, role: 'assistant', text: response.answer, proposal }])
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : 'The AI Assistant is unavailable right now.'
      setError(detail)
      setMessages(previous => [...previous, { id: Date.now() + 1, role: 'assistant', text: `I couldn’t complete that request: ${detail}` }])
    } finally { setSending(false) }
  }

  function updateProposal(id: string, update: (proposal: ProposalCard) => ProposalCard) {
    setMessages(previous => previous.map(message => message.proposal?.id === id ? { ...message, proposal: update(message.proposal) } : message))
  }

  async function confirm(proposal: ProposalCard) {
    if (!token) return
    setProcessingProposal(proposal.id); setError('')
    try {
      const result = await confirmAiProposal(token, proposal.id)
      updateProposal(proposal.id, value => ({ ...value, status: 'CONFIRMED', result, currentStock: result.stock_before, unit: value.unit }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not confirm the proposal.') } finally { setProcessingProposal(null) }
  }

  async function cancel(proposal: ProposalCard) {
    if (!token) return
    setProcessingProposal(proposal.id); setError('')
    try {
      await cancelAiProposal(token, proposal.id)
      updateProposal(proposal.id, value => ({ ...value, status: 'CANCELLED' }))
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not cancel the proposal.') } finally { setProcessingProposal(null) }
  }

  function submit(event: FormEvent) { event.preventDefault(); void sendPrompt() }
  return <PageContainer><div className="page-heading ai-heading"><div><p className="eyebrow">Phase 6 · live assistant</p><h1>AI Assistant</h1><p>Ask grounded inventory questions or prepare a stock change for secure approval.</p></div><span className="demo-pill"><Sparkles size={14} /> Gemini-powered</span></div><Card className="ai-chat-card"><div className="ai-messages" aria-live="polite">{messages.map(message => <article key={message.id} className={`ai-message ${message.role}`}><span className="ai-avatar" aria-hidden="true">{message.role === 'assistant' ? <Bot size={18} /> : 'You'}</span><div className="ai-message-body"><p>{message.text}</p>{message.proposal && <Proposal proposal={message.proposal} processing={processingProposal === message.proposal.id} onConfirm={() => void confirm(message.proposal!)} onCancel={() => void cancel(message.proposal!)} />}</div></article>)}{sending && <article className="ai-message assistant"><span className="ai-avatar"><Bot size={18} /></span><div className="ai-thinking"><LoaderCircle className="spin" size={18} /> Checking live inventory…</div></article>}</div>{error && <p className="form-error" role="alert">{error}</p>}<div className="ai-examples"><span>Try asking:</span>{examples.map(example => <button type="button" key={example} disabled={sending} onClick={() => void sendPrompt(example)}>{example}</button>)}</div><form className="ai-composer" onSubmit={submit}><label className="sr-only" htmlFor="ai-message">Your message</label><input id="ai-message" value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about inventory or describe a stock change…" disabled={sending} /><button className="button" type="submit" disabled={!input.trim() || sending}>{sending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />} {sending ? 'Sending…' : 'Send'}</button></form></Card></PageContainer>
}
