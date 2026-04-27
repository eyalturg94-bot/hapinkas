'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Exercise } from '@/lib/supabase'
import { getExercises } from '@/lib/db'
import View1AddExercise from '@/components/View1AddExercise'
import View2UpdatePerformance from '@/components/View2UpdatePerformance'
import View3ViewPerformance from '@/components/View3ViewPerformance'

type Tab = 'add' | 'update' | 'view'

export default function UserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [tab, setTab] = useState<Tab>('update')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('hapinkas_user_id')
    if (!saved) {
      router.replace('/')
    }
  }, [router])

  const loadExercises = useCallback(async () => {
    try {
      const data = await getExercises(userId)
      setExercises(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadExercises()
  }, [loadExercises])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'add', label: 'הוספת תרגיל' },
    { key: 'update', label: 'עדכון ביצועים' },
    { key: 'view', label: 'הצגת ביצועים' },
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-0">
          <h1 className="text-lg font-light text-gray-700 mb-3 text-center">הפנקס של {userId.replace(/\d{4}$/, '')}</h1>
          <div className="flex">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 text-sm transition-colors border-b-2 ${
                  tab === t.key
                    ? 'border-gray-700 text-gray-800 font-medium'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'add' && (
              <View1AddExercise userId={userId} onExerciseAdded={loadExercises} />
            )}
            {tab === 'update' && (
              <View2UpdatePerformance
                userId={userId}
                exercises={exercises}
                onExercisesChanged={loadExercises}
              />
            )}
            {tab === 'view' && (
              <View3ViewPerformance
                userId={userId}
                exercises={exercises}
                onExercisesChanged={loadExercises}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
