import { causeAgeGroup, drawCause, sampleDeathAge } from './cause'

describe('cause lottery', () => {
  it('maps ages to published cause age groups', () => {
    expect(causeAgeGroup(0)).toBe('0歳')
    expect(causeAgeGroup(42)).toBe('40～44歳')
    expect(causeAgeGroup(105)).toBe('100歳以上')
  })

  it('returns a future age from the life table', () => {
    expect(sampleDeathAge('male', 40.5, () => 0)).toBe(40)
    expect(sampleDeathAge('male', 40.5, () => 0.999999)).toBe(105)
  })

  it('draws an existing positive-weight cause deterministically', () => {
    const values = [0.5, 0]
    const result = drawCause('female', 39, () => values.shift() ?? 0)
    expect(result.cause.weight).toBeGreaterThan(0)
    expect(result.cause.code).toMatch(/^\d{5}$/)
  })
})
