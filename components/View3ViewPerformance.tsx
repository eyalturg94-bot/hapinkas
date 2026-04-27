'use client'

import { useState, useEffect, useCallback } from 'react'
import { Exercise, MeasurementType, measurementLabels } from '@/lib/supabase'
import { getSessions, deleteExercisePermanently } from '@/lib/db'
import { WorkoutSession } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface Props {
  userId: string
  exercises: Exercise[]
  onExercisesChanged: () => void
}

function calcY(type: MeasurementType, sets: number[]): number {
  return sets.reduce((a, b) => a + (b || 0), 0)
}

function formatDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function extraLabel(type: MeasurementType): string {
  if (type === 'duration_weight' || type === 'reps_weight') return 'ק"ג'
  if (type === 'reps_duration') return 'שנ\''
  return ''
}

function yAxisLabel(type: MeasurementType): string {
  if (type === 'duration_only' || type === 'duration_weight') return 'שניות'
  return 'חזרות'
}

interface ChartPoint {
  date: string
  y: number
  extra: number | null
}

const CustomDot = (props: {
  cx?: number; cy?: number; payload?: ChartPoint; extraSuffix: string
}) => {
  const { cx, cy, payload, extraSuffix } = props
  if (!cx || !cy || !payload) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#374151" />
      {payload.extra !== null && extraSuffix && (
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#9ca3af">
          {payload.extra}{extraSuffix}
        </text>
      )}
    </g>
  )
}

function ExerciseChart({ exercise }: { exercise: Exercise }) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessions(exercise.id).then((sessions: WorkoutSession[]) => {
      const points = sessions.map((s) => ({
        date: formatDate(s.session_date),
        y: calcY(exercise.measurement_type, s.sets_data),
        extra: s.extra_value ?? null,
      }))
      setData(points)
      setLoading(false)
    })
  }, [exercise])

  if (loading) return <div className="h-40 flex items-center justify-center"><div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" /></div>

  if (data.length === 0) return <p className="text-xs text-gray-400 text-center py-6">אין נתונים עדיין</p>

  const suffix = extraLabel(exercise.measurement_type)

  return (
    <div className="mt-3">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} unit="" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: 'none' }}
            formatter={(val, _, entry) => {
              const pt = (entry as { payload: ChartPoint }).payload
              const label = yAxisLabel(exercise.measurement_type)
              const v = Number(val)
              if (pt.extra !== null && suffix) return [`${v} ${label} · ${pt.extra}${suffix}`, '']
              return [`${v} ${label}`, '']
            }}
            labelStyle={{ color: '#6b7280' }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#374151"
            strokeWidth={2}
            dot={<CustomDot extraSuffix={suffix} />}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function View3ViewPerformance({ exercises, onExercisesChanged }: Props) {
  const [selectedLabel, setSelectedLabel] = useState('הכל')
  const [openId, setOpenId] = useState<string | null>(null)

  const allLabels = ['הכל', ...Array.from(new Set(exercises.flatMap((e) => e.labels)))]

  const filtered = selectedLabel === 'הכל'
    ? exercises
    : exercises.filter((e) => e.labels.includes(selectedLabel))

  const active = filtered.filter((e) => !e.deleted)
  const deleted = filtered.filter((e) => e.deleted)

  const handlePermanentDelete = async (ex: Exercise) => {
    if (!confirm(`למחוק לצמיתות את "${ex.name}" וכל ההיסטוריה שלו?`)) return
    await deleteExercisePermanently(ex.id)
    onExercisesChanged()
  }

  const ExerciseRow = ({ ex, faded }: { ex: Exercise; faded: boolean }) => {
    const isOpen = openId === ex.id
    return (
      <div className={`rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${faded ? 'opacity-40' : 'bg-white'}`}
        style={faded ? { backgroundColor: '#fff' } : {}}>
        <div
          className="flex items-center px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setOpenId(isOpen ? null : ex.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate">{ex.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{measurementLabels[ex.measurement_type]}</div>
            {ex.labels.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {ex.labels.map((l) => (
                  <span key={l} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{l}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mr-3">
            {faded && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(ex) }}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                title="מחק לצמיתות"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6" />
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
                </svg>
              </button>
            )}
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6,9 12,15 18,9" />
            </svg>
          </div>
        </div>
        {isOpen && (
          <div className="border-t border-gray-100 px-4 pb-4">
            <ExerciseChart exercise={ex} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="py-4">
      {/* Label filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {allLabels.map((l) => (
          <button
            key={l}
            onClick={() => setSelectedLabel(l)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs border transition-colors ${
              selectedLabel === l
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {active.map((ex) => <ExerciseRow key={ex.id} ex={ex} faded={false} />)}
        {deleted.length > 0 && (
          <>
            {active.length > 0 && <div className="border-t border-gray-100 my-3" />}
            <p className="text-xs text-gray-400 mb-2">תרגילים שנמחקו</p>
            {deleted.map((ex) => <ExerciseRow key={ex.id} ex={ex} faded />)}
          </>
        )}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-16">אין תרגילים להצגה.</p>
        )}
      </div>
    </div>
  )
}
