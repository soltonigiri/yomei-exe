import type { CalendarDuration } from '../types'

const integer = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 })

export function formatDuration(duration: CalendarDuration): string {
  return `${duration.years}年 ${duration.months}か月 ${duration.days}日`
}

export function formatSeconds(milliseconds: number): string {
  return integer.format(Math.max(0, Math.floor(milliseconds / 1000)))
}

export function formatPercent(ratio: number): string {
  return `${(Math.max(0, Math.min(1, ratio)) * 100).toFixed(1)}%`
}
