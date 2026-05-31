'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('hapinkas_user_id')
    if (saved) {
      router.replace(`/user/${saved}`)
    } else {
      setChecking(false)
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const userId = String(Math.floor(1000 + Math.random() * 9000))
    localStorage.setItem('hapinkas_user_id', userId)
    localStorage.setItem('hapinkas_display_name', trimmed)
    router.push(`/user/${userId}`)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f6]">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f7f6] px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-light text-gray-800 mb-2 text-center">הפנקס של אייל</h1>
        <p className="text-sm text-gray-400 mb-10 text-center">יומן אימוני כושר</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <label className="block text-sm text-gray-500 mb-3">מה שמך?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הכנס שם..."
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-300 focus:outline-none focus:border-gray-400 text-base"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="mt-4 w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            המשך
          </button>
        </form>
      </div>
    </div>
  )
}
