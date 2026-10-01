import { Link } from 'react-router-dom'
import { PageContainer } from '../components/ui'
export function NotFoundPage() { return <PageContainer><div className="not-found"><p className="eyebrow">404</p><h1>That page is not here.</h1><p>Return to the dashboard to continue.</p><Link className="button" to="/">Go to dashboard</Link></div></PageContainer> }
