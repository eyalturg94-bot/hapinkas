import { supabase, Exercise, WorkoutSession, MeasurementType } from './supabase'

export async function getExercises(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true, nullsFirst: false })
  if (error) throw error
  const rows = data || []
  // If no positions set yet, assign them based on created_at order
  if (rows.some((e) => e.position === null)) {
    const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
    await Promise.all(sorted.map((e, i) =>
      supabase.from('exercises').update({ position: i }).eq('id', e.id)
    ))
    sorted.forEach((e, i) => { e.position = i })
    return sorted
  }
  return rows
}

export async function createExercise(
  userId: string,
  name: string,
  measurementType: MeasurementType,
  setsCount: number,
  labels: string[]
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: userId,
      name,
      measurement_type: measurementType,
      sets_count: setsCount,
      labels,
      deleted: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateExercise(
  id: string,
  updates: Partial<Pick<Exercise, 'name' | 'measurement_type' | 'sets_count' | 'labels' | 'deleted' | 'position'>>
): Promise<void> {
  const { error } = await supabase.from('exercises').update(updates).eq('id', id)
  if (error) throw error
}

export async function updateExercisePositions(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id, i) =>
    supabase.from('exercises').update({ position: i }).eq('id', id)
  ))
}

export async function deleteExercisePermanently(id: string): Promise<void> {
  await supabase.from('workout_sessions').delete().eq('exercise_id', id)
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw error
}

export async function getSessions(exerciseId: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('session_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getLatestSession(exerciseId: string): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('session_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertSession(
  exerciseId: string,
  userId: string,
  sessionDate: string,
  setsData: number[],
  extraValue: number | null,
  notes: string | null,
  nextSetsData: number[],
  nextExtraValue: number | null,
  nextNotes: string | null
): Promise<void> {
  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('exercise_id', exerciseId)
    .eq('session_date', sessionDate)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        sets_data: setsData,
        extra_value: extraValue,
        notes,
        next_sets_data: nextSetsData,
        next_extra_value: nextExtraValue,
        next_notes: nextNotes,
      })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('workout_sessions').insert({
      exercise_id: exerciseId,
      user_id: userId,
      session_date: sessionDate,
      sets_data: setsData,
      extra_value: extraValue,
      notes,
      next_sets_data: nextSetsData,
      next_extra_value: nextExtraValue,
      next_notes: nextNotes,
    })
    if (error) throw error
  }
}
