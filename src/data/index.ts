import lifeTableJson from './life-table-2024.json'
import timeUseJson from './time-use-2021.json'
import causesJson from './causes-of-death-2024.json'
import type { CauseWeight, LifeTableRow, StatisticalSex, TimeUseMinutes } from '../types'

interface TimeUseRecord {
  ageGroup: string
  minutes: TimeUseMinutes
}

export const lifeTables = lifeTableJson.tables as Record<StatisticalSex, LifeTableRow[]>
export const timeUseTables = timeUseJson.tables as Record<StatisticalSex, TimeUseRecord[]>
export const causeTables = causesJson.tables as Record<StatisticalSex, Record<string, CauseWeight[]>>

export const sourceMetadata = {
  life: {
    name: lifeTableJson.source,
    publisher: lifeTableJson.publisher,
    year: lifeTableJson.referenceYear,
    url: lifeTableJson.sourceUrl,
  },
  timeUse: {
    name: timeUseJson.source,
    publisher: timeUseJson.publisher,
    year: timeUseJson.referenceYear,
    url: timeUseJson.sourceUrl,
  },
  causes: {
    name: causesJson.source,
    publisher: causesJson.publisher,
    year: causesJson.referenceYear,
    url: causesJson.sourceUrl,
  },
}
