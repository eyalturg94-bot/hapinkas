'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

const formatDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function ExerciseOverlayCard({ ex }: { ex: Exercise }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl opacity-95 rotate-1">
      <div className="flex items-center px-4 py-3.5 gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 shrink-0">
          <circle cx="9" cy="7" r="1.5" /><circle cx="15" cy="7" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="17" r="1.5" /><circle cx="15" cy="17" r="1.5" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{ex.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {measurementLabels[ex.measurement_type]} · {ex.sets_count} סטים
          </div>
          {ex.labels.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {ex.labels.map((l) => {
                const c = getLabelColor(l)
                return <span key={l} className={`text-[10px] ${c.bg} ${c.text} rounded-full px-2 py-0.5`}>{l}</span>
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface RowProps {
  ex: Exercise
  isOpen: boolean
  isDragActive: boolean
  sess?: SessionData
  editingId: string | null
  editName: string
  editSets: number
  editLabels: string[]
  newLabelVal: string
  allLabels: string[]
  onToggleOpen: () => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onUpdateSession: (patch: Partial<SessionData>) => void
  setEditName: (v: string) => void
  setEditSets: (v: number) => void
  setEditLabels: (v: string[]) => void
  setNewLabelVal: (v: string) => void
}

function SortableExerciseRow({
  ex, isOpen, isDragActive, sess, editingId,
  editName, editSets, editLabels, newLabelVal, allLabels,
  onToggleOpen, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  onUpdateSession, setEditName, setEditSets, setEditLabels, setNewLabelVal,
}: RowProps) {
  const isEditing = editingId === ex.id

  const { setNodeRef, transform, transition, isDragging, listeners, attributes } = useSortable({
    id: ex.id,
    disabled: isEditing,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${
        isDragging ? 'opacity-25 shadow-none' : ''
      }`}
    >
      {isEditing ? (
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
            <button onClick={onCancelEdit} className="px-4 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">ביטול</button>
            <button onClick={onSaveEdit} className="px-4 py-1.5 text-xs bg-gray-800 text-white rounded-lg hover:bg-gray-700">שמור</button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="flex items-center px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors select-none"
            onClick={onToggleOpen}
            {...attributes}
          >
            {/* Drag zone covers the text/labels area */}
            <div
              className="flex-1 min-w-0"
              style={{ touchAction: 'none' }}
              {...listeners}
            >
              <div className="text-sm font-medium text-gray-800 truncate">{ex.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {measurementLabels[ex.measurement_type]} · {ex.sets_count} סטים
              </div>
              {ex.labels.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {ex.labels.map((l) => {
                    const c = getLabelColor(l)
                    return <span key={l} className={`text-[10px] ${c.bg} ${c.text} rounded-full px-2 py-0.5`}>{l}</span>
                  })}
                </div>
              )}
            </div>
            {/* Action buttons - outside drag zone */}
            <div className="flex items-center gap-2 mr-3">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onStartEdit() }}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="ערוך"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); if (confirm(`למחוק את "${ex.name}"?`)) onDelete() }}
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

          {isOpen && sess && !isDragActive && (
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
                  onChange={(e) => onUpdateSession({ nextNotes: e.target.value })}
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
                  onChange={(setsData, extraValue) => onUpdateSession({ setsData, extraValue })}
                />
                <textarea
                  value={sess.notes}
                  onChange={(e) => onUpdateSession({ notes: e.target.value })}
                  placeholder="הערות לאימון..."
                  rows={2}
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 placeholder-gray-300 focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function View2UpdatePerformance({ userId, exercises, onExercisesChanged }: Props) {
  const [selectedLabel, setSelectedLabel] = useState<string>('הכל')
  const [openId, setOpenId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Record<string, SessionData>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSets, setEditSets] = useState(1)
  const [editLabels, setEditLabels] = useState<string[]>([])
  const [newLabelVal, setNewLabelVal] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 500,
        tolerance: 5,
      },
    })
  )

  const active = exercises.filter((e) => !e.deleted)
  const allLabels = ['הכל', ...Array.from(new Set(active.flatMap((e) => e.labels)))]

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
    setOpenId(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const oldIndex = orderedFiltered.findIndex((e) => e.id === active.id)
    const newIndex = orderedFiltered.findIndex((e) => e.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newFiltered = arrayMove(orderedFiltered, oldIndex, newIndex)
    const filteredSet = new Set(orderedFiltered.map((e) => e.id))
    const nonFilteredIds = orderedIds.filter((id) => !filteredSet.has(id))
    const merged = [...nonFilteredIds, ...newFiltered.map((e) => e.id)]

    setOrderedIds(merged)
    await updateExercisePositions(merged)
  }

  const activeExercise = activeId ? active.find((e) => e.id === activeId) : null

  return (
    <div className="py-4 pb-24">
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={orderedFiltered.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedFiltered.map((ex) => (
              <SortableExerciseRow
                key={ex.id}
                ex={ex}
                isOpen={openId === ex.id}
                isDragActive={activeId !== null}
                sess={sessions[ex.id]}
                editingId={editingId}
                editName={editName}
                editSets={editSets}
                editLabels={editLabels}
                newLabelVal={newLabelVal}
                allLabels={allLabels}
                onToggleOpen={() => { if (!activeId) setOpenId(openId === ex.id ? null : ex.id) }}
                onStartEdit={() => startEdit(ex)}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => handleDelete(ex.id)}
                onUpdateSession={(patch) => updateSession(ex.id, patch)}
                setEditName={setEditName}
                setEditSets={setEditSets}
                setEditLabels={setEditLabels}
                setNewLabelVal={setNewLabelVal}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeExercise ? <ExerciseOverlayCard ex={activeExercise} /> : null}
        </DragOverlay>
      </DndContext>

      <Stopwatch />
    </div>
  )
}
