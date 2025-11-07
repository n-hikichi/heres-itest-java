/**
 * IT-025: 設定ファイル結合テスト
 *
 * 目的: config/auth-config.jsの設定値読み込み・使用の結合テスト
 *
 * 前提条件:
 * - PostgreSQL不要
 * - Java不要
 * - Node.jsのみで実行可能
 *
 * カテゴリ: PostgreSQL不要結合テスト（追加提案）
 */

const authConfig = require('../config/auth-config')
const jwt = require('jsonwebtoken')

describe('IT-025: 設定ファイル結合テスト', () => {

  //
  // IT-025-01: APIトークンsecretkey読み込み確認
  //
  test('IT-025-01: APIトークンsecretkey読み込み確認', () => {
    // When: auth-configからsecreytkeyを読み込む
    const secretkey = authConfig.secretkey

    // Then: secretkeyが定義されている
    expect(secretkey).toBeDefined()
    expect(typeof secretkey).toBe('string')
    expect(secretkey.length).toBeGreaterThan(0)

    // 十分な長さがある（セキュリティ上最低16文字以上推奨）
    expect(secretkey.length).toBeGreaterThanOrEqual(16)
  })

  //
  // IT-025-02: secretkeyがJWT署名に使用できる
  //
  test('IT-025-02: secretkeyがJWT署名に使用できる', () => {
    // Given: テストペイロード
    const payload = { id: 'test_user_025', role: 'admin' }

    // When: secretkeyでJWT署名
    const token = jwt.sign(payload, authConfig.secretkey, { expiresIn: '1h' })

    // Then: トークンが生成される
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // JWT形式

    // Then: トークンが検証できる
    const decoded = jwt.verify(token, authConfig.secretkey)
    expect(decoded.id).toBe('test_user_025')
    expect(decoded.role).toBe('admin')
  })

  //
  // IT-025-03: 設定値がシングルトンで共有される
  //
  test('IT-025-03: 設定値がシングルトンで共有される', () => {
    // Given: 同じモジュールを複数回require
    const config1 = require('../config/auth-config')
    const config2 = require('../config/auth-config')

    // When: 各々からsecreytkeyを読み込む
    const secretkey1 = config1.secretkey
    const secretkey2 = config2.secretkey

    // Then: 同じ値が返る（シングルトン）
    expect(secretkey1).toBe(secretkey2)

    // Then: オブジェクト自体も同一参照
    expect(config1).toBe(config2)
  })

  //
  // IT-025-04: 設定値が静的に定義されている（環境変数に依存しない）
  //
  test('IT-025-04: 設定値が静的に定義されている（環境変数に依存しない）', () => {
    // Given: 元のsecretkeyを保存
    const originalSecretkey = authConfig.secretkey

    // When: 環境変数を一時的に変更
    const originalEnv = process.env.SECRET_KEY
    process.env.SECRET_KEY = 'test_override_secret_key_12345'

    // モジュールキャッシュをクリアして再読み込み
    delete require.cache[require.resolve('../config/auth-config')]
    const newConfig = require('../config/auth-config')

    // Then: 環境変数の影響を受けない（静的な値が使用される）
    expect(newConfig.secretkey).toBe('MicrosHeresMeSecKey')
    expect(newConfig.secretkey).toBe(originalSecretkey)
    expect(newConfig.secretkey).not.toBe('test_override_secret_key_12345')

    // Cleanup: 元の環境変数に戻す
    if (originalEnv !== undefined) {
      process.env.SECRET_KEY = originalEnv
    } else {
      delete process.env.SECRET_KEY
    }

    // モジュールキャッシュをクリア（次のテストに影響させない）
    delete require.cache[require.resolve('../config/auth-config')]
  })

  //
  // IT-025-05: 設定オブジェクトの構造確認
  //
  test('IT-025-05: 設定オブジェクトの構造確認', () => {
    // Given: auth-configを読み込む
    const config = require('../config/auth-config')

    // Then: オブジェクト形式で定義されている
    expect(typeof config).toBe('object')
    expect(config).not.toBeNull()

    // Then: secretkeyプロパティが存在する
    expect(config).toHaveProperty('secretkey')
    expect(typeof config.secretkey).toBe('string')
    expect(config.secretkey).toBe('MicrosHeresMeSecKey')

    // Then: secretkeyのみが定義されている（余計なプロパティがない）
    const keys = Object.keys(config)
    expect(keys.length).toBe(1)
    expect(keys[0]).toBe('secretkey')
  })

})

//
// 追加: auth-config使用の実用的テスト
//
describe('IT-025-REF: auth-config実用結合テスト', () => {

  test('REF-01: secretkeyの長さが十分である（推奨: 32文字以上）', () => {
    // When: secretkeyの長さを確認
    const secretkey = authConfig.secretkey

    // Then: 最低16文字以上（現在19文字）
    expect(secretkey.length).toBeGreaterThanOrEqual(16)

    // セキュリティ推奨: 32文字以上が理想
    // 現在: 19文字（「MicrosHeresMeSecKey」）
    console.log(`Current secretkey length: ${secretkey.length} characters`)
  })

  test('REF-02: secretkeyに特殊文字が含まれていない', () => {
    // When: secretkeyの文字種を確認
    const secretkey = authConfig.secretkey

    // Then: 英数字のみ（特殊文字なし）
    const alphanumericRegex = /^[A-Za-z0-9]+$/
    expect(secretkey).toMatch(alphanumericRegex)
  })

  test('REF-03: 複数のJWTトークンを連続生成・検証できる', () => {
    // Given: 複数のユーザーID
    const userIds = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005']

    // When: 各ユーザーのトークンを生成・検証
    userIds.forEach(userId => {
      const token = jwt.sign({ id: userId }, authConfig.secretkey, { expiresIn: '1h' })
      const decoded = jwt.verify(token, authConfig.secretkey)

      // Then: 各トークンが正しく検証できる
      expect(decoded.id).toBe(userId)
    })
  })

  test('REF-04: 異なる署名キーでトークンが検証されない', () => {
    // Given: 異なる署名キーでトークンを生成
    const payload = { id: 'test_user' }
    const differentKey = 'DifferentSecretKey123'
    const tokenWithDifferentKey = jwt.sign(payload, differentKey, { expiresIn: '1h' })

    // When: auth-configのキーで検証を試みる
    // Then: 検証エラーが発生する
    expect(() => {
      jwt.verify(tokenWithDifferentKey, authConfig.secretkey)
    }).toThrow('invalid signature')
  })

})
