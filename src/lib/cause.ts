import { causeTables, lifeTables } from '../data'
import type { CauseDraw, CauseWeight, StatisticalSex } from '../types'

export type RandomSource = () => number

export function causeAgeGroup(age: number): string {
  if (age <= 4) return `${Math.max(0, age)}歳`
  if (age >= 100) return '100歳以上'
  const start = Math.floor(age / 5) * 5
  return `${start}～${start + 4}歳`
}

function weightedPick<T>(items: T[], weightOf: (item: T) => number, random: RandomSource): T {
  const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0)
  if (total <= 0) throw new Error('抽選可能な統計データがありません。')
  let target = Math.min(0.999999999999, Math.max(0, random())) * total
  for (const item of items) {
    target -= Math.max(0, weightOf(item))
    if (target < 0) return item
  }
  return items.at(-1) as T
}

export function sampleDeathAge(sex: StatisticalSex, exactAge: number, random: RandomSource): number {
  const table = lifeTables[sex]
  const currentAge = Math.max(0, Math.min(table.length - 1, Math.floor(exactAge)))
  const currentFractionRemaining = currentAge >= table.length - 1 ? 1 : 1 - (exactAge - currentAge)
  const candidates = table.slice(currentAge).map((row, index) => ({
    age: row.age,
    weight: row.deaths * (index === 0 ? currentFractionRemaining : 1),
  }))
  return weightedPick(candidates, (candidate) => candidate.weight, random).age
}

export function drawCause(sex: StatisticalSex, exactAge: number, random: RandomSource = Math.random): CauseDraw {
  const deathAge = sampleDeathAge(sex, exactAge, random)
  const ageGroup = causeAgeGroup(deathAge)
  const causes: CauseWeight[] = causeTables[sex][ageGroup] ?? []
  const cause = weightedPick(causes, (entry) => entry.weight, random)
  return { deathAge, ageGroup, cause }
}
