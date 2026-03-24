import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, GitPullRequest, Bug, ClipboardList, ShieldAlert, CheckCircle2 } from 'lucide-react'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [incidents, changes, problems, requests] = await Promise.all([
    supabase.from('incidents').select('status, sla_breach'),
    supabase.from('changes').select('status'),
    supabase.from('problems').select('status'),
    supabase.from('service_requests').select('status'),
  ])

  const inc = incidents.data ?? []
  const chg = changes.data ?? []
  const prb = problems.data ?? []
  const req = requests.data ?? []

  return {
    incidents: {
      open: inc.filter(i => i.status === 'open').length,
      in_progress: inc.filter(i => i.status === 'in_progress').length,
      resolved: inc.filter(i => i.status === 'resolved').length,
    },
    changes: {
      pending: chg.filter(c => ['draft', 'review'].includes(c.status)).length,
      scheduled: chg.filter(c => c.status === 'scheduled').length,
      completed: chg.filter(c => c.status === 'completed').length,
    },
    problems: {
      open: prb.filter(p => p.status === 'open').length,
      known_errors: prb.filter(p => p.status === 'known_error').length,
    },
    requests: {
      submitted: req.filter(r => r.status === 'submitted').length,
      in_progress: req.filter(r => r.status === 'in_progress').length,
    },
    sla_breaches: inc.filter(i => i.sla_breach).length,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const stats = await getStats(supabase)

  const summaryCards = [
    {
      title: 'Incidentes Abiertos',
      value: stats.incidents.open + stats.incidents.in_progress,
      sub: `${stats.incidents.in_progress} en progreso`,
      icon: AlertCircle,
      color: 'text-red-400',
    },
    {
      title: 'Cambios Pendientes',
      value: stats.changes.pending,
      sub: `${stats.changes.scheduled} programados`,
      icon: GitPullRequest,
      color: 'text-blue-400',
    },
    {
      title: 'Problemas Activos',
      value: stats.problems.open,
      sub: `${stats.problems.known_errors} errores conocidos`,
      icon: Bug,
      color: 'text-orange-400',
    },
    {
      title: 'Solicitudes',
      value: stats.requests.submitted + stats.requests.in_progress,
      sub: `${stats.requests.submitted} sin asignar`,
      icon: ClipboardList,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen operativo del departamento IT</p>
      </div>

      {stats.sla_breaches > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span><strong>{stats.sla_breaches}</strong> incidente(s) con SLA vencido requieren atención inmediata.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de Incidentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Abiertos', value: stats.incidents.open, variant: 'destructive' as const },
              { label: 'En Progreso', value: stats.incidents.in_progress, variant: 'secondary' as const },
              { label: 'Resueltos', value: stats.incidents.resolved, variant: 'outline' as const },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <Badge variant={row.variant}>{row.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de Cambios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Borrador / Revisión', value: stats.changes.pending, variant: 'secondary' as const },
              { label: 'Programados', value: stats.changes.scheduled, variant: 'outline' as const },
              { label: 'Completados', value: stats.changes.completed, variant: 'outline' as const },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <Badge variant={row.variant}>{row.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {stats.incidents.open === 0 && stats.changes.pending === 0 && stats.problems.open === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Sin incidentes, cambios ni problemas activos. ¡Todo en orden!</span>
        </div>
      )}
    </div>
  )
}
