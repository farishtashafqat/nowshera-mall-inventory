export type UserRole = 'manager' | 'staff'
export interface CurrentUser { id: string; full_name: string; email: string; role: UserRole; department: string | null }
export interface StaffMember extends CurrentUser { is_active: boolean; created_at: string }
