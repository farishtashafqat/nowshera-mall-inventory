import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { PageContainer } from '../components/ui'
export function AccessDeniedPage() { return <PageContainer><div className="not-found"><ShieldAlert size={42} color="#B77466" /><p className="eyebrow">Access restricted</p><h1>This area is for managers.</h1><p>Your staff account is active, but it does not have permission to view staff management.</p><Link className="button" to="/">Return to dashboard</Link></div></PageContainer> }
