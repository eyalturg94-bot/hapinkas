'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Exercise, measurementLabels } from '@/lib/supabase'
import { updateExercise, getSessions, upsertSession, updateExercisePositions } from '@/lib/db'
import { getLabelColor } from '@/lib/labelColor'
import SetInputs from './SetInputs'
import Stopwatch from './Stopwatch'

interface Props {
  userId: string
  exercises: Exercise[]
  onExercisesChanged: () => void
}

const today = () => new Date().toISOString().split('T')[0]

type SessionData = {
  setsData: (number | string)[]
  extraValue: number | string
  notes: string
  nextNotes: string
  prevSetsData: (number | string)[] | null
  prevExtraValue: number | string | null
  prevNotes: string | null
  prevDate: string | null
}

const LONG_PRESS_MS = 500

export default function View2UpdatePerformance({ userId, exercises, onExercisesChanged }: Props) {
  const [selectedLabel, setSelectedLabel] = useState<string>('הכל')
  const [openId, setOpenId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Record<string, SessionData>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSets, setEditSets] = useState(1)
  const [editLabels, setEditLabels] = useState<string[]>([])
  const [newLabelVal, setNewLabelVal] = useState('')
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Drag state
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)

  const active = exercises.filter((e) => !e.deleted)
  const allLabels = ['הכל', ...Array.from(new Set(active.flatMap((e) => e.labels)))]

  // Keep orderedIds in sync with active exercises
  useEffect(() => {
    const sorted = [...active].sort((a, b) => (a.position ?? 9999) - (b.position ?? 9999))
    setOrderedIds(sorted.map((e) => e.id))
  }, [exercises]) // eslint-disable-line react-hooks/exhaustive-deps

  const orderedFiltered = orderedIds
    .map((id) => active.find((e) => e.id === id))
    .filter((e): e is Exercise => !!e && (selectedLabel === 'הכל' || e.labels.includes(selectedLabel)))

  const loadSession = useCallback(async (exercise: Exercise) => {
    const all = await getSessions(exercise.id)
    const todayStr = today()
    const todaySession = all.find((s) => s.session_date === todayStr)
    const prevSession = all.filter((s) => s.session_date !== todayStr).slice(-1)[0] || null
    const empty = Array(exercise.sets_count).fill('')
    setSessions((prev) => ({
      ...prev,
      [exercise.id]: {
        setsData: todaySession?.sets_data?.map(String) ?? empty,
        extraValue: todaySession?.extra_value ?? '',
        notes: todaySession?.notes ?? '',
        nextNotes: todaySession?.next_notes ?? '',
        prevSetsData: prevSession?.sets_data?.map(String) ?? null,
        prevExtraValue: prevSession?.extra_value ?? null,
        prevNotes: prevSession?.next_notes ?? null,
        prevDate: prevSession?.session_date ?? null,
      },
    }))
  }, [])

  useEffect(() => {
    if (openId) {
      const ex = exercises.find((e) => e.id === openId)
      if (ex) loadSession(ex)
    }
  }, [openId, exercises, loadSession])

  const scheduleSave = (exerciseId: string, data: SessionData) => {
    if (saveTimer.current[exerciseId]) clearTimeout(saveTimer.current[exerciseId])
    saveTimer.current[exerciseId] = setTimeout(async () => {
      const exercise = exercises.find((e) => e.id === exerciseId)
      if (!exercise) return
      const toNum = (v: number | string) => (v === '' ? null : Number(v))
      await upsertSession(
        exerciseId, userId, today(),
        data.setsData.map((v) => Number(v) || 0),
        toNum(data.extraValue),
        data.notes || null,
        [], null,
        data.nextNotes || null
      )
    }, 600)
  }

  const updateSession = (exerciseId: string, patch: Partial<SessionData>) => {
    setSessions((prev) => {
      const updated = { ...prev[exerciseId], ...patch }
      scheduleSave(exerciseId, updated)
      return { ...prev, [exerciseId]: updated }
    })
  }

  const handleDelete = async (id: string) => {
    await updateExercise(id, { deleted: true })
    onExercisesChanged()
  }

  const startEdit = (ex: Exercise) => {
    setEditingId(ex.id)
    setEditName(ex.name)
    setEditSets(ex.sets_count)
    setEditLabels([...ex.labels])
  }

  const saveEdit = async () => {
    if (!editingId) return
    await updateExercise(editingId, { name: editName, sets_count: editSets, labels: editLabels })
    setEditingId(null)
    onExercisesChanged()
  }

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  // --- Drag logic ---
  const getIndexAtY = (clientY: number): number => {
    let best = orderedFiltered.length - 1
    for (let i = 0; i < orderedFiltered.length; i++) {
      const el = itemRefs.current[orderedFiltered[i].id]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) { best = i; break }
    }
    return best
  }

  const reorderedList = (() => {
    if (draggingId === null || dragOverIndex === null) return orderedFiltered
    const list = [...orderedFiltered]
    const fromIndex = list.findIndex((e) => e.id === draggingId)
    if (fromIndex === -1) return list
    const [item] = list.splice(fromIndex, 1)
    list.splice(dragOverIndex, 0, item)
    return list
  })()

  const handleLongPressStart = (exId: string, clientY: number) => {
    if (editingId) return
    longPressTimer.current = setTimeout(() => {
      setDraggingId(exId)
      setDragOverIndex(orderedFiltered.findIndex((e) => e.id === exId))
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggingId) return
    e.preventDefault()
    const idx = getIndexAtY(e.clientY)
    setDragOverIndex(idx)
  }, [draggingId, orderedFiltered]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePointerUp = useCallback(async () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    if (!draggingId || dragOverIndex === null) { setDraggingId(null); return }

    const newOrder = reorderedList.map((e) => e.id)
    // Build full orderedIds with the new filtered order merged in
    const filteredIds = new Set(orderedFiltered.map((e) => e.id))
    const base = orderedIds.filter((id) => !filteredIds.has(id))
    // Insert filtered items back in their positions (simplified: append after non-filtered)
    const merged = [...base, ...newOrder]
    setOrderedIds(merged)
    setDraggingId(null)
    setDragOverIndex(null)
    await updateExercisePositions(merged)
  }, [draggingId, dragOverIndex, reorderedList, orderedFiltered, orderedIds])

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('pointermove', handlePointerMove, { passive: false })
      window.addEventListener('pointerup', handlePointerUp)
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingId, handlePointerMove, handlePointerUp])

  return (
    <div className="py-4 pb-24" ref={containerRef}>
      {/* Label filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {allLabels.map((l) => {
          const isAll = l === 'הכל'
          const isActive = selectedLabel === l
          let cls = 'shrink-0 px-4 py-1.5 rounded-full text-xs border transition-colors '
          if (isAll) {
            cls += isActive ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          } else {
            const c = getLabelColor(l)
            cls += isActive ? `${c.activeBg} ${c.activeText} ${c.activeBorder} font-medium` : `${c.bg} ${c.text} ${c.border}`
          }
          return (
            <button key={l} onClick={() => setSelectedLabel(l)} className={cls}>{l}</button>
          )
        })}
      </div>

      {orderedFiltered.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-16">אין תרגילים. הוסף תרגיל חדש בלשונית "הוספת תרגיל".</p>
      )}

      <div className="space-y-2">
        {reorderedList.map((ex, idx) => {
          const isOpen = openId === ex.id
          const sess = sessions[ex.id]
          const isDragging = draggingId === ex.id

          return (
            <div
              key={ex.id}
              ref={(el) => { itemRefs.current[ex.id] = el }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
              style={{
                opacity: isDragging ? 0.5 : 1,
                boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
                transform: isDragging ? 'scale(1.01)' : undefined,
              }}
            >
              {editingId === ex.id ? (
                <div className="p-4 space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-gray-400">סטים:</label>
                    <input
                      type="number" min={1} max={20} value={editSets}
                      onChange={(e) => setEditSets(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex gap-2 mb-2">
                      <input
                        value={newLabelVal}
                        onChange={(e) => setNewLabelVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const t = newLabelVal.trim()
                            if (t && !editLabels.includes(t)) { setEditLabels([...editLabels, t]); setNewLabelVal('') }
                          }
                        }}
                        placeholder="לייבל חדש..."
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = newLabelVal.trim()
                          if (t && !editLabels.includes(t)) { setEditLabels([...editLabels, t]); setNewLabelVal('') }
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
                      >הוסף</button>
                    </div>
                    {allLabels.slice(1).filter((l) => !editLabels.includes(l)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {allLabels.slice(1).filter((l) => !editLabels.includes(l)).map((l) => {
                          const c = getLabelColor(l)
                          return (
                            <button key={l} type="button" onClick={() => setEditLabels([...editLabels, l])}
                              className={`${c.bg} ${c.text} border ${c.border} rounded-full px-2.5 py-0.5 text-xs transition-opacity hover:opacity-70`}>
                              + {l}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {editLabels.map((l, i) => {
                        const c = getLabelColor(l)
                        return (
                          <span key={i} className={`flex items-center gap-1 ${c.bg} border ${c.border} rounded-full px-2.5 py-0.5 text-xs ${c.text}`}>
                            {l}
                            <button onClick={() => setEditLabels(editLabels.filter((_, idx) => idx !== i))} className="opacity-50 hover:text-red-400">×</button>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">ביטול</button>
                    <button onClick={saveEdit} className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700">שמור</button>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => { if (!draggingId) setOpenId(isOpen ? null : ex.id) }}
                  onPointerDown={(e) => {
                    longPressTimer.current && clearTimeout(longPressTimer.current)
                    handleLongPressStart(ex.id, e.clientY)
                  }}
                  onPointerUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                  onPointerCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
                >
                  {/* Drag handle hint when dragging */}
                  {draggingId && (
                    <div className="mr-2 text-gray-300">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
                        <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                        <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{ex.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{measurementLabels[ex.measurement_type]} · {ex.sets_count} סטים</div>
                    {ex.labels.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {ex.labels.map((l) => {
                          const c = getLabelColor(l)
                          return <span key={l} className={`text-[10px] ${c.bg} ${c.text} rounded-full px-2 py-0.5`}>{l}</span>
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mr-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(ex) }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title="ערוך"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm(`למחוק את "${ex.name}"?`)) handleDelete(ex.id) }}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      title="מחק"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
                      </svg>
                    </button>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </div>
                </div>
              )}

              {isOpen && sess && !draggingId && (
                <div className="border-t border-gray-100">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-400 mb-2">האימון הקודם</div>
                    {sess.prevSetsData ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-400">{formatDate(sess.prevDate!)}</div>
                        <SetInputs
                          measurementType={ex.measurement_type}
                          setsCount={ex.sets_count}
                          setsData={sess.prevSetsData}
                          extraValue={sess.prevExtraValue ?? ''}
                          onChange={() => {}}
                          readOnly
                        />
                        {sess.prevNotes && <p className="text-xs text-gray-400 mt-1 italic">{sess.prevNotes}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">יופיעו פה נתונים החל מהאימון הבא</p>
                    )}
                    <textarea
                      value={sess.nextNotes}
                      onChange={(e) => updateSession(ex.id, { nextNotes: e.target.value })}
                      placeholder="הערות לאימון הזה..."
                      rows={2}
                      className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 resize-none"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-gray-600">ביצועים נוכחיים</div>
                      <div className="text-xs text-gray-400">{formatDate(today())}</div>
                    </div>
                    <SetInputs
                      measurementType={ex.measurement_type}
                      setsCount={ex.sets_count}
                      setsData={sess.setsData}
                      extraValue={sess.extraValue}
                      onChange={(setsData, extraValue) => updateSession(ex.id, { setsData, extraValue })}
                    />
                    <textarea
                      value={sess.notes}
                      onChange={(e) => updateSession(ex.id, { notes: e.target.value })}
                      placeholder="הערות לאימון..."
                      rows={2}
                      className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Stopwatch />
    </div>
  )
}
