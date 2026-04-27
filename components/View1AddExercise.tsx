'use client'

import { useState } from 'react'
import { MeasurementType, measurementLabels } from '@/lib/supabase'
import { createExercise } from '@/lib/db'
import { getLabelColor } from '@/lib/labelColor'

interface Props {
  userId: string
  onExerciseAdded: () => void
  existingLabels?: string[]
}

export default function View1AddExercise({ userId, onExerciseAdded, existingLabels = [] }: Props) {
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
              placeholder="הוסף לייבל חדש..."
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
          {existingLabels.filter((l) => !labels.includes(l)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {existingLabels.filter((l) => !labels.includes(l)).map((l) => {
                const c = getLabelColor(l)
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLabels([...labels, l])}
                    className={`${c.bg} ${c.text} border ${c.border} rounded-full px-2.5 py-0.5 text-xs transition-opacity hover:opacity-70`}
                  >
                    + {l}
                  </button>
                )
              })}
            </div>
          )}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labels.map((l, i) => {
                const c = getLabelColor(l)
                return (
                  <div key={i} className={`flex items-center gap-1 ${c.bg} border ${c.border} rounded-full px-3 py-1`}>
                    {editingIdx === i ? (
                      <>
                        <input
                          autoFocus
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          className={`w-20 text-xs bg-transparent focus:outline-none ${c.text}`}
                        />
                        <button type="button" onClick={saveEdit} className={`text-xs ${c.text} opacity-70 hover:opacity-100`}>✓</button>
                      </>
                    ) : (
                      <>
                        <span className={`text-xs ${c.text}`}>{l}</span>
                        <button type="button" onClick={() => startEdit(i)} className={`text-xs ${c.text} opacity-50 hover:opacity-100 mr-1`}>✏</button>
                        <button type="button" onClick={() => removeLabel(i)} className={`text-xs ${c.text} opacity-50 hover:text-red-400`}>×</button>
                      </>
                    )}
                  </div>
                )
              })}
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
