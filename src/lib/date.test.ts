import { ageAt, calendarDuration, countAnnualDates, countSaturdays, parseLocalDate } from './date'

describe('date calculations', () => {
  it('parses valid local dates and rejects impossible dates', () => {
    expect(parseLocalDate('2000-02-29')).not.toBeNull()
    expect(parseLocalDate('2001-02-29')).toBeNull()
  })

  it('changes age on the birthday', () => {
    const birth = parseLocalDate('2000-08-13') as Date
    expect(ageAt(birth, new Date(2026, 7, 12, 12)).years).toBe(25)
    expect(ageAt(birth, new Date(2026, 7, 13, 0)).years).toBe(26)
  })

  it('uses February 28 for leap-day birthdays in ordinary years', () => {
    const birth = parseLocalDate('2000-02-29') as Date
    const now = new Date(2025, 1, 27, 12)
    const end = new Date(2026, 2, 1)
    expect(countAnnualDates(now, end, 1, 29, birth)).toBe(2)
  })

  it('breaks an interval into calendar years, months and days', () => {
    expect(calendarDuration(new Date(2024, 0, 31), new Date(2025, 2, 2))).toEqual({ years: 1, months: 1, days: 2 })
  })

  it('does not count today when today is Saturday', () => {
    const now = new Date(2026, 7, 15, 12)
    expect(now.getDay()).toBe(6)
    expect(countSaturdays(now, new Date(2026, 7, 22, 23))).toBe(1)
  })
})
