/**
 * IT-009: DB Util Constructor動作テスト
 *
 * 目的: db-util.jsのconstructorとDB接続情報取得の動作確認
 *
 * 前提条件:
 * - PostgreSQLが起動している
 * - environmentType=0 (localhost環境)
 * - テストデータが投入されている
 */

const dbUtil = require('../models/db-util')
const { Pool } = require('pg')

describe('IT-009: DB Util Constructor動作テスト', () => {

  //
  // IT-009-01: Constructor初期化確認
  //
  test('IT-009-01: Constructorでdb_configが初期化される', async () => {
    // Given: db-utilモジュールがロードされている

    // When: db-utilが既にconstructorで初期化されている
    // (require時点でconstructorが実行済み)

    // Then: db-utilオブジェクトが正常に生成されていることを確認
    expect(dbUtil).toBeDefined()
    expect(typeof dbUtil.executeQuery).toBe('function')
    expect(typeof dbUtil.executeQueryRead).toBe('function')
    expect(typeof dbUtil.executeQueryInjection).toBe('function')
  })

  //
  // IT-009-02: Localhost環境でのDB接続確認
  //
  test('IT-009-02: Localhost環境でDB接続情報が正しく設定される', async () => {
    // Given: environmentType=0 (localhost)

    // When: 簡単なクエリを実行してDB接続を確認
    const query = 'SELECT 1 as test_value'
    const result = await dbUtil.executeQuery(query)

    // Then: クエリが正常に実行され、結果が返ること
    expect(result).toBeDefined()
    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
    expect(result.body.rows).toBeDefined()
    expect(result.body.rows.length).toBe(1)
    expect(result.body.rows[0].test_value).toBe(1)
  })

  //
  // IT-009-03: executeQueryInjectionのパラメータ化クエリ確認
  //
  test('IT-009-03: executeQueryInjectionでパラメータ化クエリが正常に実行される', async () => {
    // Given: テストデータとして企業マスタが存在する
    const query = 'SELECT company_id, company_name FROM iw_companytbl WHERE company_id = $1'
    const params = ['company001']

    // When: パラメータ化クエリを実行
    const result = await dbUtil.executeQueryInjection(query, params, 'IT-009-03')

    // Then: 結果が正常に返る
    expect(result).toBeDefined()
    expect(result.error).toBe(false)
    expect(result.body).toBeDefined()
    expect(result.body.rows).toBeDefined()

    // company001が存在する場合は詳細確認
    if (result.body.rows.length > 0) {
      expect(result.body.rows[0].company_id).toBe('company001')
      expect(result.body.rows[0].company_name).toBeDefined()
    }
  })

  //
  // IT-009-04: executeQueryReadの動作確認
  //
  test('IT-009-04: executeQueryReadが正常に動作する', async () => {
    // Given: テストデータとしてユーザーマスタが存在する
    const query = 'SELECT user_id, company_id FROM iw_usertbl WHERE company_id = $1 LIMIT 5'
    const params = ['company001']

    // When: executeQueryReadを実行
    const result = await dbUtil.executeQueryRead(query, params, 'IT-009-04')

    // Then: 結果が正常に返る
    expect(result).toBeDefined()
    expect(result.error).toBeFalsy()
    expect(result.body).toBeDefined()
    expect(result.body.rows).toBeDefined()
    expect(Array.isArray(result.body.rows)).toBe(true)
  })

  //
  // IT-009-05: executeQueryWriteの動作確認（INSERT/UPDATE）
  //
  test('IT-009-05: executeQueryWriteが正常に動作する', async () => {
    // Given: テスト用の一時データを挿入
    const insertQuery = `
      INSERT INTO iw_locatetbl (company_id, staff_id, latitude, longitude, message, send_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ON CONSTRAINT iw_locatetbl_pkey
      DO UPDATE SET latitude=$3, longitude=$4, message=$5, send_time=$6
    `
    const params = [
      'company999',
      'staff999',
      '35.6812',
      '139.7671',
      'IT-009-05 test',
      new Date().toISOString()
    ]

    // When: executeQueryWriteを実行
    const result = await dbUtil.executeQueryWrite(insertQuery, params, 'IT-009-05')

    // Then: 書き込みが成功する
    expect(result).toBeDefined()
    expect(result.error).toBe(false)

    // 確認: 挿入されたデータを取得
    const selectQuery = 'SELECT * FROM iw_locatetbl WHERE company_id = $1 AND staff_id = $2'
    const selectParams = ['company999', 'staff999']
    const selectResult = await dbUtil.executeQueryRead(selectQuery, selectParams, 'IT-009-05-verify')

    expect(selectResult.error).toBe(false)
    expect(selectResult.body.rows.length).toBe(1)
    expect(selectResult.body.rows[0].message).toBe('IT-009-05 test')

    // 後片付け: テストデータを削除
    const deleteQuery = 'DELETE FROM iw_locatetbl WHERE company_id = $1 AND staff_id = $2'
    const deleteParams = ['company999', 'staff999']
    await dbUtil.executeQueryWrite(deleteQuery, deleteParams, 'IT-009-05-cleanup')
  })

  //
  // IT-009-06: エラーハンドリング確認（不正なクエリ）
  //
  test('IT-009-06: 不正なクエリでエラーハンドリングが動作する', async () => {
    // Given: 不正なSQL
    const invalidQuery = 'SELECT * FROM non_existent_table'

    // When: 不正なクエリを実行
    const result = await dbUtil.executeQuery(invalidQuery)

    // Then: エラーが返される
    expect(result).toBeDefined()
    expect(result.error).toBe(true)
  })

  //
  // IT-009-07: DB接続プールの動作確認
  //
  test('IT-009-07: 複数のクエリが順次実行できる（接続プール動作確認）', async () => {
    // Given: 複数のクエリ
    const queries = [
      'SELECT 1 as num',
      'SELECT 2 as num',
      'SELECT 3 as num'
    ]

    // When: 複数のクエリを順次実行
    const results = []
    for (const query of queries) {
      const result = await dbUtil.executeQuery(query)
      results.push(result)
    }

    // Then: 全てのクエリが正常に実行される
    expect(results.length).toBe(3)
    results.forEach((result, index) => {
      expect(result.error).toBe(false)
      expect(result.body.rows[0].num).toBe(index + 1)
    })
  })

  //
  // IT-009-08: トランザクション境界の確認
  //
  test('IT-009-08: 各クエリが独立して実行される', async () => {
    // Given: テスト用テーブルへの挿入と確認
    const testCompanyId = 'company_it009_08'
    const testStaffId = 'staff_it009_08'

    // When: 1つ目のクエリでデータ挿入
    const insertQuery = `
      INSERT INTO iw_locatetbl (company_id, staff_id, latitude, longitude, message, send_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT ON CONSTRAINT iw_locatetbl_pkey
      DO UPDATE SET latitude=$3, longitude=$4, message=$5, send_time=$6
    `
    await dbUtil.executeQueryWrite(
      insertQuery,
      [testCompanyId, testStaffId, '35.0', '139.0', 'test', new Date().toISOString()],
      'IT-009-08-insert'
    )

    // 2つ目のクエリでデータ確認
    const selectQuery = 'SELECT * FROM iw_locatetbl WHERE company_id = $1 AND staff_id = $2'
    const selectResult = await dbUtil.executeQueryRead(
      selectQuery,
      [testCompanyId, testStaffId],
      'IT-009-08-select'
    )

    // Then: データが正常に取得できる（前のクエリの結果が反映されている）
    expect(selectResult.error).toBe(false)
    expect(selectResult.body.rows.length).toBe(1)
    expect(selectResult.body.rows[0].company_id).toBe(testCompanyId)

    // 後片付け
    await dbUtil.executeQueryWrite(
      'DELETE FROM iw_locatetbl WHERE company_id = $1 AND staff_id = $2',
      [testCompanyId, testStaffId],
      'IT-009-08-cleanup'
    )
  })

})

//
// 追加: localhost環境での接続情報確認（参考テスト）
//
describe('IT-009-REF: 環境情報確認（参考）', () => {

  test('環境変数とDB接続設定を表示', () => {
    console.log('========================================')
    console.log('環境情報:')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('DATABASE_URL:', process.env.DATABASE_URL || '未設定')
    console.log('========================================')

    // このテストは常に成功（情報表示のみ）
    expect(true).toBe(true)
  })

})
