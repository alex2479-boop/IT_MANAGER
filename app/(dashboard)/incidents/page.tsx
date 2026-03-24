import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PRIORITY_LABELS, INCIDENT_STATUS_LABELS } from '@/lib/constants'
import { Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { Incident } from '@/lib/types'

export default async function IncidentsPage() {
  const supabase = await createClient()
  const { data: incidents } = await supabase
    .from('incidents')
    .select(`
      *,
      category:categories(name),
      reporter:profiles!incidents_reported_by_fkey(full_name),
      assignee:profiles!incidents_assigned_to_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Incidentes</h1>
          <p className="text-sm text-muted-foreground">{incidents?.length ?? 0} registros encontrados</p>
        </div>
        <Button asChild>
          <Link href="/incidents/new">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Incidente
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Ticket</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-28">Prioridad</TableHead>
              <TableHead className="w-32">Estado</TableHead>
              <TableHead className="w-36">Asignado a</TableHead>
              <TableHead className="w-36">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!incidents?.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No hay incidentes registrados
                </TableCell>
              </TableRow>
            )}
            {incidents?.map((incident: Incident & { category?: { name: string }, reporter?: { full_name: string }, assignee?: { full_name: string } }) => (
              <TableRow key={incident.id} className={incident.sla_breach ? 'bg-destructive/5' : ''}>
                <TableCell className="font-mono text-xs">
                  <div className="flex items-center gap-1">
                    {incident.sla_breach && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                    {incident.ticket_number}
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/incidents/${incident.id}`} className="hover:underline font-medium">
                    {incident.title}
                  </Link>
                  {incident.category && (
                    <p className="text-xs text-muted-foreground">{incident.category.name}</p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={['critical', 'high'].includes(incident.priority) ? 'destructive' : 'secondary'}>
                    {PRIORITY_LABELS[incident.priority]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{INCIDENT_STATUS_LABELS[incident.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {incident.assignee?.full_name ?? '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(incident.created_at).toLocaleDateString('es-ES')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
