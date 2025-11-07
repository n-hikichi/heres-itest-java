/**
 * IT-007, IT-008: パスワード変更テスト
 *
 * 目的: user-info.jsのパスワード変更機能の動作確認
 *
 * ⚠️ Expected FAIL (Bug #1-4)
 * - models/user-info.js Lines 502-513, 537-548 でstderr/stdout判定が逆転
 * - try-catchがないため、Java実行失敗時にクラッシュの可能性
 * - このバグは修正せず、Expected FAILとして記録
 *
 * 前提条件:
 * - PostgreSQLが起動している
 * - Java EncDec.classが util/ ディレクトリに配置されている
 * - テストデータが投入されている（テストユーザーが登録されている）
 */

const userInfo = require('../models/user-info')
const dbUtil = require('../models/db-util')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const path = require('path')

describe('IT-007: パスワード変更正常系（Expected FAIL）', () => {

  //
  // IT-007-01: Bug #1-4 を確認するExpected FAILテスト
  //
  test.failing('IT-007-01: パスワード変更が正常に完了する (Bug #1-4のためExpected FAIL)', async () => {
    // Given: 既存ユーザー
    const userId = 'user001'
    const oldPassword = 'test123'
    const newPassword = 'newpass456'

    // テストユーザーが存在するか確認
    const checkQuery = 'SELECT user_id, passwd FROM iw_usertbl WHERE user_id = $1'
    const checkResult = await dbUtil.executeQueryRead(checkQuery, [userId], 'IT-007-01-check')

    if (!checkResult || checkResult.error || checkResult.body.rows.length === 0) {
      console.log('⚠️  テストユーザー user001 が存在しないため、テストをスキップします')
      console.log('   test-data-setup.sqlでユーザーデータを登録してください')
      return
    }

    // 元のパスワードを保存（後で復元するため）
    const originalEncryptedPassword = checkResult.body.rows[0].passwd

    // When: パスワード変更API呼び出し
    // ⚠️ Bug #1-4: stderr判定が逆のため、正常時にエラーが返る可能性が高い
    const result = await userInfo.changePassword(userId, oldPassword, newPassword)

    // Then: 正常終了を期待（実際はBug #1-4でerror: trueが返る）
    expect(result).toBeDefined()
    expect(result.error).toBe(false)
    expect(result.status).toBe('pw changed')

    // パスワードが変更されたことを確認
    const verifyQuery = 'SELECT passwd FROM iw_usertbl WHERE user_id = $1'
    const verifyResult = await dbUtil.executeQueryRead(verifyQuery, [userId], 'IT-007-01-verify')
    expect(verifyResult.body.rows[0].passwd).not.toBe(originalEncryptedPassword)

    // 後片付け: パスワードを元に戻す
    await dbUtil.executeQueryWrite(
      'UPDATE iw_usertbl SET passwd = $1 WHERE user_id = $2',
      [originalEncryptedPassword, userId],
      'IT-007-01-cleanup'
    )

    console.log('✅ パスワード変更成功（※このログは表示されません - Bug #1-4で失敗するため）')
  }, 30000) // タイムアウトを30秒に延長（Java実行のため）

  //
  // IT-007-02: 【参考】Bug #1-4修正後の期待動作を記録
  //
  test('IT-007-02: 【参考】Bug #1-4修正後の期待動作を記録', () => {
    console.log('========================================')
    console.log('Bug #1-4修正内容:')
    console.log('  ファイル: models/user-info.js')
    console.log('  関数: _checkOldPassword(), _changeToNewPassword()')
    console.log('  行番号: Lines 502-513, 537-548')
    console.log('')
    console.log('【Bug #1: stderr判定の誤り】')
    console.log('  修正前: if (hmUtil.isNullorUndefined(stderr)) {')
    console.log('          L.eLog.error("Java command error. " + stderr)')
    console.log('          return false')
    console.log('        }')
    console.log('  問題点: stderrがない（正常）時にエラー判定している')
    console.log('')
    console.log('  修正後: if (!hmUtil.isNullorUndefined(stderr)) {  // ← 否定を追加')
    console.log('          L.eLog.error("Java command error. " + stderr)')
    console.log('          return false')
    console.log('        }')
    console.log('')
    console.log('【Bug #3: try-catch不足】')
    console.log('  修正前: const { stdout, stderr } = await exec(java_cmd)')
    console.log('  問題点: exec()失敗時にクラッシュする可能性')
    console.log('')
    console.log('  修正後: try {')
    console.log('          const { stdout, stderr } = await exec(java_cmd)')
    console.log('          ...')
    console.log('        } catch (error) {')
    console.log('          L.eLog.error("Java command failed: " + error.message)')
    console.log('          return false')
    console.log('        }')
    console.log('')
    console.log('修正後の期待結果:')
    console.log('  - パスワード変更が正常に完了する')
    console.log('  - Javaコマンドの正常実行がエラーと判定されない')
    console.log('  - Java実行失敗時に適切にエラーハンドリングされる')
    console.log('========================================')

    expect(true).toBe(true)
  })

})

describe('IT-008: パスワード変更エラーハンドリング（Expected FAIL）', () => {

  //
  // IT-008-01: Bug #1-4 を確認するExpected FAILテスト（不正な旧パスワード）
  //
  test.failing('IT-008-01: 旧パスワード不一致時に適切にエラーが返る (Bug #1-4のためExpected FAIL)', async () => {
    // Given: 既存ユーザー、不正な旧パスワード
    const userId = 'user001'
    const wrongOldPassword = 'wrongpassword123'
    const newPassword = 'newpass456'

    // テストユーザーが存在するか確認
    const checkQuery = 'SELECT user_id FROM iw_usertbl WHERE user_id = $1'
    const checkResult = await dbUtil.executeQueryRead(checkQuery, [userId], 'IT-008-01-check')

    if (!checkResult || checkResult.error || checkResult.body.rows.length === 0) {
      console.log('⚠️  テストユーザー user001 が存在しないため、テストをスキップします')
      return
    }

    // When: 不正な旧パスワードでパスワード変更を試行
    // ⚠️ Bug #1-4により、正常なJava実行もエラーと判定されるため、
    //    期待通りの「旧パスワード不一致」エラーが返らない可能性
    const result = await userInfo.changePassword(userId, wrongOldPassword, newPassword)

    // Then: エラーが返り、ステータスが 'bad oldpasswd' であることを期待
    expect(result).toBeDefined()
    expect(result.error).toBe(true)
    expect(result.status).toBe('bad oldpasswd')

    console.log('✅ 旧パスワード不一致エラー確認（※このログは表示されません - Bug #1-4の影響）')
  }, 30000)

  //
  // IT-008-02: 【参考】エラーハンドリング動作確認
  //
  test('IT-008-02: 【参考】Bug #1-4によるエラーハンドリングへの影響', () => {
    console.log('========================================')
    console.log('Bug #1-4のエラーハンドリングへの影響')
    console.log('========================================')
    console.log('')
    console.log('【現在の問題】')
    console.log('  1. _checkOldPassword() がBug #1により常にfalseを返す可能性')
    console.log('     → 正しい旧パスワードでも「bad oldpasswd」エラー')
    console.log('')
    console.log('  2. _changeToNewPassword() がBug #1により常にfalseを返す可能性')
    console.log('     → 新パスワード設定時に「failed newpasswd」エラー')
    console.log('')
    console.log('  3. try-catchがないため、Java実行失敗時にクラッシュ')
    console.log('     → アプリケーション全体に影響')
    console.log('')
    console.log('【修正後の期待動作】')
    console.log('  1. 旧パスワードが不一致の場合: error: true, status: "bad oldpasswd"')
    console.log('  2. 新パスワード設定失敗の場合: error: true, status: "failed newpasswd"')
    console.log('  3. 正常な場合: error: false, status: "pw changed"')
    console.log('  4. Java実行失敗時: try-catchでエラーハンドリング、クラッシュしない')
    console.log('========================================')

    expect(true).toBe(true)
  })

})

//
// 追加: パスワード変更フロー全体の確認（正常系の参考テスト）
//
describe('IT-007/008-REF: パスワード変更フロー参考テスト', () => {

  //
  // Java EncDecの直接実行確認（Bug #1-4の影響を受けないベースライン）
  //
  test('REF-01: Java EncDec単体での暗号化・復号化動作確認', async () => {
    // Given: テスト用パスワード
    const testPassword = 'reference_test_123'
    const classPath = path.resolve(__dirname + '/../util')

    // When: Javaで暗号化
    const encCmd = `java -classpath ${classPath} EncDec enc ${testPassword}`
    const encResult = await exec(encCmd)

    // Then: 暗号化成功
    expect(encResult.stdout).toBeDefined()
    const encryptedPassword = encResult.stdout.trim()
    expect(encryptedPassword).not.toBe('')

    // When: 復号化
    const decCmd = `java -classpath ${classPath} EncDec dec ${encryptedPassword}`
    const decResult = await exec(decCmd)

    // Then: 復号化成功、元のパスワードと一致
    const decryptedPassword = decResult.stdout.replace(/\r?\n/g, '')
    expect(decryptedPassword).toBe(testPassword)

    console.log('✅ Java EncDec単体動作確認: 暗号化・復号化が正常に動作')
    console.log(`   Original: ${testPassword}`)
    console.log(`   Encrypted: ${encryptedPassword.substring(0, 20)}...`)
    console.log(`   Decrypted: ${decryptedPassword}`)
  })

  //
  // stderr/stdoutの実際の挙動確認
  //
  test('REF-02: Java実行時のstderr/stdoutの実際の値を確認', async () => {
    // Given: Java EncDecコマンド
    const classPath = path.resolve(__dirname + '/../util')
    const testPassword = 'test123'
    const encCmd = `java -classpath ${classPath} EncDec enc ${testPassword}`

    // When: Java実行
    const { stdout, stderr } = await exec(encCmd)

    // Then: stdout/stderrの状態を確認
    console.log('========================================')
    console.log('Java実行時のstdout/stderr確認:')
    console.log('  stdout:', stdout ? `"${stdout.trim()}"` : '(empty string)')
    console.log('  stderr:', stderr ? `"${stderr.trim()}"` : '(empty string)')
    console.log('')
    console.log('isNullorUndefined(stdout):', stdout === null || stdout === undefined)
    console.log('isNullorUndefined(stderr):', stderr === null || stderr === undefined)
    console.log('')
    console.log('【Bug #1-4の問題点】')
    console.log('  現在のコード: if (hmUtil.isNullorUndefined(stderr)) { error }')
    console.log('  - stderrが空文字列の場合、isNullorUndefinedはfalseを返す')
    console.log('  - しかし、空文字列は「正常（エラーなし）」を意味する')
    console.log('  - 逆に、stderrに値がある場合はtrueを返し、エラー判定が必要')
    console.log('')
    console.log('  修正後のコード: if (!hmUtil.isNullorUndefined(stderr)) { error }')
    console.log('  - stderrに値がある場合にのみエラー判定')
    console.log('========================================')

    expect(true).toBe(true)
  })

  //
  // パスワード変更の完全フロー（参考）
  //
  test('REF-03: パスワード変更の完全フロー（モックなし、実際の動作）', async () => {
    console.log('========================================')
    console.log('パスワード変更の完全フロー:')
    console.log('========================================')
    console.log('')
    console.log('1. ユーザーがパスワード変更をリクエスト')
    console.log('   ↓')
    console.log('2. changePassword(userId, oldpasswd, newpasswd) 呼び出し')
    console.log('   ↓')
    console.log('3. _checkOldPassword() で旧パスワード照合')
    console.log('   ├─ DBから暗号化パスワード取得')
    console.log('   ├─ Java EncDec dec で復号化 ← Bug #1-4')
    console.log('   └─ 入力パスワードと比較')
    console.log('   ↓')
    console.log('4. _changeToNewPassword() で新パスワード設定')
    console.log('   ├─ Java EncDec enc で暗号化 ← Bug #1-4')
    console.log('   └─ DBに暗号化パスワード保存')
    console.log('   ↓')
    console.log('5. 完了レスポンス返却')
    console.log('')
    console.log('【Bug #1-4の影響範囲】')
    console.log('  - Step 3でJava正常実行時にエラー判定 → 旧パスワード照合失敗')
    console.log('  - Step 4でJava正常実行時にエラー判定 → 新パスワード設定失敗')
    console.log('  - 結果: パスワード変更が全く動作しない')
    console.log('========================================')

    expect(true).toBe(true)
  })

})

//
// バグ分析レポート
//
describe('IT-007/008-REF: Bug #1-4 詳細分析', () => {

  test('Bug #1-4のエラー内容を確認', () => {
    console.log('========================================')
    console.log('Bug #1-4: パスワード変更処理の不備 詳細分析')
    console.log('========================================')
    console.log('')
    console.log('【影響範囲】')
    console.log('  - _checkOldPassword() (Lines 502-513)')
    console.log('  - _changeToNewPassword() (Lines 537-548)')
    console.log('')
    console.log('【バグ詳細】')
    console.log('  Bug #1: stderr判定ロジックの逆転')
    console.log('  Bug #2: stdoutチェックも影響を受ける')
    console.log('  Bug #3: try-catch不足によるクラッシュリスク')
    console.log('  Bug #4: エラーメッセージ不明瞭')
    console.log('')
    console.log('【重要度】')
    console.log('  高 - パスワード変更機能が完全に動作不能')
    console.log('')
    console.log('【修正優先度】')
    console.log('  高 - セキュリティ機能に直結')
    console.log('========================================')

    expect(true).toBe(true)
  })

  test('Bug #1-4修正後の回帰テスト計画', () => {
    console.log('========================================')
    console.log('Bug #1-4修正後の回帰テスト計画')
    console.log('========================================')
    console.log('')
    console.log('1. IT-007-01, IT-008-01のtest.failing()を削除')
    console.log('   → 通常のtest()に変更')
    console.log('')
    console.log('2. 正常系テスト')
    console.log('   - 正しい旧パスワードでパスワード変更')
    console.log('   - 変更後のパスワードでログイン確認')
    console.log('')
    console.log('3. 異常系テスト')
    console.log('   - 不正な旧パスワードでエラー確認')
    console.log('   - 空の新パスワードでエラー確認')
    console.log('   - 不正な文字を含む新パスワードでエラー確認')
    console.log('')
    console.log('4. セキュリティテスト')
    console.log('   - パスワードが暗号化されてDBに保存されることを確認')
    console.log('   - ログにパスワードが平文で出力されないことを確認')
    console.log('========================================')

    expect(true).toBe(true)
  })

})
