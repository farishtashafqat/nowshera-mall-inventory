import { Construction } from 'lucide-react'
import { Card, EmptyState, PageContainer } from '../components/ui'

export function ComingSoonPage({ title, description }: { title: string; description: string }) {
  return <PageContainer><div className="page-heading"><p className="eyebrow">Phase 1 · Foundation</p><h1>{title}</h1><p>{description}</p></div><Card><EmptyState title={`${title} is coming soon`} detail="This area is intentionally reserved for a later project phase. No live inventory data is shown here yet." /><Construction className="watermark" aria-hidden="true" /></Card></PageContainer>
}
