import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateRequestStatus, assignRequest } from '@/lib/actions/requests'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS } from '@/lib/constants'
import { ArrowLeft, User, Calendar, Tag, ClipboardList } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  submitted: 'default',
  in_progress: 'secondary',
  fulfilled: 'outline',
  cancelled: 'destructive',
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isStaff = profile && ['admin', 'manager', 'technician'].includes(profile.role)

  const { data: request } = await supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(name),
      requester:profiles!service_requests_requested_by_fkey(full_name, email),
      assignee:profiles!service_requests_assigned_to_fkey(full_name)
    `)
    .eq('id', id)
    .single()

  if (!request) notFound()

  const { data: technicians } = isStaff
    ? await supabase.from('profiles').select('id, full_name').in('role', ['admin', 'manager', 'technician']).order('full_name')
    : { data: [] }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/requests">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Solicitudes
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{request.ticket_number ?? '—'}</span>
            <Badge variant={STATUS_VARIANT[request.status] ?? 'outline'}>
              {REQUEST_STATUS_LABELS[request.status as keyof typeof REQUEST_STATUS_LABELS]}
            </Badge>
            <Badge variant={['critical', 'high'].includes(request.priority) ? 'destructive' : 'secondary'}>
              {PRIORITY_LABELS[request.priority as keyof typeof PRIORITY_LABELS]}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold">{request.title}</h1>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Descripción */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Descripción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{request.description}</p>
          </CardContent>
        </Card>

        {/* Metadatos y acciones */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Solicitante</p>
                  <p className="text-foreground font-medium">{request.requester?.full_name ?? '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Asignado a</p>
                  <p className="text-foreground font-medium">{request.assignee?.full_name ?? 'Sin asignar'}</p>
                </div>
              </div>

              {request.category && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <p className="text-foreground">{request.category.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Creado</p>
                  <p className="text-foreground">
                    {new Date(request.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {request.fulfilled_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cumplido</p>
                    <p className="text-foreground">
                      {new Date(request.fulfilled_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones para staff */}
          {isStaff && !['fulfilled', 'cancelled'].includes(request.status) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Cambiar estado</p>
                  <form>
                    <Select name="status" defaultValue={request.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Enviado</SelectItem>
                        <SelectItem value="in_progress">En Progreso</SelectItem>
                        <SelectItem value="fulfilled">Cumplido</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </form>
                  <div className="flex gap-2">
                    <form action={updateRequestStatus.bind(null, id, 'in_progress')}>
                      <Button size="sm" variant="outline" type="submit"
                        disabled={request.status === 'in_progress'}>
                        En Progreso
                      </Button>
                    </form>
                    <form action={updateRequestStatus.bind(null, id, 'fulfilled')}>
                      <Button size="sm" type="submit">
                        Marcar Cumplido
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
                        {technicians?.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      formAction={async (fd) => {
                        'use server'
                        const assignee = fd.get('assignee') as string
                        if (assignee) await assignRequest(id, assignee)
                      }}
                      type="submit"
                    >
                      Asignar
                    </Button>
                  </form>
                </div>

                <Separator />

                <form action={updateRequestStatus.bind(null, id, 'cancelled')}>
                  <Button size="sm" variant="destructive" type="submit" className="w-full">
                    Cancelar Solicitud
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
