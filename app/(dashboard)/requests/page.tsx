import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS } from '@/lib/constants'
import { Plus } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  submitted: 'default',
  in_progress: 'secondary',
  fulfilled: 'outline',
  cancelled: 'destructive',
}

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isStaff = profile && ['admin', 'manager', 'technician'].includes(profile.role)

  const query = supabase
    .from('service_requests')
    .select(`
      *,
      category:categories(name),
      requester:profiles!service_requests_requested_by_fkey(full_name),
      assignee:profiles!service_requests_assigned_to_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (!isStaff) query.eq('requested_by', user!.id)

  const { data: requests } = await query

  const pending = requests?.filter(r => ['submitted', 'in_progress'].includes(r.status)) ?? []
  const closed = requests?.filter(r => ['fulfilled', 'cancelled'].includes(r.status)) ?? []

  const RequestTable = ({ items }: { items: typeof requests }) => (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Ticket</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="w-28">Prioridad</TableHead>
            <TableHead className="w-32">Estado</TableHead>
            {isStaff && <TableHead className="w-36">Solicitante</TableHead>}
            <TableHead className="w-36">Asignado a</TableHead>
            <TableHead className="w-32">Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!items?.length && (
            <TableRow>
              <TableCell colSpan={isStaff ? 7 : 6} className="text-center text-muted-foreground py-10">
                No hay solicitudes en esta categoría
              </TableCell>
            </TableRow>
          )}
          {items?.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-mono text-xs">{req.ticket_number ?? '—'}</TableCell>
              <TableCell>
                <Link href={`/requests/${req.id}`} className="hover:underline font-medium">
                  {req.title}
                </Link>
                {req.category && (
                  <p className="text-xs text-muted-foreground">{req.category.name}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={['critical', 'high'].includes(req.priority) ? 'destructive' : 'secondary'}>
                  {PRIORITY_LABELS[req.priority as keyof typeof PRIORITY_LABELS]}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[req.status] ?? 'outline'}>
                  {REQUEST_STATUS_LABELS[req.status as keyof typeof REQUEST_STATUS_LABELS]}
                </Badge>
              </TableCell>
              {isStaff && (
                <TableCell className="text-sm text-muted-foreground">
                  {req.requester?.full_name ?? '—'}
                </TableCell>
              )}
              <TableCell className="text-sm text-muted-foreground">
                {req.assignee?.full_name ?? '—'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(req.created_at).toLocaleDateString('es-ES')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Solicitudes de Servicio</h1>
          <p className="text-sm text-muted-foreground">{requests?.length ?? 0} solicitudes en total</p>
        </div>
        <Button asChild>
          <Link href="/requests/new">
            <Plus className="h-4 w-4 mr-1" />
            Nueva Solicitud
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Activas <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 text-xs">{pending.length}</span>
          </TabsTrigger>
          <TabsTrigger value="closed">
            Cerradas <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{closed.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <RequestTable items={pending} />
        </TabsContent>
        <TabsContent value="closed" className="mt-4">
          <RequestTable items={closed} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
