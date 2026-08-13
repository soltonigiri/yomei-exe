import { expect, test } from '@playwright/test'

async function fillValidInput(page: import('@playwright/test').Page) {
  await page.getByLabel('生年').selectOption('1987')
  await page.getByLabel('生月').selectOption('1')
  await page.getByLabel('生日').selectOption('1')
  await page.getByRole('radio', { name: '男性' }).check()
}

test('calculates a result and keeps personal input out of the URL', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  await page.goto('/')
  await expect(page).toHaveTitle('余命.exe')
  await expect(page.locator('.wordmark')).toHaveText('余命.exe')
  await fillValidInput(page)
  await page.getByRole('button', { name: '残り時間を計算する' }).click()
  await expect(page.getByRole('heading', { name: 'あなたに残された、自由な時間。' })).toBeVisible()
  await expect(page.locator('.seconds')).toHaveText(/^\d{1,3}(,\d{3})* 秒$/)
  await expect(page).toHaveURL(/\/$/)
  expect(page.url()).not.toContain('1987')
  expect(requests.every((url) => !url.includes('1987-01-01'))).toBe(true)
})

test('opens calculation notes and returns focus to the trigger', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: '計算根拠' })
  await trigger.click()
  await expect(page.getByRole('heading', { name: '計算根拠' })).toBeVisible()
  await page.getByRole('button', { name: '閉じる' }).click()
  await expect(trigger).toBeFocused()
})

test('draws a cause only after the user requests it', async ({ page }) => {
  await page.goto('/')
  await fillValidInput(page)
  await page.getByRole('button', { name: '残り時間を計算する' }).click()
  await expect(page.locator('.cause-result')).toHaveCount(0)
  await page.getByRole('button', { name: '死因ガチャを回す' }).click()
  await expect(page.locator('.cause-result')).toBeVisible()
  await expect(page.getByText('統計から抽選')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '死因ガチャをもう一度回す' })).toBeVisible()
})

test('requires date and sex and prevents time settings from exceeding 24 hours', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '残り時間を計算する' }).click()
  await expect(page.getByText('生年月日を選択してください。')).toBeVisible()
  await expect(page.getByText('性別を選択してください。')).toBeVisible()
  await expect(page.getByLabel('生年')).toBeFocused()

  await fillValidInput(page)
  await page.getByRole('button', { name: '調整する' }).click()
  await page.locator('.time-value-button').first().click()
  const maximumSleepHours = await page.getByLabel('睡眠の時間').locator('option').last().getAttribute('value')
  await page.getByLabel('睡眠の時間').selectOption(maximumSleepHours ?? '')
  await expect(page.locator('.time-summary')).toContainText('24時間0分')
  await expect(page.getByRole('button', { name: '睡眠を15分増やす' })).toBeDisabled()
})

test('keeps optional time settings collapsed and preserves mouse adjustments when other input changes', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.time-value-button')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '生活時間' })).toHaveCount(0)
  await fillValidInput(page)
  await expect(page.getByText('統計平均を使用')).toBeVisible()
  await page.getByRole('button', { name: '調整する' }).click()
  const sleepValue = page.locator('.time-value-button').first()
  const initialSleep = await sleepValue.textContent()
  await page.getByRole('button', { name: '睡眠を15分増やす' }).click()
  await expect(sleepValue).not.toHaveText(initialSleep ?? '')
  const customizedSleep = await sleepValue.textContent()
  await page.getByRole('radio', { name: '女性' }).check()
  await expect(sleepValue).toHaveText(customizedSleep ?? '')
  await expect(page.getByText('調整済み')).toBeVisible()
  await page.getByRole('button', { name: '残り時間を計算する' }).click()
  await page.getByRole('button', { name: '入力を修正' }).click()
  await expect(page.getByLabel('生年')).toHaveValue('1987')
  await expect(page.getByLabel('生月')).toHaveValue('1')
  await expect(page.getByLabel('生日')).toHaveValue('1')
  await expect(page.getByRole('radio', { name: '女性' })).toBeChecked()
})
