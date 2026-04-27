'use client'

import { MeasurementType } from '@/lib/supabase'

interface Props {
  measurementType: MeasurementType
  setsCount: number
  setsData: (number | string)[]
  extraValue: number | string
  onChange: (setsData: (number | string)[], extraValue: number | string) => void
  readOnly?: boolean
}

function setsLabel(type: MeasurementType): string {
  if (type === 'duration_only' || type === 'duration_weight') return 'זמן (שנ\')'
  return 'חזרות'
}

function extraLabel(type: MeasurementType): string {
  if (type === 'duration_weight' || type === 'reps_weight') return 'משקל (ק"ג)'
  if (type === 'reps_duration') return 'זמן כולל (שנ\')'
  return ''
}

function hasExtra(type: MeasurementType): boolean {
  return type !== 'duration_only' && type !== 'reps_only'
}

export default function SetInputs({ measurementType, setsCount, setsData, extraValue, onChange, readOnly }: Props) {
  const sets = Array.from({ length: setsCount }, (_, i) => setsData[i] ?? '')

  const updateSet = (i: number, val: string) => {
    const updated = [...sets]
    updated[i] = val
    onChange(updated, extraValue)
  }

  const updateExtra = (val: string) => {
    onChange(sets, val)
  }

  const inputClass = `w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center text-gray-700 focus:outline-none focus:border-gray-400 ${readOnly ? 'bg-gray-50 text-gray-500' : 'bg-white'}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-400 ml-1">{setsLabel(measurementType)}:</span>
      {sets.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-gray-300">סט {i + 1}</span>
          <input
            type="number"
            value={v}
            onChange={(e) => updateSet(i, e.target.value)}
            readOnly={readOnly}
            className={inputClass}
          />
        </div>
      ))}
      {hasExtra(measurementType) && (
        <div className="flex flex-col items-center gap-0.5 mr-2 border-r border-gray-200 pr-3">
          <span className="text-[10px] text-gray-300">{extraLabel(measurementType)}</span>
          <input
            type="number"
            value={extraValue}
            onChange={(e) => updateExtra(e.target.value)}
            readOnly={readOnly}
            className={inputClass}
          />
        </div>
      )}
    </div>
  )
}
