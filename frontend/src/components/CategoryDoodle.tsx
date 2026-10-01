import type { ReactNode } from 'react'
import type { CategoryIconName } from '../data/categories'

const drawings: Record<CategoryIconName, ReactNode> = {
  produce: <><circle cx="21" cy="24" r="12" /><path d="M22 12c0-5 5-7 9-7-1 4-4 8-9 8M16 15c-2-4-5-5-8-4 1 4 4 6 8 6" /></>,
  grocery: <><path d="M10 17h28l-3 22H13l-3-22Z" /><path d="M16 17c0-7 16-7 16 0M19 25h10M24 20v10" /></>,
  clothing: <><path d="m15 15 9-5 9 5 7 8-7 5-3-4v17H18V24l-3 4-7-5 7-8Z" /></>,
  electronics: <><rect x="9" y="12" width="30" height="21" rx="2" /><path d="M5 38h38M20 38l2-5h4l2 5" /></>,
  household: <><path d="m8 24 16-14 16 14v17H8V24Z" /><path d="M19 41V29h10v12M17 17h14" /></>,
  beverages: <><path d="M18 10h12l-2 31H20l-2-31ZM18 16h12M24 10V6M31 24c5 1 7 7 3 11" /></>,
  'personal-care': <><path d="M18 17h12v24H18zM20 17v-6h8v6M15 25h18M35 20l3 5-3 3-3-3 3-5Z" /></>,
  snacks: <><path d="M14 10h20l-2 31H16l-2-31Z" /><path d="M14 17h20M21 24c0 3 6 3 6 0M21 31c0 3 6 3 6 0" /></>,
}

export function CategoryDoodle({ name }: { name: CategoryIconName }) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" className="category-doodle" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{drawings[name]}</svg>
}
