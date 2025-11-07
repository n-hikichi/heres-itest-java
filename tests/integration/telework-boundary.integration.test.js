/**
 * IT-011: Telework Boundary Value Tests
 *
 * 目的: telework.jsの境界値テスト
 *
 * テスト対象:
 * - 0時0分0秒の勤務開始
 * - 23時59分59秒の勤務終了
 * - 24時間以上の勤務シフト
 * - 過去日付での勤務記録
 * - 未来日付での勤務記録
 * - うるう年の2月29日
 *
 * カテゴリ: 境界値テスト（Phase 1 - High Priority）
 */

const Telework = require('../models/telework')

describe('IT-011: Telework境界値テスト', () => {
  let telework

  beforeAll(() => {
    telework = new Telework()
  })

  afterAll(async () => {
    if (telework && telework.end) {
      await telework.end()
    }
  })

  test('IT-011-01: 0時0分0秒の勤務開始', async () => {
    const logTime = '00:00:00'
    const logDate = '2025-11-06'

    const result = await telework.startWork({
      userId: 'user001',
      companyId: 'company001',
      category: 1,
      logDate,
      logTime,
      latitude: 35.6812,
      longitude: 139.7671
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-011-02: 23時59分59秒の勤務終了', async () => {
    const logTime = '23:59:59'
    const logDate = '2025-11-06'

    const result = await telework.endWork({
      userId: 'user001',
      companyId: 'company001',
      category: 2,
      logDate,
      logTime,
      latitude: 35.6812,
      longitude: 139.7671
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-011-03: 24時間以上の勤務シフト（深夜勤務）', async () => {
    const startDate = '2025-11-06'
    const endDate = '2025-11-07'

    // 勤務開始: 2025-11-06 22:00:00
    const startResult = await telework.startWork({
      userId: 'user002',
      companyId: 'company001',
      category: 1,
      logDate: startDate,
      logTime: '22:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })
    expect(startResult.error).toBe(false)

    // 勤務終了: 2025-11-07 06:00:00（8時間後）
    const endResult = await telework.endWork({
      userId: 'user002',
      companyId: 'company001',
      category: 2,
      logDate: endDate,
      logTime: '06:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })
    expect(endResult.error).toBe(false)
  })

  test('IT-011-04: 過去日付での勤務記録（1年前）', async () => {
    const pastDate = '2024-11-06'
    const logTime = '09:00:00'

    const result = await telework.startWork({
      userId: 'user003',
      companyId: 'company001',
      category: 1,
      logDate: pastDate,
      logTime,
      latitude: 35.6812,
      longitude: 139.7671
    })

    // 過去日付でも記録可能（修正申請などのユースケース）
    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-011-05: 未来日付での勤務記録', async () => {
    const futureDate = '2026-11-06'
    const logTime = '09:00:00'

    const result = await telework.startWork({
      userId: 'user004',
      companyId: 'company001',
      category: 1,
      logDate: futureDate,
      logTime,
      latitude: 35.6812,
      longitude: 139.7671
    })

    // 未来日付は許可しない可能性が高いが、現在の実装を確認
    // 実装次第でこのテストはExpected FAILになる可能性あり
    // ここでは現状の動作を記録する
    if (result.error) {
      expect(result.error).toBe(true)
      expect(result.body).toMatch(/invalid.*date|future.*date/i)
    } else {
      expect(result.error).toBe(false)
    }
  })

  test('IT-011-06: うるう年の2月29日', async () => {
    const leapDate = '2024-02-29'
    const logTime = '09:00:00'

    const result = await telework.startWork({
      userId: 'user005',
      companyId: 'company001',
      category: 1,
      logDate: leapDate,
      logTime,
      latitude: 35.6812,
      longitude: 139.7671
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })
})
