import type { ReactNode } from 'react'
import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'

export function PageContainer({ children }: { children: ReactNode }) { return <main className="page-container">{children}</main> }
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section> }
export function LoadingState({ label = 'Loading…' }: { label?: string }) { return <div className="state"><LoaderCircle className="spin" aria-hidden="true" /><p>{label}</p></div> }
export function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="state"><Inbox aria-hidden="true" /><h2>{title}</h2><p>{detail}</p></div> }
export function ErrorState({ title = 'Something went wrong', detail }: { title?: string; detail: string }) { return <div className="state state-error"><AlertCircle aria-hidden="true" /><h2>{title}</h2><p>{detail}</p></div> }
