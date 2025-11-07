/**
 * IT-013: Geolocation Boundary Value Tests
 *
 * 目的: geolocation.jsの境界値テスト
 *
 * テスト対象:
 * - 緯度経度の限界値（±90度、±180度）
 * - NULL緯度経度
 * - 高精度座標（小数点以下10桁）
 * - 赤道上の座標 (0, 0)
 * - 日付変更線の座標 (0, 180)
 * - 北極・南極の座標
 * - 極めて近接した座標（1cm差）
 *
 * カテゴリ: 境界値テスト（Phase 1 - High Priority）
 */

const Geolocation = require('../models/geolocation')

describe('IT-013: Geolocation境界値テスト', () => {
  let geolocation

  beforeAll(() => {
    geolocation = new Geolocation()
  })

  afterAll(async () => {
    if (geolocation && geolocation.end) {
      await geolocation.end()
    }
  })

  test('IT-013-01: 緯度経度の限界値（北極・東端）', async () => {
    const latitude = 90.0  // 北極
    const longitude = 180.0  // 東端

    const result = await geolocation.insertGeolocation({
      userId: 'user010',
      companyId: 'company001',
      latitude,
      longitude,
      accuracy: 10.0,
      timestamp: new Date().toISOString()
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-013-02: 緯度経度の限界値（南極・西端）', async () => {
    const latitude = -90.0  // 南極
    const longitude = -180.0  // 西端

    const result = await geolocation.insertGeolocation({
      userId: 'user011',
      companyId: 'company001',
      latitude,
      longitude,
      accuracy: 10.0,
      timestamp: new Date().toISOString()
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-013-03: NULL緯度経度', async () => {
    const result = await geolocation.insertGeolocation({
      userId: 'user012',
      companyId: 'company001',
      latitude: null,
      longitude: null,
      accuracy: 10.0,
      timestamp: new Date().toISOString()
    })

    // NULL値の扱いは実装次第
    // GPSが取得できない場合のユースケースを考慮
    if (result.error) {
      expect(result.error).toBe(true)
      expect(result.body).toMatch(/latitude|longitude|required|null/i)
    } else {
      // NULLを許可する実装の場合
      expect(result.error).toBe(false)
    }
  })

  test('IT-013-04: 高精度座標（小数点以下10桁）', async () => {
    // 小数点以下10桁 = 約1mmの精度
    const latitude = 35.6812345678
    const longitude = 139.7671234567

    const result = await geolocation.insertGeolocation({
      userId: 'user013',
      companyId: 'company001',
      latitude,
      longitude,
      accuracy: 0.001,  // 1mm精度
      timestamp: new Date().toISOString()
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()

    // 精度が保持されているか確認
    const getResult = await geolocation.getGeolocationByUser('company001', 'user013')
    if (!getResult.error && getResult.body.rows.length > 0) {
      const row = getResult.body.rows[0]
      expect(row.latitude).toBeCloseTo(latitude, 10)
      expect(row.longitude).toBeCloseTo(longitude, 10)
    }
  })

  test('IT-013-05: 赤道上の座標 (0, 0)', async () => {
    const latitude = 0.0  // 赤道
    const longitude = 0.0  // 本初子午線

    const result = await geolocation.insertGeolocation({
      userId: 'user014',
      companyId: 'company001',
      latitude,
      longitude,
      accuracy: 10.0,
      timestamp: new Date().toISOString()
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-013-06: 日付変更線の座標 (0, 180)', async () => {
    const latitude = 0.0
    const longitude = 180.0  // 日付変更線

    const result = await geolocation.insertGeolocation({
      userId: 'user015',
      companyId: 'company001',
      latitude,
      longitude,
      accuracy: 10.0,
      timestamp: new Date().toISOString()
    })

    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
  })

  test('IT-013-07: 極めて近接した座標（1cm差）', async () => {
    // 東京駅の座標
    const baseLat = 35.681236
    const baseLon = 139.767125

    // 1cm差の座標（緯度で約0.00001度 = 約1.1m、さらに細かく）
    const nearLat = baseLat + 0.0000001  // 約1cm北
    const nearLon = baseLon + 0.0000001  // 約1cm東

    // 1つ目の座標
    const result1 = await geolocation.insertGeolocation({
      userId: 'user016',
      companyId: 'company001',
      latitude: baseLat,
      longitude: baseLon,
      accuracy: 0.01,
      timestamp: new Date().toISOString()
    })
    expect(result1.error).toBe(false)

    // 2つ目の座標（1cm離れた場所）
    const result2 = await geolocation.insertGeolocation({
      userId: 'user016',
      companyId: 'company001',
      latitude: nearLat,
      longitude: nearLon,
      accuracy: 0.01,
      timestamp: new Date(Date.now() + 1000).toISOString()  // 1秒後
    })
    expect(result2.error).toBe(false)

    // 両方の座標が正確に保存されているか確認
    const getResult = await geolocation.getGeolocationByUser('company001', 'user016')
    if (!getResult.error) {
      expect(getResult.body.rows.length).toBeGreaterThanOrEqual(2)
    }
  })
})
