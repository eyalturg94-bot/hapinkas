import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type MeasurementType =
  | 'duration_only'
  | 'duration_weight'
  | 'reps_duration'
  | 'reps_only'
  | 'reps_weight'

export const measurementLabels: Record<MeasurementType, string> = {
  duration_only: 'משך זמן בלבד',
  duration_weight: 'משך זמן + משקל',
  reps_duration: 'מספר חזרות + משך זמן',
  reps_only: 'מספר חזרות בלבד',
  reps_weight: 'מספר חזרות + משקל',
}

export interface Exercise {
  id: string
  user_id: string
  name: string
  measurement_type: MeasurementType
  sets_count: number
  labels: string[]
  deleted: boolean
  created_at: string
}

export interface WorkoutSession {
  id: string
  exercise_id: string
  user_id: string
  session_date: string
  sets_data: number[]
  extra_value: number | null
  notes: string | null
  next_sets_data: number[]
  next_extra_value: number | null
  next_notes: string | null
  created_at: string
}
