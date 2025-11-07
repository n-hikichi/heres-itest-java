/**
 * IT-010: Java連携認証テスト
 *
 * 目的: login-auth.jsのJava EncDec連携とDB認証の動作確認
 *
 * 前提条件:
 * - PostgreSQLが起動している
 * - Java EncDec.classが util/ ディレクトリに配置されている
 * - テストデータが投入されている（テストユーザーが登録されている）
 *
 * ⚠️ 注意:
 * login-auth.js Line 84-92 には user-info.js と同様のバグ（stderr判定の逆転）が存在しますが、
 * 実行環境によっては stderrが空文字列（not undefined）で返るため、バグが顕在化しない可能性があります。
 * このテストは実際の動作を確認することを目的としています。
 */

const loginAuth = require('../models/login-auth')
const dbUtil = require('../models/db-util')
const apiAuth = require('../models/api-auth')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const path = require('path')

describe('IT-010: Java連携認証テスト', () => {

  //
  // IT-010-01: Java EncDec環境確認
  //
  test('IT-010-01: Java EncDecコマンドが正常に実行できる', async () => {
    // Given: Java EncDec.classが配置されている
    const classPath = path.resolve(__dirname + '/../util')
    const testPassword = 'test123'

    // When: Javaで暗号化を実行
    const encCmd = `java -classpath ${classPath} EncDec enc ${testPassword}`
    const encResult = await exec(encCmd)

    // Then: 暗号化が成功する
    expect(encResult.stdout).toBeDefined()
    expect(encResult.stdout.trim()).not.toBe('')
    const encryptedPassword = encResult.stdout.trim()

    // When: 暗号化されたパスワードを復号化
    const decCmd = `java -classpath ${classPath} EncDec dec ${encryptedPassword}`
    const decResult = await exec(decCmd)

    // Then: 復号化されたパスワードが元のパスワードと一致する
    expect(decResult.stdout).toBeDefined()
    const decryptedPassword = decResult.stdout.replace(/\r?\n/g, '')
    expect(decryptedPassword).toBe(testPassword)

    console.log('✅ Java EncDec動作確認: 暗号化・復号化が正常に動作')
  })

  //
  // IT-010-02: 認証成功テスト（ID/パスワード）
  //
  test('IT-010-02: 正しいID/パスワードで認証が成功する', async () => {
    // Given: テストデータとして登録済みのユーザー
    // ※ test-data-setup.sqlでユーザーが登録されている前提
    // 実際のデータに合わせて調整してください

    // まず、テスト用ユーザーをDBに登録（または既存ユーザーを確認）
    // ここでは仮にメールアドレス 'test@example.com' を使用
    const testEmail = 'test@example.com'
    const testPassword = 'test123'

    // テスト用ユーザーが存在するか確認
    const checkQuery = 'SELECT * FROM iw_usertbl WHERE mail = $1'
    const checkResult = await dbUtil.executeQueryRead(checkQuery, [testEmail], 'IT-010-02-check')

    if (!checkResult || checkResult.error || checkResult.body.rows.length === 0) {
      console.log('⚠️  テストユーザーが存在しないため、テストをスキップします')
      console.log('   test-data-setup.sqlでユーザーデータを登録してください')
      return // テストをスキップ
    }

    // When: authenticate メソッドを呼び出し
    const result = await loginAuth.authenticate(testEmail, testPassword)

    // Then: 認証が成功し、ユーザー情報とトークンが返る
    if (result === null) {
      console.log('⚠️  認証が失敗しました。Bug #1-4（stderr判定）が顕在化している可能性があります')
      console.log('   または、DBのパスワードが暗号化されていない可能性があります')
      // このケースはExpected FAILとして扱うべきかもしれません
      expect(result).not.toBeNull() // あえて失敗させて問題を明示
    } else {
      expect(result).toBeDefined()
      expect(result.user_id).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.company_id).toBeDefined()
      expect(result.staff_id).toBeDefined()
      console.log('✅ 認証成功: ユーザー情報とトークンが返却されました')
    }
  }, 30000) // タイムアウトを30秒に延長（Java実行のため）

  //
  // IT-010-03: 認証失敗テスト（不正なパスワード）
  //
  test('IT-010-03: 不正なパスワードで認証が失敗する', async () => {
    // Given: 登録済みのユーザー、不正なパスワード
    const testEmail = 'test@example.com'
    const wrongPassword = 'wrongpassword123'

    // テスト用ユーザーが存在するか確認
    const checkQuery = 'SELECT * FROM iw_usertbl WHERE mail = $1'
    const checkResult = await dbUtil.executeQueryRead(checkQuery, [testEmail], 'IT-010-03-check')

    if (!checkResult || checkResult.error || checkResult.body.rows.length === 0) {
      console.log('⚠️  テストユーザーが存在しないため、テストをスキップします')
      return // テストをスキップ
    }

    // When: 不正なパスワードで認証
    const result = await loginAuth.authenticate(testEmail, wrongPassword)

    // Then: 認証が失敗し、nullが返る
    expect(result).toBeNull()
    console.log('✅ 認証失敗: 不正なパスワードで正しくnullが返却されました')
  }, 30000)

  //
  // IT-010-04: 認証失敗テスト（存在しないユーザー）
  //
  test('IT-010-04: 存在しないユーザーで認証が失敗する', async () => {
    // Given: 存在しないユーザーID
    const nonExistentEmail = 'nonexistent@example.com'
    const password = 'anypassword'

    // When: 存在しないユーザーで認証
    const result = await loginAuth.authenticate(nonExistentEmail, password)

    // Then: 認証が失敗し、nullが返る
    expect(result).toBeNull()
    console.log('✅ 認証失敗: 存在しないユーザーで正しくnullが返却されました')
  })

  //
  // IT-010-05: トークン認証テスト（authenticateByToken）
  //
  test('IT-010-05: 有効なトークンでトークン認証が成功する', async () => {
    // Given: 有効なトークン
    const testUserId = 'user001'
    const testToken = apiAuth.generateToken(testUserId)

    // テスト用ユーザーが存在するか確認
    const checkQuery = 'SELECT * FROM iw_usertbl WHERE user_id = $1'
    const checkResult = await dbUtil.executeQueryRead(checkQuery, [testUserId], 'IT-010-05-check')

    if (!checkResult || checkResult.error || checkResult.body.rows.length === 0) {
      console.log('⚠️  テストユーザー user001 が存在しないため、テストをスキップします')
      return
    }

    // When: トークン認証
    const result = await loginAuth.authenticateByToken(testUserId, testToken)

    // Then: 認証が成功し、新しいトークンが返る
    expect(result).toBeDefined()
    expect(result).not.toBeNull()
    if (result && result.user_id !== 'end') {
      expect(result.token).toBeDefined()
      expect(result.user_id).toBe(testUserId)
      console.log('✅ トークン認証成功: 新しいトークンが発行されました')
    } else if (result && result.user_id === 'end') {
      console.log('⚠️  アカウントが停止状態です')
    }
  })

  //
  // IT-010-06: トークン認証失敗テスト（不正なトークン）
  //
  test('IT-010-06: 不正なトークンでトークン認証が失敗する', async () => {
    // Given: 不正なトークン
    const testUserId = 'user001'
    const invalidToken = 'invalid_token_string'

    // When: 不正なトークンで認証
    const result = await loginAuth.authenticateByToken(testUserId, invalidToken)

    // Then: 認証が失敗し、nullが返る
    expect(result).toBeNull()
    console.log('✅ トークン認証失敗: 不正なトークンで正しくnullが返却されました')
  })

  //
  // IT-010-07: トークン再発行テスト
  //
  test('IT-010-07: 有効なトークンで新しいトークンが再発行される', async () => {
    // Given: 有効なトークン
    const testUserId = 'user001'
    const oldToken = apiAuth.generateToken(testUserId)

    // When: トークン再発行
    const newToken = await loginAuth.reissueLoginToken(testUserId, oldToken)

    // Then: 新しいトークンが発行される
    expect(newToken).toBeDefined()
    expect(newToken).not.toBeNull()
    expect(typeof newToken).toBe('string')
    expect(newToken).not.toBe(oldToken) // 新しいトークンは古いものと異なる
    console.log('✅ トークン再発行成功: 新しいトークンが発行されました')
  })

  //
  // IT-010-08: アカウント停止状態のユーザー認証テスト
  //
  test('IT-010-08: アカウント停止状態のユーザーで特殊な応答が返る', async () => {
    // Given: パスワードが 'end' で始まるアカウント停止ユーザー
    // ※ テストデータに停止ユーザーが必要

    // テスト用停止ユーザーをDBに準備（または既存データを確認）
    const suspendedEmail = 'suspended@example.com'
    const checkQuery = 'SELECT * FROM iw_usertbl WHERE mail = $1'
    const checkResult = await dbUtil.executeQueryRead(checkQuery, [suspendedEmail], 'IT-010-08-check')

    if (!checkResult || checkResult.error || checkResult.body.rows.length === 0) {
      console.log('⚠️  停止ユーザーが存在しないため、テストをスキップします')
      console.log('   test-data-setup.sqlでパスワードが "end..." で始まるユーザーを登録してください')
      return
    }

    const dbPassword = checkResult.body.rows[0].passwd
    if (!dbPassword.startsWith('end')) {
      console.log('⚠️  ユーザーのパスワードが "end" で始まっていないため、テストをスキップします')
      return
    }

    // When: アカウント停止ユーザーで認証
    const result = await loginAuth.authenticate(suspendedEmail, 'anypassword')

    // Then: {user_id: 'end'} が返る
    expect(result).toBeDefined()
    expect(result.user_id).toBe('end')
    console.log('✅ アカウント停止確認: user_id="end" が返却されました')
  }, 30000)

  //
  // IT-010-09: Java連携エラーハンドリング確認
  //
  test('IT-010-09: Javaクラスパスが不正な場合のエラーハンドリング', async () => {
    // Given: 不正なクラスパス
    const invalidClassPath = '/invalid/path/to/java/classes'
    const testCmd = `java -classpath ${invalidClassPath} EncDec enc test`

    // When: Javaコマンドを実行（失敗が期待される）
    try {
      await exec(testCmd)
      // 失敗が期待されるため、ここに到達したらテスト失敗
      expect(true).toBe(false) // 強制的に失敗
    } catch (error) {
      // Then: エラーがキャッチされる
      expect(error).toBeDefined()
      console.log('✅ エラーハンドリング確認: 不正なクラスパスでエラーが発生しました')
    }
  })

})

//
// 追加: 環境情報確認（参考）
//
describe('IT-010-REF: 環境情報確認（参考）', () => {

  test('Java環境とクラスパスを表示', async () => {
    console.log('========================================')
    console.log('Java環境情報:')

    try {
      // Javaバージョン確認
      const javaVersionResult = await exec('java -version')
      console.log('Java Version:', javaVersionResult.stderr || javaVersionResult.stdout)

      // クラスパス確認
      const classPath = path.resolve(__dirname + '/../util')
      console.log('EncDec ClassPath:', classPath)

      // EncDec.classの存在確認
      const fs = require('fs')
      const encDecPath = path.join(classPath, 'EncDec.class')
      const encDecExists = fs.existsSync(encDecPath)
      console.log('EncDec.class exists:', encDecExists)

    } catch (error) {
      console.log('Java環境確認エラー:', error.message)
    }

    console.log('========================================')

    expect(true).toBe(true)
  })

})
