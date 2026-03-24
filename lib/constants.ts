import type { PriorityLevel, IncidentStatus, ChangeStatus, ProblemStatus, RequestStatus, AssetStatus } from './types'

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export const PRIORITY_COLORS: Record<PriorityLevel, string> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
}

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'Abierto',
  in_progress: 'En Progreso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

export const CHANGE_STATUS_LABELS: Record<ChangeStatus, string> = {
  draft: 'Borrador',
  review: 'En Revisión',
  approved: 'Aprobado',
  scheduled: 'Programado',
  implementing: 'Implementando',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
}

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  open: 'Abierto',
  investigating: 'Investigando',
  known_error: 'Error Conocido',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Enviado',
  in_progress: 'En Progreso',
  fulfilled: 'Cumplido',
  cancelled: 'Cancelado',
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  retired: 'Retirado',
  disposed: 'Descartado',
}

export const CHANGE_TYPE_LABELS = {
  standard: 'Estándar',
  normal: 'Normal',
  emergency: 'Emergencia',
}
