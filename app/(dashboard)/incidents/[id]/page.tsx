import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateIncidentStatus, assignIncident, addIncidentComment } from '@/lib/actions/incidents'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PRIORITY_LABELS, INCIDENT_STATUS_LABELS } from '@/lib/constants'
import { ArrowLeft, User, Calendar, Tag, Building2, AlertTriangle, MessageSquare, Lock } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  in_progress: 'secondary',
  resolved: 'outline',
  closed: 'outline',
  cancelled: 'destructive',
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isStaff = profile && ['admin', 'manager', 'technician'].includes(profile.role)

  const [{ data: incident }, { data: comments }, { data: technicians }] = await Promise.all([
    supabase
      .from('incidents')
      .select(`
        *,
        category:categories(name),
        department:departments(name),
        reporter:profiles!incidents_reported_by_fkey(full_name, email),
        assignee:profiles!incidents_assigned_to_fkey(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('incident_comments')
      .select(`*, author:profiles(full_name, role)`)
      .eq('incident_id', id)
      .order('created_at', { ascending: true }),
    isStaff
      ? supabase.from('profiles').select('id, full_name').in('role', ['admin', 'manager', 'technician']).order('full_name')
      : Promise.resolve({ data: [] }),
  ])

  if (!incident) notFound()

  const isClosed = ['resolved', 'closed', 'cancelled'].includes(incident.status)

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/incidents" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Incidentes
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{incident.ticket_number}</span>
            {incident.sla_breach && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                SLA Vencido
              </Badge>
            )}
            <Badge variant={STATUS_VARIANT[incident.status] ?? 'outline'}>
              {INCIDENT_STATUS_LABELS[incident.status as keyof typeof INCIDENT_STATUS_LABELS]}
            </Badge>
            <Badge variant={['critical', 'high'].includes(incident.priority) ? 'destructive' : 'secondary'}>
              {PRIORITY_LABELS[incident.priority as keyof typeof PRIORITY_LABELS]}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold">{incident.title}</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Descripción y comentarios */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descripción</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{incident.description}</p>
            </CardContent>
          </Card>

          {incident.resolution && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-base text-green-600 dark:text-green-400">Resolución</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{incident.resolution}</p>
              </CardContent>
            </Card>
          )}

          {/* Comentarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Actividad
                {comments?.length ? <span className="text-xs font-normal text-muted-foreground">({comments.length})</span> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!comments?.length && (
                <p className="text-sm text-muted-foreground text-center py-4">Sin comentarios aún</p>
              )}

              {comments?.map((comment) => (
                <div key={comment.id} className={`flex gap-3 ${comment.is_internal ? 'opacity-75' : ''}`}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {comment.author?.full_name?.slice(0, 2).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{comment.author?.full_name ?? '—'}</span>
                      {comment.is_internal && (
                        <Badge variant="outline" className="text-xs gap-1 h-4 px-1.5">
                          <Lock className="h-2.5 w-2.5" />
                          Interno
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(comment.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-md px-3 py-2">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}

              {!isClosed && (
                <>
                  <Separator />
                  <form className="space-y-2">
                    <Textarea
                      name="content"
                      placeholder="Escribe un comentario..."
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        formAction={async (fd) => {
                          'use server'
                          await addIncidentComment(id, fd)
                        }}
                        type="submit"
                      >
                        Comentar
                      </Button>
                      {isStaff && (
                        <Button
                          size="sm"
                          variant="outline"
                          type="submit"
                          formAction={async (fd) => {
                            'use server'
                            fd.set('is_internal', 'true')
                            await addIncidentComment(id, fd)
                          }}
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Nota interna
                        </Button>
                      )}
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar de detalles */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Reportado por</p>
                  <p className="text-foreground font-medium">{incident.reporter?.full_name ?? '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Asignado a</p>
                  <p className="text-foreground font-medium">{incident.assignee?.full_name ?? 'Sin asignar'}</p>
                </div>
              </div>

              {incident.department && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Departamento</p>
                    <p className="text-foreground">{incident.department.name}</p>
                  </div>
                </div>
              )}

              {incident.category && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <p className="text-foreground">{incident.category.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Creado</p>
                  <p className="text-foreground">
                    {new Date(incident.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {incident.resolved_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Resuelto</p>
                    <p className="text-foreground">
                      {new Date(incident.resolved_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones staff */}
          {isStaff && !isClosed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Cambiar estado</p>
                  <div className="flex flex-col gap-2">
                    <form action={updateIncidentStatus.bind(null, id, 'in_progress')}>
                      <Button size="sm" variant="outline" type="submit" className="w-full"
                        disabled={incident.status === 'in_progress'}>
                        En Progreso
                      </Button>
                    </form>
                    <form action={updateIncidentStatus.bind(null, id, 'resolved')}>
                      <Button size="sm" type="submit" className="w-full">
                        Marcar Resuelto
                      </Button>
                    </form>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Asignar a técnico</p>
                  <form className="flex gap-2">
                    <Select name="assignee">
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(technicians as { id: string; full_name: string }[])?.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      type="submit"
                      formAction={async (fd) => {
                        'use server'
                        const assignee = fd.get('assignee') as string
                        if (assignee) await assignIncident(id, assignee)
                      }}
                    >
                      Asignar
                    </Button>
                  </form>
                </div>

                <Separator />

                <form action={updateIncidentStatus.bind(null, id, 'cancelled')}>
                  <Button size="sm" variant="destructive" type="submit" className="w-full">
                    Cancelar Incidente
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
