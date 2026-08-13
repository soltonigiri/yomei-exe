import { lifeTables, timeUseTables } from '../data'
import type { LifeInput, LifeResult, LifeTableRow, StatisticalSex, TimeUseMinutes } from '../types'
import { ageAt, calendarDuration, countAnnualDates, countSaturdays, parseLocalDate } from './date'

export const MILLISECONDS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000

export class InputValidationError extends Error {}

export function totalTimeUse(minutes: TimeUseMinutes): number {
  return Object.values(minutes).reduce((sum, value) => sum + value, 0)
}

export function validateTimeUse(minutes: TimeUseMinutes): void {
  for (const value of Object.values(minutes)) {
    if (!Number.isFinite(value) || value < 0 || value > 1440) {
      throw new InputValidationError('生活時間は0～1,440分で入力してください。')
    }
  }
  if (totalTimeUse(minutes) > 1440) {
    throw new InputValidationError('生活時間の合計は1,440分以内にしてください。')
  }
}

export function timeUseAgeGroup(age: number): { group: string; approximate: boolean } {
  if (age < 15) return { group: '10-14', approximate: age < 10 }
  if (age < 25) return { group: '15-24', approximate: false }
  if (age < 35) return { group: '25-34', approximate: false }
  if (age < 45) return { group: '35-44', approximate: false }
  if (age < 55) return { group: '45-54', approximate: false }
  if (age < 65) return { group: '55-64', approximate: false }
  if (age < 75) return { group: '65-74', approximate: false }
  return { group: '75+', approximate: false }
}

export function defaultTimeUse(sex: StatisticalSex, age: number): { minutes: TimeUseMinutes; approximate: boolean } {
  const { group, approximate } = timeUseAgeGroup(age)
  const record = timeUseTables[sex].find((entry) => entry.ageGroup === group)
  if (!record) throw new Error(`生活時間区分がありません: ${sex} ${group}`)
  return { minutes: { ...record.minutes }, approximate }
}

export function interpolatedLifeExpectancy(table: LifeTableRow[], exactAge: number): number {
  if (exactAge >= table.length - 1) return table.at(-1)?.lifeExpectancyYears ?? 0
  const age = Math.max(0, Math.floor(exactAge))
  const fraction = Math.max(0, Math.min(1, exactAge - age))
  const current = table[age].lifeExpectancyYears
  const next = table[age + 1].lifeExpectancyYears
  return current + (next - current) * fraction
}

export function calculateLife(input: LifeInput, now = new Date()): LifeResult {
  const birthDate = parseLocalDate(input.birthDate)
  if (!birthDate) throw new InputValidationError('有効な生年月日を入力してください。')
  if (birthDate > now) throw new InputValidationError('未来の生年月日は入力できません。')
  validateTimeUse(input.timeUse)

  const { years: age, exactYears } = ageAt(birthDate, now)
  const expectancy = interpolatedLifeExpectancy(lifeTables[input.sex], exactYears)
  const remainingLifeMilliseconds = Math.max(0, expectancy * MILLISECONDS_PER_YEAR)
  const projectedEndAt = new Date(now.getTime() + remainingLifeMilliseconds)
  const freeTimeRatio = Math.max(0, (1440 - totalTimeUse(input.timeUse)) / 1440)
  const remainingFreeMilliseconds = remainingLifeMilliseconds * freeTimeRatio
  const ageMilliseconds = Math.max(0, now.getTime() - birthDate.getTime())
  const { approximate } = timeUseAgeGroup(age)
  const lastPublishedAge = lifeTables[input.sex].at(-1)?.age ?? age

  return {
    calculatedAt: new Date(now),
    projectedEndAt,
    age,
    exactAge: exactYears,
    remainingLifeMilliseconds,
    remainingLifeDuration: calendarDuration(now, projectedEndAt),
    remainingFreeMilliseconds,
    remainingFreeDuration: calendarDuration(now, new Date(now.getTime() + remainingFreeMilliseconds)),
    freeTimeRatio,
    lifeConsumedRatio: ageMilliseconds / (ageMilliseconds + remainingLifeMilliseconds),
    remainingBirthdays: countAnnualDates(now, projectedEndAt, birthDate.getMonth(), birthDate.getDate(), birthDate),
    remainingSummers: countAnnualDates(now, projectedEndAt, 6, 1),
    remainingSaturdays: countSaturdays(now, projectedEndAt),
    approximateTimeUse: approximate,
    approximateLifeTable: exactYears >= lastPublishedAge,
  }
}

export function remainingAt(result: LifeResult, now = new Date()) {
  const lifeMilliseconds = Math.max(0, result.projectedEndAt.getTime() - now.getTime())
  const elapsedMilliseconds = Math.max(0, now.getTime() - result.calculatedAt.getTime())
  const freeMilliseconds = Math.max(0, result.remainingFreeMilliseconds - elapsedMilliseconds)
  return {
    lifeMilliseconds,
    freeMilliseconds,
    lifeDuration: calendarDuration(now, new Date(now.getTime() + lifeMilliseconds)),
    freeDuration: calendarDuration(now, new Date(now.getTime() + freeMilliseconds)),
  }
}
