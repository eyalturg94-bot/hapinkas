'use client'

import { useState } from 'react'
import { MeasurementType, measurementLabels } from '@/lib/supabase'
import { createExercise } from '@/lib/db'

interface Props {
  userId: string
  onExerciseAdded: () => void
}

export default function View1AddExercise({ userId, onExerciseAdded }: Props) {
  const [name, setName] = useState('')
  const [measurementType, setMeasurementType] = useState<MeasurementType>('reps_only')
  const [setsCount, setSetsCount] = useState(3)
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const addLabel = () => {
    const t = newLabel.trim()
    if (!t || labels.includes(t)) return
    setLabels([...labels, t])
    setNewLabel('')
  }

  const removeLabel = (i: number) => setLabels(labels.filter((_, idx) => idx !== i))

  const startEdit = (i: number) => {
    setEditingIdx(i)
    setEditVal(labels[i])
  }

  const saveEdit = () => {
    if (editingIdx === null) return
    const t = editVal.trim()
    if (!t) return
    const updated = [...labels]
    updated[editingIdx] = t
    setLabels(updated)
    setEditingIdx(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createExercise(userId, name.trim(), measurementType, setsCount, labels)
      setName('')
      setMeasurementType('reps_only')
      setSetsCount(3)
      setLabels([])
      setSuccess(true)
      onExerciseAdded()
      setTimeout(() => setSuccess(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="py-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">שם תרגיל</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: דחיקת חזה..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">אופן מדידה</label>
          <div className="space-y-2">
            {(Object.entries(measurementLabels) as [MeasurementType, string][]).map(([val, label]) => (
              <label key={val} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="measurement"
                  value={val}
                  checked={measurementType === val}
                  onChange={() => setMeasurementType(val)}
                  className="accent-gray-700"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">מספר סטים</label>
          <input
            type="number"
            min={1}
            max={20}
            value={setsCount}
            onChange={(e) => setSetsCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 text-center focus:outline-none focus:border-gray-400"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">לייבלים</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLabel())}
              placeholder="הוסף לייבל..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400"
            />
            <button
              type="button"
              onClick={addLabel}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
            >
              הוסף
            </button>
          </div>
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labels.map((l, i) => (
                <div key={i} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                  {editingIdx === i ? (
                    <>
                      <input
                        autoFocus
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        className="w-20 text-xs bg-transparent focus:outline-none text-gray-700"
                      />
                      <button type="button" onClick={saveEdit} className="text-xs text-gray-500 hover:text-gray-700">✓</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-600">{l}</span>
                      <button type="button" onClick={() => startEdit(i)} className="text-xs text-gray-400 hover:text-gray-600 mr-1">✏</button>
                      <button type="button" onClick={() => removeLabel(i)} className="text-xs text-gray-400 hover:text-red-400">×</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'שומר...' : success ? '✓ נוסף בהצלחה' : 'הוסף תרגיל'}
        </button>
      </form>
    </div>
  )
}
