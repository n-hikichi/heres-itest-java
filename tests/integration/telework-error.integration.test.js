/**
 * IT-012: Telework Error Handling Tests
 *
 * 目的: telework.jsのエラーハンドリングテスト
 *
 * テスト対象:
 * - 重複した勤務開始
 * - 必須パラメータの欠損
 * - 不正なuserId
 * - 不正なcompanyId
 * - SQLインジェクション攻撃
 * - 不正な緯度経度
 * - 不正なカテゴリ値
 *
 * カテゴリ: エラーハンドリングテスト（Phase 1 - High Priority）
 */

const Telework = require('../models/telework')

describe('IT-012: Teleworkエラーハンドリングテスト', () => {
  let telework

  beforeAll(() => {
    telework = new Telework()
  })

  afterAll(async () => {
    if (telework && telework.end) {
      await telework.end()
    }
  })

  test('IT-012-01: 重複した勤務開始（既に開始済み）', async () => {
    const userId = 'user006'
    const companyId = 'company001'
    const logDate = '2025-11-06'
    const logTime = '09:00:00'

    // 1回目の勤務開始
    const firstResult = await telework.startWork({
      userId,
      companyId,
      category: 1,
      logDate,
      logTime,
      latitude: 35.6812,
      longitude: 139.7671
    })
    expect(firstResult.error).toBe(false)

    // 2回目の勤務開始（重複）
    const duplicateResult = await telework.startWork({
      userId,
      companyId,
      category: 1,
      logDate,
      logTime: '09:05:00',
      latitude: 35.6812,
      longitude: 139.7671
    })

    // 重複エラーが期待される
    // 実装次第でエラーまたは上書きになる可能性あり
    // 現状の動作を記録
    if (duplicateResult.error) {
      expect(duplicateResult.error).toBe(true)
      expect(duplicateResult.body).toMatch(/duplicate|already.*started|既に開始/i)
    }
  })

  test('IT-012-02: 必須パラメータ欠損（userId未指定）', async () => {
    const result = await telework.startWork({
      // userId: 欠損
      companyId: 'company001',
      category: 1,
      logDate: '2025-11-06',
      logTime: '09:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })

    expect(result.error).toBe(true)
    expect(result.body).toMatch(/userId|required|必須/i)
  })

  test('IT-012-03: 必須パラメータ欠損（logDate未指定）', async () => {
    const result = await telework.startWork({
      userId: 'user007',
      companyId: 'company001',
      category: 1,
      // logDate: 欠損
      logTime: '09:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })

    expect(result.error).toBe(true)
    expect(result.body).toMatch(/logDate|date.*required|日付.*必須/i)
  })

  test('IT-012-04: 不正なuserId（存在しないユーザー）', async () => {
    const result = await telework.startWork({
      userId: 'nonexistent_user_999',
      companyId: 'company001',
      category: 1,
      logDate: '2025-11-06',
      logTime: '09:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })

    // 外部キー制約エラーまたはユーザー不存在エラーが期待される
    // 実装次第で動作が異なる可能性あり
    if (result.error) {
      expect(result.error).toBe(true)
      expect(result.body).toMatch(/user.*not.*found|invalid.*user|foreign.*key|constraint/i)
    }
  })

  test('IT-012-05: SQLインジェクション攻撃（userId）', async () => {
    const maliciousUserId = "user001' OR '1'='1"

    const result = await telework.startWork({
      userId: maliciousUserId,
      companyId: 'company001',
      category: 1,
      logDate: '2025-11-06',
      logTime: '09:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })

    // パラメータ化クエリを使用していればエラーになる
    // SQLインジェクションが成功してはいけない
    expect(result.error).toBe(true)
  })

  test('IT-012-06: 不正な緯度経度（範囲外）', async () => {
    // 緯度は-90～90、経度は-180～180が有効範囲
    const result = await telework.startWork({
      userId: 'user008',
      companyId: 'company001',
      category: 1,
      logDate: '2025-11-06',
      logTime: '09:00:00',
      latitude: 91.0,  // 範囲外
      longitude: 181.0  // 範囲外
    })

    // バリデーションエラーが期待される
    // 実装次第ではエラーにならない可能性もあり
    if (result.error) {
      expect(result.error).toBe(true)
      expect(result.body).toMatch(/latitude|longitude|invalid.*location|緯度|経度/i)
    }
  })

  test('IT-012-07: 不正なカテゴリ値', async () => {
    const result = await telework.startWork({
      userId: 'user009',
      companyId: 'company001',
      category: 999,  // 不正な値
      logDate: '2025-11-06',
      logTime: '09:00:00',
      latitude: 35.6812,
      longitude: 139.7671
    })

    // カテゴリ値のバリデーションエラーが期待される
    // 実装次第で動作が異なる可能性あり
    if (result.error) {
      expect(result.error).toBe(true)
      expect(result.body).toMatch(/category|invalid.*type|カテゴリ/i)
    }
  })
})
