export type StatisticalSex = 'male' | 'female'

export type TimeUseKey =
  | 'sleep'
  | 'meals'
  | 'personalCare'
  | 'workSchool'
  | 'commuting'
  | 'housework'
  | 'care'
  | 'shoppingOther'

export type TimeUseMinutes = Record<TimeUseKey, number>

export interface LifeInput {
  birthDate: string
  sex: StatisticalSex
  timeUse: TimeUseMinutes
}

export interface LifeTableRow {
  age: number
  mortalityRate: number
  survivors: number
  deaths: number
  lifeExpectancyYears: number
}

export interface CalendarDuration {
  years: number
  months: number
  days: number
}

export interface LifeResult {
  calculatedAt: Date
  projectedEndAt: Date
  age: number
  exactAge: number
  remainingLifeMilliseconds: number
  remainingLifeDuration: CalendarDuration
  remainingFreeMilliseconds: number
  remainingFreeDuration: CalendarDuration
  freeTimeRatio: number
  lifeConsumedRatio: number
  remainingBirthdays: number
  remainingSummers: number
  remainingSaturdays: number
  approximateTimeUse: boolean
  approximateLifeTable: boolean
}

export interface CauseWeight {
  code: string
  label: string
  weight: number
}

export interface CauseDraw {
  deathAge: number
  ageGroup: string
  cause: CauseWeight
}
