'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createServiceRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const category_id = formData.get('category_id') as string || null
  const priority = formData.get('priority') as string

  const { data, error } = await supabase
    .from('service_requests')
    .insert({ title, description, category_id, priority, requested_by: user.id })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/requests')
  redirect(`/requests/${data.id}`)
}

export async function updateRequestStatus(id: string, status: string) {
  const supabase = await createClient()

  const updates: Record<string, unknown> = { status }
  if (status === 'fulfilled') updates.fulfilled_at = new Date().toISOString()

  const { error } = await supabase
    .from('service_requests')
    .update(updates)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/requests/${id}`)
  revalidatePath('/requests')
}

export async function assignRequest(id: string, assigned_to: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('service_requests')
    .update({ assigned_to, status: 'in_progress' })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/requests/${id}`)
  revalidatePath('/requests')
}
