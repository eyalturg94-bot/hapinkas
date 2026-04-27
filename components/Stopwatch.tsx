'use client'

import { useState, useEffect, useRef } from 'react'

export default function Stopwatch() {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef<number>(0)
  const baseRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (running) {
      startRef.current = Date.now()
      const tick = () => {
        setElapsed(baseRef.current + Date.now() - startRef.current)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(rafRef.current)
      if (elapsed > 0) baseRef.current = elapsed
    }
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const reset = () => {
    setRunning(false)
    setElapsed(0)
    baseRef.current = 0
  }

  const mins = Math.floor(elapsed / 60000)
  const secs = Math.floor((elapsed % 60000) / 1000)
  const ms = Math.floor((elapsed % 1000) / 10)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-mono text-xl text-gray-700 tabular-nums">
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}.{String(ms).padStart(2, '0')}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRunning(!running)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              running
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {running ? 'עצור' : 'התחל'}
          </button>
          <button
            onClick={reset}
            className="px-4 py-1.5 rounded-full text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            אפס
          </button>
        </div>
      </div>
    </div>
  )
}
