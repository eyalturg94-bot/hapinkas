const LABEL_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', activeBg: 'bg-blue-100', activeText: 'text-blue-700', activeBorder: 'border-blue-400' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBg: 'bg-emerald-100', activeText: 'text-emerald-700', activeBorder: 'border-emerald-400' },
  { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', activeBg: 'bg-violet-100', activeText: 'text-violet-700', activeBorder: 'border-violet-400' },
  { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeBg: 'bg-amber-100', activeText: 'text-amber-700', activeBorder: 'border-amber-400' },
  { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', activeBg: 'bg-pink-100', activeText: 'text-pink-700', activeBorder: 'border-pink-400' },
  { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', activeBg: 'bg-teal-100', activeText: 'text-teal-700', activeBorder: 'border-teal-400' },
  { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', activeBg: 'bg-indigo-100', activeText: 'text-indigo-700', activeBorder: 'border-indigo-400' },
  { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', activeBg: 'bg-rose-100', activeText: 'text-rose-700', activeBorder: 'border-rose-400' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', activeBg: 'bg-cyan-100', activeText: 'text-cyan-700', activeBorder: 'border-cyan-400' },
  { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', activeBg: 'bg-orange-100', activeText: 'text-orange-700', activeBorder: 'border-orange-400' },
]

export type LabelColor = (typeof LABEL_COLORS)[number]

export function getLabelColor(label: string): LabelColor {
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) & 0xffff
  }
  return LABEL_COLORS[hash % LABEL_COLORS.length]
}
