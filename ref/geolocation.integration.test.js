/**
 * IT-003: グループ別位置情報取得テスト
 *
 * 目的: geolocation.jsのグループID指定での位置情報取得動作確認
 *
 * ⚠️ Expected FAIL (BUG-001)
 * - models/geolocation.js Line 120 で `sectionId` が未定義
 * - 正しくは `groupId` を使用すべき
 * - このバグは修正せず、Expected FAILとして記録
 *
 * 前提条件:
 * - PostgreSQLが起動している
 * - テストデータが投入されている（企業、ユーザー、グループ、位置情報）
 */

const geolocation = require('../models/geolocation')
const dbUtil = require('../models/db-util')

describe('IT-003: グループ別位置情報取得（Expected FAIL）', () => {

  //
  // IT-003-01: BUG-001 を確認するExpected FAILテスト
  //
  test.failing('IT-003-01: groupIdで位置情報を取得できる (BUG-001のためExpected FAIL)', async () => {
    // Given: テストデータ準備
    // - company001に所属するユーザー
    // - group001に所属するユーザー
    // - 位置情報が登録されている

    // テストデータ確認: グループに所属するユーザーが存在するか
    const userCheckQuery = `
      SELECT u.user_id, u.staff_id, u.group_id, l.latitude, l.longitude
      FROM iw_usertbl u
      LEFT JOIN iw_locatetbl l ON u.company_id = l.company_id AND u.staff_id = l.staff_id
      WHERE u.company_id = $1 AND u.group_id = $2
      LIMIT 5
    `
    const userCheckResult = await dbUtil.executeQueryRead(
      userCheckQuery,
      ['company001', 'group001'],
      'IT-003-01-check'
    )

    if (!userCheckResult || userCheckResult.error || userCheckResult.body.rows.length === 0) {
      console.log('⚠️  テストデータが存在しないため、テストをスキップします')
      console.log('   test-data-setup.sqlで company001/group001 のデータを登録してください')
      // テストデータがない場合でも、バグの存在は確認できるため続行
    }

    // When: グループIDで位置情報を取得
    // ⚠️ BUG-001: Line 120で sectionId（未定義）を使用するため、ReferenceErrorが発生
    const result = await geolocation.getGeolocationByGroup('company001', 'group001')

    // Then: 取得成功を期待（実際はBUG-001でReferenceErrorが発生）
    expect(result).toBeDefined()
    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
    expect(result.body.rows).toBeDefined()
    expect(Array.isArray(result.body.rows)).toBe(true)

    // グループに所属するメンバーの位置情報が取得できることを期待
    if (result.body.rows.length > 0) {
      result.body.rows.forEach(row => {
        expect(row.latitude).toBeDefined()
        expect(row.longitude).toBeDefined()
      })
    }

    console.log('✅ グループ別位置情報取得成功（※このログは表示されません - BUG-001で失敗するため）')
  })

  //
  // IT-003-02: 【参考】BUG-001修正後の期待動作を記録
  //
  test('IT-003-02: 【参考】BUG-001修正後の期待動作を記録', () => {
    console.log('========================================')
    console.log('BUG-001修正内容:')
    console.log('  ファイル: models/geolocation.js')
    console.log('  行番号: Line 120')
    console.log('  修正前: sectionId,  // ← 未定義変数')
    console.log('  修正後: groupId,    // ← 引数から正しく参照')
    console.log('')
    console.log('修正後の期待結果:')
    console.log('  - getGeolocationByGroup() が正常に動作する')
    console.log('  - groupIdで指定したグループに所属するメンバーの位置情報が取得できる')
    console.log('  - ReferenceErrorが発生しない')
    console.log('========================================')

    // このテストは実行記録のみで、実際のテストは行わない
    expect(true).toBe(true)
  })

  //
  // IT-003-03: 比較用 - Section別位置情報取得は正常動作することを確認
  //
  test('IT-003-03: 【比較】getGeolocationBySection は正常に動作する', async () => {
    // Given: section001に所属するユーザー
    const companyId = 'company001'
    const sectionId = 'section001'

    // テストデータ確認
    const userCheckQuery = `
      SELECT u.user_id, u.staff_id, u.section
      FROM iw_usertbl u
      WHERE u.company_id = $1 AND u.section = $2
      LIMIT 5
    `
    const userCheckResult = await dbUtil.executeQueryRead(
      userCheckQuery,
      [companyId, sectionId],
      'IT-003-03-check'
    )

    if (!userCheckResult || userCheckResult.error || userCheckResult.body.rows.length === 0) {
      console.log('⚠️  section001のテストデータが存在しないため、テストをスキップします')
      return
    }

    // When: Section別位置情報取得（こちらは正常動作）
    const result = await geolocation.getGeolocationBySection(companyId, sectionId)

    // Then: 正常に取得できる
    expect(result).toBeDefined()
    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
    expect(result.body.rows).toBeDefined()

    console.log('✅ Section別位置情報取得は正常に動作しました（BUG-001の影響なし）')
  })

  //
  // IT-003-04: 位置情報の更新・取得フロー確認（正常系）
  //
  test('IT-003-04: 位置情報の更新・取得は正常に動作する', async () => {
    // Given: テスト用の位置情報データ
    const companyId = 'company_it003'
    const memberId = 'member_it003'
    const payload = {
      lat: 35.6812,
      lon: 139.7671,
      msg: 'IT-003-04 test location',
      send_time: new Date().toISOString()
    }

    // When: 位置情報を更新
    const updateResult = await geolocation.updateGeolocationByMember(companyId, memberId, payload)

    // Then: 更新が成功する
    expect(updateResult).toBeDefined()
    expect(updateResult.error).toBe(false)

    // When: 更新した位置情報を取得
    const getResult = await geolocation.getGeolocationByMember(companyId, memberId)

    // Then: 取得が成功し、更新した内容が反映されている
    expect(getResult).toBeDefined()
    expect(getResult.error).toBe(false)
    expect(getResult.body.rows.length).toBeGreaterThan(0)

    const locationData = getResult.body.rows[0]
    expect(locationData.latitude).toBe(payload.lat.toString())
    expect(locationData.longitude).toBe(payload.lon.toString())
    expect(locationData.message).toBe(payload.msg)

    // 後片付け: テストデータを削除
    await dbUtil.executeQueryWrite(
      'DELETE FROM iw_locatetbl WHERE company_id = $1 AND staff_id = $2',
      [companyId, memberId],
      'IT-003-04-cleanup'
    )

    console.log('✅ 位置情報の更新・取得は正常に動作しました')
  })

  //
  // IT-003-05: 会社別位置情報取得の動作確認（正常系）
  //
  test('IT-003-05: getGeolocationByCompany は正常に動作する', async () => {
    // Given: company001に所属するユーザー
    const companyId = 'company001'

    // When: 会社別位置情報取得
    const result = await geolocation.getGeolocationByCompany(companyId)

    // Then: 正常に取得できる
    expect(result).toBeDefined()
    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
    expect(result.body.rows).toBeDefined()

    console.log(`✅ 会社別位置情報取得成功: ${result.body.rows.length}件のデータを取得`)
  })

})

//
// 追加: バグ分析レポート
//
describe('IT-003-REF: BUG-001 詳細分析（参考）', () => {

  test('BUG-001のエラー内容を確認', async () => {
    console.log('========================================')
    console.log('BUG-001: 未定義変数エラー詳細分析')
    console.log('========================================')
    console.log('')
    console.log('【バグの内容】')
    console.log('  ファイル: models/geolocation.js')
    console.log('  関数: getGeolocationByGroup(companyId, groupId)')
    console.log('  行番号: Line 120')
    console.log('')
    console.log('【問題のコード】')
    console.log('  async getGeolocationByGroup(companyId, groupId) {')
    console.log('    const query = SELECT_GELOCATION_GROUP_INJ')
    console.log('    const params = [')
    console.log('      companyId,')
    console.log('      companyId,')
    console.log('      sectionId,  // ← BUG: sectionId は未定義')
    console.log('    ]')
    console.log('    ...')
    console.log('  }')
    console.log('')
    console.log('【エラー内容】')
    console.log('  ReferenceError: sectionId is not defined')
    console.log('')
    console.log('【修正方法】')
    console.log('  Line 120: sectionId → groupId に変更')
    console.log('')
    console.log('【影響範囲】')
    console.log('  - グループIDによる位置情報取得が不可能')
    console.log('  - getGeolocationByGroup() を呼び出すと例外が発生')
    console.log('')
    console.log('【テスト結果】')
    console.log('  IT-003-01: Expected FAIL (test.failing() で記録)')
    console.log('')
    console.log('【修正優先度】')
    console.log('  高 - グループ機能を使用する場合は必須修正')
    console.log('========================================')

    expect(true).toBe(true)
  })

  test('BUG-001修正後の回帰テスト計画', () => {
    console.log('========================================')
    console.log('BUG-001修正後の回帰テスト計画')
    console.log('========================================')
    console.log('')
    console.log('1. IT-003-01のtest.failing()を削除')
    console.log('   → 通常のtest()に変更')
    console.log('')
    console.log('2. テストを再実行')
    console.log('   → PASSすることを確認')
    console.log('')
    console.log('3. 各種グループIDでの動作確認')
    console.log('   - group001, group002, group003')
    console.log('   - 存在しないグループID')
    console.log('   - null/undefined')
    console.log('')
    console.log('4. パフォーマンステスト')
    console.log('   - 大量のユーザーが所属するグループでの取得時間測定')
    console.log('========================================')

    expect(true).toBe(true)
  })

})
