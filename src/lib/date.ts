const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseLocalDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const day = Number(dayText)
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

export function anniversaryInYear(birthDate: Date, year: number): Date {
  const month = birthDate.getMonth()
  const day = birthDate.getDate()
  const candidate = new Date(year, month, day)
  if (candidate.getMonth() === month) return candidate
  return new Date(year, 1, 28)
}

export function ageAt(birthDate: Date, now: Date): { years: number; exactYears: number } {
  let years = now.getFullYear() - birthDate.getFullYear()
  let lastBirthday = anniversaryInYear(birthDate, now.getFullYear())
  if (now < lastBirthday) {
    years -= 1
    lastBirthday = anniversaryInYear(birthDate, now.getFullYear() - 1)
  }
  const nextBirthday = anniversaryInYear(birthDate, lastBirthday.getFullYear() + 1)
  const fraction = (now.getTime() - lastBirthday.getTime()) / (nextBirthday.getTime() - lastBirthday.getTime())
  return { years, exactYears: years + Math.max(0, Math.min(1, fraction)) }
}

function clampedDate(year: number, month: number, day: number, template: Date): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(
    year,
    month,
    Math.min(day, lastDay),
    template.getHours(),
    template.getMinutes(),
    template.getSeconds(),
    template.getMilliseconds(),
  )
}

export function calendarDuration(start: Date, end: Date) {
  if (end <= start) return { years: 0, months: 0, days: 0 }
  let years = end.getFullYear() - start.getFullYear()
  let cursor = clampedDate(start.getFullYear() + years, start.getMonth(), start.getDate(), start)
  if (cursor > end) {
    years -= 1
    cursor = clampedDate(start.getFullYear() + years, start.getMonth(), start.getDate(), start)
  }

  let months = (end.getFullYear() - cursor.getFullYear()) * 12 + end.getMonth() - cursor.getMonth()
  let monthCursor = clampedDate(cursor.getFullYear(), cursor.getMonth() + months, cursor.getDate(), cursor)
  if (monthCursor > end) {
    months -= 1
    monthCursor = clampedDate(cursor.getFullYear(), cursor.getMonth() + months, cursor.getDate(), cursor)
  }
  const days = Math.floor((end.getTime() - monthCursor.getTime()) / 86_400_000)
  return { years, months, days: Math.max(0, days) }
}

export function countAnnualDates(
  now: Date,
  end: Date,
  month: number,
  day: number,
  birthDate?: Date,
): number {
  let count = 0
  for (let year = now.getFullYear(); year <= end.getFullYear(); year += 1) {
    const candidate = birthDate ? anniversaryInYear(birthDate, year) : new Date(year, month, day)
    if (candidate > now && candidate <= end) count += 1
  }
  return count
}

export function countSaturdays(now: Date, end: Date): number {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const daysUntilSaturday = (6 - candidate.getDay() + 7) % 7
  candidate.setDate(candidate.getDate() + daysUntilSaturday)
  if (candidate > end) return 0
  return Math.floor((end.getTime() - candidate.getTime()) / (7 * 86_400_000)) + 1
}
