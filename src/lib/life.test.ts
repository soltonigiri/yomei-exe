import { calculateLife, defaultTimeUse, interpolatedLifeExpectancy, remainingAt, totalTimeUse, validateTimeUse } from './life'
import { lifeTables } from '../data'
import type { TimeUseMinutes } from '../types'

const zeroTime: TimeUseMinutes = {
  sleep: 0,
  meals: 0,
  personalCare: 0,
  workSchool: 0,
  commuting: 0,
  housework: 0,
  care: 0,
  shoppingOther: 0,
}

describe('life calculations', () => {
  it('matches source life expectancy at exact ages and interpolates within bounds', () => {
    expect(interpolatedLifeExpectancy(lifeTables.male, 40)).toBe(42.03)
    const halfway = interpolatedLifeExpectancy(lifeTables.male, 40.5)
    expect(halfway).toBeLessThan(42.03)
    expect(halfway).toBeGreaterThan(41.07)
  })

  it('uses the final public row above age 105', () => {
    expect(interpolatedLifeExpectancy(lifeTables.female, 120)).toBe(lifeTables.female[105].lifeExpectancyYears)
  })

  it('marks results above the final public age as approximate', () => {
    const result = calculateLife(
      { birthDate: '1900-01-01', sex: 'female', timeUse: zeroTime },
      new Date(2026, 0, 1),
    )
    expect(result.approximateLifeTable).toBe(true)
  })

  it('accepts zero and 1440 minutes but rejects larger totals', () => {
    expect(() => validateTimeUse(zeroTime)).not.toThrow()
    expect(() => validateTimeUse({ ...zeroTime, sleep: 1440 })).not.toThrow()
    expect(() => validateTimeUse({ ...zeroTime, sleep: 1440, meals: 1 })).toThrow()
  })

  it('returns source-derived time use and marks under ten as approximate', () => {
    const result = defaultTimeUse('male', 8)
    expect(result.approximate).toBe(true)
    expect(totalTimeUse(result.minutes)).toBeLessThanOrEqual(1440)
  })

  it('decrements free time by one second per elapsed second', () => {
    const calculatedAt = new Date(2026, 7, 13, 12, 0, 0)
    const result = calculateLife(
      { birthDate: '1987-01-01', sex: 'male', timeUse: { ...zeroTime, sleep: 720 } },
      calculatedAt,
    )

    const afterOneSecond = remainingAt(result, new Date(calculatedAt.getTime() + 1000))
    expect(afterOneSecond.freeMilliseconds).toBe(result.remainingFreeMilliseconds - 1000)
  })
})
