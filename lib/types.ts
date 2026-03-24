export type UserRole = 'admin' | 'manager' | 'technician' | 'user'
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
export type ChangeStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'implementing' | 'completed' | 'failed' | 'cancelled'
export type ProblemStatus = 'open' | 'investigating' | 'known_error' | 'resolved' | 'closed'
export type RequestStatus = 'submitted' | 'in_progress' | 'fulfilled' | 'cancelled'
export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'retired' | 'disposed'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  department: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  type: 'incident' | 'change' | 'problem' | 'request'
  description: string | null
  created_at: string
}

export interface Asset {
  id: string
  name: string
  asset_tag: string | null
  type: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  ip_address: string | null
  mac_address: string | null
  location: string | null
  department: string | null
  assigned_to: string | null
  status: AssetStatus
  purchase_date: string | null
  warranty_expiry: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  assignee?: Profile
}

export interface Incident {
  id: string
  ticket_number: string
  title: string
  description: string
  category_id: string | null
  priority: PriorityLevel
  status: IncidentStatus
  reported_by: string
  assigned_to: string | null
  affected_asset_id: string | null
  resolution: string | null
  resolved_at: string | null
  closed_at: string | null
  sla_breach: boolean
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  reporter?: Profile
  assignee?: Profile
  affected_asset?: Asset
}

export interface IncidentComment {
  id: string
  incident_id: string
  author_id: string
  content: string
  is_internal: boolean
  created_at: string
  author?: Profile
}

export interface Change {
  id: string
  ticket_number: string
  title: string
  description: string
  justification: string | null
  impact_analysis: string | null
  rollback_plan: string | null
  category_id: string | null
  priority: PriorityLevel
  status: ChangeStatus
  change_type: 'standard' | 'normal' | 'emergency' | null
  requested_by: string
  assigned_to: string | null
  approved_by: string | null
  scheduled_start: string | null
  scheduled_end: string | null
  implemented_at: string | null
  affected_assets: string[] | null
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  requester?: Profile
  assignee?: Profile
  approver?: Profile
}

export interface Problem {
  id: string
  ticket_number: string
  title: string
  description: string
  root_cause: string | null
  workaround: string | null
  resolution: string | null
  category_id: string | null
  priority: PriorityLevel
  status: ProblemStatus
  reported_by: string
  assigned_to: string | null
  related_incidents: string[] | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  reporter?: Profile
  assignee?: Profile
}

export interface ServiceRequest {
  id: string
  ticket_number: string
  title: string
  description: string
  category_id: string | null
  priority: PriorityLevel
  status: RequestStatus
  requested_by: string
  assigned_to: string | null
  fulfilled_at: string | null
  created_at: string
  updated_at: string
  // Relations
  category?: Category
  requester?: Profile
  assignee?: Profile
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'incident' | 'change' | 'problem' | 'request' | 'system' | null
  reference_id: string | null
  read: boolean
  created_at: string
}

// Dashboard stats
export interface DashboardStats {
  incidents: { open: number; in_progress: number; resolved: number }
  changes: { pending: number; scheduled: number; completed: number }
  problems: { open: number; known_errors: number }
  requests: { submitted: number; in_progress: number }
  sla_breaches: number
}
