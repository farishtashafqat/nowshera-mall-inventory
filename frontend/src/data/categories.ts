export type CategoryIconName = 'produce' | 'grocery' | 'clothing' | 'electronics' | 'household' | 'beverages' | 'personal-care' | 'snacks'

export interface CategoryPreview {
  name: string
  icon: CategoryIconName
  description: string
}

// Presentation-only data. Real categories will come from Supabase in Phase 3.
export const categoryPreviews: CategoryPreview[] = [
  { name: 'Fruits & Vegetables', icon: 'produce', description: 'Fresh market goods' },
  { name: 'Grocery', icon: 'grocery', description: 'Everyday essentials' },
  { name: 'Clothing', icon: 'clothing', description: 'Apparel & accessories' },
  { name: 'Electronics', icon: 'electronics', description: 'Devices & accessories' },
  { name: 'Household', icon: 'household', description: 'Home essentials' },
  { name: 'Beverages', icon: 'beverages', description: 'Drinks & refreshment' },
  { name: 'Personal Care', icon: 'personal-care', description: 'Care & wellness' },
  { name: 'Snacks', icon: 'snacks', description: 'Quick bites & treats' },
]
