import { useEffect, useRef, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { sourceMetadata } from './data'
import { drawCause } from './lib/cause'
import { formatDuration, formatPercent, formatSeconds } from './lib/format'
import { calculateLife, defaultTimeUse, remainingAt, totalTimeUse } from './lib/life'
import { ageAt, parseLocalDate } from './lib/date'
import type { CauseDraw, LifeInput, LifeResult, StatisticalSex, TimeUseKey, TimeUseMinutes } from './types'

const TIME_FIELDS: Array<{ key: TimeUseKey; label: string; hint?: string }> = [
  { key: 'sleep', label: '睡眠' },
  { key: 'meals', label: '食事' },
  { key: 'personalCare', label: '身の回り', hint: '入浴・身支度を含む' },
  { key: 'workSchool', label: '仕事・学業', hint: '通勤・通学を除く' },
  { key: 'commuting', label: '通勤・通学' },
  { key: 'housework', label: '家事' },
  { key: 'care', label: '育児・介護', hint: '家族の世話を含む' },
  { key: 'shoppingOther', label: '買い物等', hint: '買い物・家事関連の移動' },
]

const FALLBACK_TIME: TimeUseMinutes = {
  sleep: 476,
  meals: 93,
  personalCare: 66,
  workSchool: 417,
  commuting: 50,
  housework: 28,
  care: 20,
  shoppingOther: 21,
}

type BirthDateParts = {
  year: string
  month: string
  day: string
}

type InputErrors = {
  birthDate?: string
  sex?: string
  timeUse?: string
}

function splitBirthDate(value: string): BirthDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return { year: '', month: '', day: '' }
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) }
}

function joinBirthDate(parts: BirthDateParts): string {
  if (!parts.year || !parts.month || !parts.day) return ''
  return `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`
}

function selectableDays(year: string, month: string, today: Date): number {
  if (!year || !month) return 0
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const daysInMonth = new Date(yearNumber, monthNumber, 0).getDate()
  if (yearNumber === today.getFullYear() && monthNumber === today.getMonth() + 1) {
    return Math.min(daysInMonth, today.getDate())
  }
  return daysInMonth
}

function normalizeBirthDateParts(parts: BirthDateParts, today: Date): BirthDateParts {
  const next = { ...parts }
  if (Number(next.year) === today.getFullYear() && Number(next.month) > today.getMonth() + 1) {
    next.month = ''
    next.day = ''
  }
  const maximumDay = selectableDays(next.year, next.month, today)
  if (next.day && Number(next.day) > maximumDay) next.day = ''
  return next
}

function formatTimeUse(minutes: number): string {
  return `${Math.floor(minutes / 60)}時間${minutes % 60}分`
}

function ageForInput(value: string, now = new Date()): number | null {
  const birthDate = parseLocalDate(value)
  if (!birthDate || birthDate > now) return null
  return ageAt(birthDate, now).years
}

function hasCustomizedTimeUse(input: LifeInput): boolean {
  const age = ageForInput(input.birthDate)
  if (age === null) return false
  const average = defaultTimeUse(input.sex, age).minutes
  return TIME_FIELDS.some(({ key }) => input.timeUse[key] !== average[key])
}

function Header({ onSources, onReset, showReset }: { onSources: () => void; onReset: () => void; showReset: boolean }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="wordmark" type="button" onClick={onReset} aria-label="余命.exeの入力画面へ戻る">
          余命.exe
        </button>
        <nav aria-label="ページ操作">
          <button className="text-button" type="button" onClick={onSources}>計算根拠</button>
          {showReset && <button className="text-button" type="button" onClick={onReset}>入力を修正</button>}
        </nav>
      </div>
    </header>
  )
}

function SourcesDialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  return (
    <dialog className="source-dialog" ref={dialogRef} aria-labelledby="source-title">
      <div className="dialog-header">
        <h2 id="source-title">計算根拠</h2>
        <button className="dialog-close" type="button" onClick={() => dialogRef.current?.close()} aria-label="閉じる">×</button>
      </div>
      <div className="dialog-body">
        <section>
          <h3>統計上の残り時間</h3>
          <p>出生時平均寿命から年齢を引くのではなく、選択した性別の年齢別平均余命を使います。誕生日間は隣接する年齢の値を線形補間します。</p>
        </section>
        <section>
          <h3>自由に使える残り時間</h3>
          <p>1日1,440分から、睡眠・食事・身の回り・仕事や家事などの入力時間を引いた割合を、統計上の残り時間に掛けています。入浴やトイレは「身の回り」に含め、重ねて差し引きません。</p>
        </section>
        <section>
          <h3>残り回数</h3>
          <p>「夏」は毎年7月1日を迎える回数です。当日は既に迎えたものとして数えません。2月29日生まれは平年では2月28日を誕生日として数えます。</p>
        </section>
        <section>
          <h3>死因ガチャ</h3>
          <p>現在年齢まで生存したことを条件とする死亡年齢を生命表から抽選し、その年齢階級・性別の死因別死亡数を重みとして1件抽選します。個人の死因を予測するものではありません。</p>
        </section>
        <section className="source-list">
          <h3>出典</h3>
          {Object.values(sourceMetadata).map((source) => (
            <a key={source.name} href={source.url} target="_blank" rel="noreferrer">
              {source.publisher}「{source.name}」
            </a>
          ))}
        </section>
        <p className="dialog-disclaimer">本アプリは娯楽目的の統計表示です。個人の寿命、死亡日、死因を予測せず、医療・健康判断には利用できません。</p>
      </div>
    </dialog>
  )
}

function InputScreen({
  initialInput,
  onSubmit,
}: {
  initialInput: LifeInput | null
  onSubmit: (input: LifeInput, result: LifeResult) => void
}) {
  const today = new Date()
  const [birthDateParts, setBirthDateParts] = useState<BirthDateParts>(() => splitBirthDate(initialInput?.birthDate ?? ''))
  const [sex, setSex] = useState<StatisticalSex | null>(initialInput?.sex ?? null)
  const [timeUse, setTimeUse] = useState<TimeUseMinutes>({ ...(initialInput?.timeUse ?? FALLBACK_TIME) })
  const [timeExpanded, setTimeExpanded] = useState(false)
  const [editingTimeKey, setEditingTimeKey] = useState<TimeUseKey | null>(null)
  const [timeCustomized, setTimeCustomized] = useState(() => initialInput ? hasCustomizedTimeUse(initialInput) : false)
  const [errors, setErrors] = useState<InputErrors>({})
  const birthDateRef = useRef<HTMLSelectElement>(null)
  const sexRef = useRef<HTMLInputElement>(null)
  const timeErrorRef = useRef<HTMLParagraphElement>(null)
  const birthDate = joinBirthDate(birthDateParts)
  const age = ageForInput(birthDate, today)
  const total = totalTimeUse(timeUse)
  const freeMinutes = Math.max(0, 1440 - total)
  const currentYear = today.getFullYear()
  const yearOptions = Array.from({ length: currentYear - 1899 }, (_, index) => currentYear - index)
  const maximumMonth = Number(birthDateParts.year) === currentYear ? today.getMonth() + 1 : 12
  const maximumDay = selectableDays(birthDateParts.year, birthDateParts.month, today)

  useEffect(() => {
    if (errors.birthDate) {
      birthDateRef.current?.focus()
    } else if (errors.sex) {
      sexRef.current?.focus()
    } else if (errors.timeUse && timeExpanded) {
      timeErrorRef.current?.focus()
    }
  }, [errors.birthDate, errors.sex, errors.timeUse, timeExpanded])

  const restoreAverage = (nextSex = sex, nextAge = age) => {
    if (nextSex === null || nextAge === null) return
    setTimeUse(defaultTimeUse(nextSex, nextAge).minutes)
    setTimeCustomized(false)
    setErrors((current) => ({ ...current, timeUse: undefined }))
  }

  const handleBirthDatePart = (part: keyof BirthDateParts, value: string) => {
    const nextParts = normalizeBirthDateParts({ ...birthDateParts, [part]: value }, today)
    setBirthDateParts(nextParts)
    setErrors((current) => ({ ...current, birthDate: undefined }))
    const nextAge = ageForInput(joinBirthDate(nextParts), today)
    if (nextAge !== null && sex !== null && !timeCustomized) restoreAverage(sex, nextAge)
  }

  const handleSex = (value: StatisticalSex) => {
    setSex(value)
    setErrors((current) => ({ ...current, sex: undefined }))
    if (age !== null && !timeCustomized) restoreAverage(value, age)
  }

  const handleTimeUse = (key: TimeUseKey, value: number) => {
    setTimeUse((current) => {
      const otherMinutes = totalTimeUse(current) - current[key]
      const maximum = Math.max(0, 1440 - otherMinutes)
      const nextValue = Math.max(0, Math.min(maximum, Math.round(value)))
      return { ...current, [key]: nextValue }
    })
    setTimeCustomized(true)
    setErrors((current) => ({ ...current, timeUse: undefined }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: InputErrors = {}
    const parsedBirthDate = parseLocalDate(birthDate)
    if (!birthDate) {
      nextErrors.birthDate = '生年月日を選択してください。'
    } else if (!parsedBirthDate) {
      nextErrors.birthDate = '有効な生年月日を入力してください。'
    } else if (parsedBirthDate > today) {
      nextErrors.birthDate = '未来の生年月日は入力できません。'
    }
    if (sex === null) nextErrors.sex = '性別を選択してください。'

    const values = Object.values(timeUse)
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1440)) {
      nextErrors.timeUse = '生活時間は0～1,440分で入力してください。'
    } else if (totalTimeUse(timeUse) > 1440) {
      nextErrors.timeUse = '生活時間の合計は1,440分以内にしてください。'
    }

    if (nextErrors.birthDate || nextErrors.sex || nextErrors.timeUse || sex === null) {
      setErrors(nextErrors)
      if (nextErrors.timeUse) {
        setTimeExpanded(true)
      }
      return
    }

    try {
      const input = { birthDate, sex, timeUse }
      const result = calculateLife(input)
      onSubmit(input, result)
    } catch {
      setErrors({ timeUse: '計算できませんでした。入力を確認してください。' })
      setTimeExpanded(true)
    }
  }

  return (
    <main className="input-page">
      <form className="input-form" onSubmit={handleSubmit} noValidate>
        <h1 className="visually-hidden">余命.exeの入力</h1>
        <section className="essential-inputs" aria-label="入力">
          <div className="basic-grid">
            <fieldset className="field date-field">
              <legend>生年月日</legend>
              <div className="birth-date-selects">
                <select
                  ref={birthDateRef}
                  value={birthDateParts.year}
                  aria-label="生年"
                  aria-invalid={Boolean(errors.birthDate)}
                  aria-describedby={errors.birthDate ? 'birth-date-error' : undefined}
                  onChange={(event) => handleBirthDatePart('year', event.target.value)}
                  required
                >
                  <option value="">年</option>
                  {yearOptions.map((year) => <option key={year} value={year}>{year}年</option>)}
                </select>
                <select
                  value={birthDateParts.month}
                  aria-label="生月"
                  aria-invalid={Boolean(errors.birthDate)}
                  onChange={(event) => handleBirthDatePart('month', event.target.value)}
                  disabled={!birthDateParts.year}
                  required
                >
                  <option value="">月</option>
                  {Array.from({ length: maximumMonth }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>{month}月</option>
                  ))}
                </select>
                <select
                  value={birthDateParts.day}
                  aria-label="生日"
                  aria-invalid={Boolean(errors.birthDate)}
                  onChange={(event) => handleBirthDatePart('day', event.target.value)}
                  disabled={!birthDateParts.year || !birthDateParts.month}
                  required
                >
                  <option value="">日</option>
                  {Array.from({ length: maximumDay }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>{day}日</option>
                  ))}
                </select>
              </div>
              {errors.birthDate && <small className="field-error" id="birth-date-error" role="alert">{errors.birthDate}</small>}
            </fieldset>
            <fieldset className="field sex-field" aria-describedby={errors.sex ? 'sex-error' : undefined}>
              <legend>性別</legend>
              <div className="segmented">
                <label><input ref={sexRef} type="radio" name="sex" checked={sex === 'male'} onChange={() => handleSex('male')} /><span>男性</span></label>
                <label><input type="radio" name="sex" checked={sex === 'female'} onChange={() => handleSex('female')} /><span>女性</span></label>
              </div>
              {errors.sex && <small className="field-error" id="sex-error" role="alert">{errors.sex}</small>}
            </fieldset>
          </div>
        </section>

        {age !== null && sex !== null && (
          <section className="time-settings" aria-labelledby="time-title">
            <div className="time-settings-row">
              <div>
                <h2 id="time-title">生活時間</h2>
                <p>{timeCustomized ? '調整済み' : '統計平均を使用'}</p>
              </div>
              <button className="inline-button" type="button" aria-expanded={timeExpanded} onClick={() => setTimeExpanded((expanded) => !expanded)}>
                {timeExpanded ? '閉じる' : '調整する'}
              </button>
            </div>
            {timeExpanded && (
              <div className="time-details">
                <div className="time-detail-actions">
                  <button className="restore-button" type="button" onClick={() => restoreAverage()}>統計平均に戻す</button>
                </div>
                <div className="time-grid">
                  {TIME_FIELDS.map((field) => {
                    const minutes = timeUse[field.key]
                    const maximum = 1440 - (total - minutes)
                    const hours = Math.floor(minutes / 60)
                    const minutePart = minutes % 60
                    const maximumHour = Math.floor(maximum / 60)
                    const maximumMinute = hours === maximumHour ? maximum % 60 : 59
                    const isEditing = editingTimeKey === field.key
                    const editorId = `time-editor-${field.key}`

                    return (
                      <div className="time-field" key={field.key}>
                        <span className="time-field-label"><strong>{field.label}</strong>{field.hint && <small>{field.hint}</small>}</span>
                        <div className="time-control">
                          <button
                            type="button"
                            className="time-step-button"
                            aria-label={`${field.label}を15分減らす`}
                            disabled={minutes === 0}
                            onClick={() => handleTimeUse(field.key, minutes - 15)}
                          >−</button>
                          <button
                            type="button"
                            className="time-value-button"
                            aria-expanded={isEditing}
                            aria-controls={editorId}
                            onClick={() => setEditingTimeKey(isEditing ? null : field.key)}
                          >{formatTimeUse(minutes)}</button>
                          <button
                            type="button"
                            className="time-step-button"
                            aria-label={`${field.label}を15分増やす`}
                            disabled={minutes >= maximum}
                            onClick={() => handleTimeUse(field.key, minutes + 15)}
                          >＋</button>
                        </div>
                        {isEditing && (
                          <div className="exact-time-editor" id={editorId}>
                            <label>
                              <select
                                value={hours}
                                aria-label={`${field.label}の時間`}
                                onChange={(event) => handleTimeUse(field.key, Number(event.target.value) * 60 + minutePart)}
                              >
                                {Array.from({ length: maximumHour + 1 }, (_, index) => index).map((hour) => (
                                  <option key={hour} value={hour}>{hour}</option>
                                ))}
                              </select>
                              <span>時間</span>
                            </label>
                            <label>
                              <select
                                value={minutePart}
                                aria-label={`${field.label}の分`}
                                onChange={(event) => handleTimeUse(field.key, hours * 60 + Number(event.target.value))}
                              >
                                {Array.from({ length: maximumMinute + 1 }, (_, index) => index).map((minute) => (
                                  <option key={minute} value={minute}>{minute}</option>
                                ))}
                              </select>
                              <span>分</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="time-summary">
                  <span>入力合計 <strong>{formatTimeUse(total)}</strong></span>
                  <span>1日の自由時間 <strong>{formatTimeUse(freeMinutes)}</strong></span>
                </div>
                {errors.timeUse && <p className="field-error time-error" ref={timeErrorRef} tabIndex={-1} role="alert">{errors.timeUse}</p>}
              </div>
            )}
          </section>
        )}

        <div className="submit-row">
          <button className="primary-button" type="submit">残り時間を計算する</button>
          <p>入力内容は保存・送信されません</p>
        </div>
      </form>
    </main>
  )
}

function millisecondsUntilNextDisplayedSecond(milliseconds: number): number {
  return Math.max(1, Math.ceil(milliseconds % 1000) + 1)
}

function useRemainingTime(result: LifeResult) {
  const [remaining, setRemaining] = useState(() => remainingAt(result))
  const displayedSecondsRef = useRef(Math.floor(remaining.freeMilliseconds / 1000))

  useEffect(() => {
    let timerId = 0

    const tick = () => {
      const current = new Date()
      const nextRemaining = remainingAt(result, current)
      const nextDisplayedSeconds = Math.floor(nextRemaining.freeMilliseconds / 1000)
      if (nextDisplayedSeconds !== displayedSecondsRef.current) {
        displayedSecondsRef.current = nextDisplayedSeconds
        setRemaining(nextRemaining)
      }
      if (nextRemaining.freeMilliseconds > 0) {
        timerId = window.setTimeout(tick, millisecondsUntilNextDisplayedSecond(nextRemaining.freeMilliseconds))
      }
    }

    timerId = window.setTimeout(tick, millisecondsUntilNextDisplayedSecond(remainingAt(result).freeMilliseconds))
    return () => window.clearTimeout(timerId)
  }, [result])

  return remaining
}

function ResultScreen({ input, result }: { input: LifeInput; result: LifeResult }) {
  const remaining = useRemainingTime(result)
  const [cause, setCause] = useState<CauseDraw | null>(null)

  return (
    <main className="result-page">
      <section className="primary-result" aria-labelledby="free-time-title">
        <h1 id="free-time-title">あなたに残された、自由な時間。</h1>
        <p className="duration-large">{formatDuration(remaining.freeDuration)}</p>
        <p className="seconds" aria-live="off" aria-label={`残り自由時間 ${formatSeconds(remaining.freeMilliseconds)}秒`}>
          {formatSeconds(remaining.freeMilliseconds)} <span>秒</span>
        </p>
      </section>

      <section className="secondary-results" aria-label="補足結果">
        <div><h2>統計上の残り時間</h2><p>{formatDuration(remaining.lifeDuration)}</p></div>
        <div><h2>現在の年齢</h2><p>{result.age}歳</p></div>
      </section>

      <section className="event-results" aria-label="残りの出来事">
        <div><h2>残りの夏</h2><p>{result.remainingSummers.toLocaleString('ja-JP')}回</p></div>
        <div><h2>残りの誕生日</h2><p>{result.remainingBirthdays.toLocaleString('ja-JP')}回</p></div>
        <div><h2>残りの土曜日</h2><p>{result.remainingSaturdays.toLocaleString('ja-JP')}回</p></div>
      </section>

      <section className="consumed" aria-label={`人生の消化率 ${formatPercent(result.lifeConsumedRatio)}`}>
        <div><h2>人生の消化率</h2><p>{formatPercent(result.lifeConsumedRatio)}</p></div>
        <div className="progress" aria-hidden="true"><span style={{ width: formatPercent(result.lifeConsumedRatio) }} /></div>
      </section>

      <section className="cause-lottery">
        <h2>死因ガチャ</h2>
        {cause && (
          <div className="cause-result" aria-live="polite">
            <p className="cause-label">{cause.cause.label}</p>
          </div>
        )}
        <button
          className="lottery-button"
          type="button"
          aria-label={cause ? '死因ガチャをもう一度回す' : '死因ガチャを回す'}
          onClick={() => setCause(drawCause(input.sex, result.exactAge))}
        >
          {cause ? 'もう一度回す' : '回す'}
        </button>
      </section>

      <footer className="result-footer">
        {result.approximateTimeUse && <p>10歳未満の生活時間は、最も近い公開区分である10～14歳の概算です。</p>}
        {result.approximateLifeTable && <p>生命表の上限年齢以上は、最終の公開区分を使った概算です。</p>}
        <p>この結果は個人の寿命・死亡日・死因を予測するものではありません。</p>
      </footer>
    </main>
  )
}

export default function App() {
  const [calculation, setCalculation] = useState<{ input: LifeInput; result: LifeResult } | null>(null)
  const [draftInput, setDraftInput] = useState<LifeInput | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const reset = () => {
    setCalculation(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const submit = (input: LifeInput, result: LifeResult) => {
    setDraftInput(input)
    setCalculation({ input, result })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <>
      <Header onSources={() => dialogRef.current?.showModal()} onReset={reset} showReset={calculation !== null} />
      {calculation ? <ResultScreen {...calculation} /> : <InputScreen initialInput={draftInput} onSubmit={submit} />}
      <SourcesDialog dialogRef={dialogRef} />
    </>
  )
}
