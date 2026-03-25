import { createClient } from '@/lib/supabase/server'
import { createIncident } from '@/lib/actions/incidents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewIncidentPage() {
  const supabase = await createClient()
  const [{ data: categories }, { data: departments }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('type', 'incident').order('name'),
    supabase.from('departments').select('id, name').eq('active', true).order('name'),
  ])

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/incidents" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Incidente</CardTitle>
          <CardDescription>
            Registra un incidente para que el equipo de IT lo atienda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createIncident} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ej: No puedo acceder a mi correo electrónico"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department_id">Departamento</Label>
                <Select name="department_id">
                  <SelectTrigger id="department_id">
                    <SelectValue placeholder="Selecciona departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(dep => (
                      <SelectItem key={dep.id} value={dep.id}>{dep.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category_id">Categoría</Label>
                <Select name="category_id">
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority">Prioridad *</Label>
              <Select name="priority" defaultValue="medium" required>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja — Sin impacto en operaciones</SelectItem>
                  <SelectItem value="medium">Media — Impacto parcial</SelectItem>
                  <SelectItem value="high">Alta — Impacto significativo</SelectItem>
                  <SelectItem value="critical">Crítica — Servicio caído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe el problema con detalle: qué pasó, cuándo empezó, qué intentaste..."
                rows={5}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Registrar Incidente</Button>
              <Button variant="outline" render={<Link href="/incidents" />}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
