'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createIncident(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const category_id = formData.get('category_id') as string || null
  const priority = formData.get('priority') as string
  const department_id = formData.get('department_id') as string || null

  const { data, error } = await supabase
    .from('incidents')
    .insert({ title, description, category_id, priority, department_id, reported_by: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/incidents')
  redirect(`/incidents/${data.id}`)
}

export async function updateIncidentStatus(id: string, status: string) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'resolved') updates.resolved_at = new Date().toISOString()
  if (status === 'closed') updates.closed_at = new Date().toISOString()

  const { error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
}

export async function assignIncident(id: string, assigned_to: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('incidents')
    .update({ assigned_to, status: 'in_progress' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
}

export async function addIncidentComment(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const content = formData.get('content') as string
  const is_internal = formData.get('is_internal') === 'true'

  if (!content?.trim()) return

  const { error } = await supabase
    .from('incident_comments')
    .insert({ incident_id: id, author_id: user.id, content: content.trim(), is_internal })

  if (error) throw new Error(error.message)
  revalidatePath(`/incidents/${id}`)
}
