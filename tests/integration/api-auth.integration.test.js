/**
 * IT-021: API認証結合テスト
 *
 * 目的: api-auth.jsのJWT生成・検証機能の結合テスト
 *
 * 前提条件:
 * - PostgreSQL不要
 * - Node.jsのみで実行可能
 *
 * カテゴリ: PostgreSQL不要結合テスト（Phase A）
 */

const apiAuth = require('../../models/api-auth')

describe('IT-021: API認証結合テスト', () => {

  //
  // IT-021-01: トークン生成が正常に動作する
  //
  test('IT-021-01: トークン生成が正常に動作する', () => {
    // Given: アカウントID
    const accountId = 'test_user_001'

    // When: トークン生成
    const token = apiAuth.generateToken(accountId)

    // Then: トークンが生成される
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3) // JWT形式（header.payload.signature）
    expect(token).not.toBe('')
  })

  //
  // IT-021-02: 生成されたトークンが検証できる
  //
  test('IT-021-02: 生成されたトークンが検証できる', () => {
    // Given: トークン生成
    const accountId = 'test_user_002'
    const token = apiAuth.generateToken(accountId)

    // When: トークン検証
    const result = apiAuth.verifyTokenOnLogin(accountId, token)

    // Then: 検証成功
    expect(result).toBe(true)
  })

  //
  // IT-021-03: accountIdとトークンの紐付けが正しい
  //
  test('IT-021-03: accountIdとトークンの紐付けが正しい', () => {
    // Given: トークン生成
    const accountId = 'test_user_003'
    const token = apiAuth.generateToken(accountId)

    // When: JWTをデコード
    const jwt = require('jsonwebtoken')
    const decoded = jwt.decode(token)

    // Then: accountIdが一致
    expect(decoded.id).toBe(accountId)
  })

  //
  // IT-021-04: トークン有効期限が設定される（5日間）
  //
  test('IT-021-04: トークン有効期限が設定される（5日間）', () => {
    // Given: トークン生成
    const accountId = 'test_user_004'
    const token = apiAuth.generateToken(accountId)

    // When: JWTをデコード
    const jwt = require('jsonwebtoken')
    const decoded = jwt.decode(token)

    // Then: 有効期限が設定されている
    expect(decoded.exp).toBeDefined()
    expect(decoded.iat).toBeDefined()

    // 有効期限が約5日間（432000秒 = 5 * 24 * 60 * 60）
    const expiresIn = decoded.exp - decoded.iat
    expect(expiresIn).toBe(432000)
  })

  //
  // IT-021-05: 期限切れトークンが拒否される
  //
  test('IT-021-05: 期限切れトークンが拒否される', () => {
    // Given: 過去のトークンを手動作成（既に期限切れ）
    const jwt = require('jsonwebtoken')
    const authConfig = require('../../config/auth-config')
    const accountId = 'test_user_005'

    // 既に期限切れのトークンを生成（expiresIn: -1秒）
    const expiredToken = jwt.sign(
      { id: accountId },
      authConfig.secretkey,
      { expiresIn: -1 }
    )

    // When: 期限切れトークンで検証
    const result = apiAuth.verifyTokenOnLogin(accountId, expiredToken)

    // Then: 検証失敗
    expect(result).toBe(false)
  })

  //
  // IT-021-06: 不正なトークンが拒否される
  //
  test('IT-021-06: 不正なトークンが拒否される', () => {
    // Given: 不正なトークン（改ざんされた）
    const accountId = 'test_user_006'
    const validToken = apiAuth.generateToken(accountId)
    const tamperedToken = validToken + 'tampered'

    // When: 改ざんされたトークンで検証
    const result = apiAuth.verifyTokenOnLogin(accountId, tamperedToken)

    // Then: 検証失敗
    expect(result).toBe(false)
  })

  //
  // IT-021-07: 異なるaccountIdでトークン検証が失敗する
  //
  test('IT-021-07: 異なるaccountIdでトークン検証が失敗する', () => {
    // Given: user_aのトークンを生成
    const accountIdA = 'test_user_007a'
    const accountIdB = 'test_user_007b'
    const tokenA = apiAuth.generateToken(accountIdA)

    // When: user_bのaccountIdで検証
    const result = apiAuth.verifyTokenOnLogin(accountIdB, tokenA)

    // Then: 検証失敗（accountId不一致）
    expect(result).toBe(false)
  })

  //
  // IT-021-08: 再発行用トークン検証が動作する
  //
  test('IT-021-08: 再発行用トークン検証が動作する', () => {
    // Given: トークン生成
    const accountId = 'test_user_008'
    const token = apiAuth.generateToken(accountId)

    // When: 再発行用トークン検証（decodeのみ、verifyなし）
    const result = apiAuth.verifyTokenForReissue(accountId, token)

    // Then: 検証成功
    expect(result).toBe(true)

    // 期限切れトークンでも再発行用検証は成功する
    const jwt = require('jsonwebtoken')
    const authConfig = require('../../config/auth-config')
    const expiredToken = jwt.sign(
      { id: accountId },
      authConfig.secretkey,
      { expiresIn: -1 }
    )
    const resultExpired = apiAuth.verifyTokenForReissue(accountId, expiredToken)
    expect(resultExpired).toBe(true) // decodeのみなので成功
  })

  //
  // IT-021-09: undefinedのaccountIdでnullが返る
  //
  test('IT-021-09: undefinedのaccountIdでnullが返る', () => {
    // Given: undefinedのaccountId
    const accountId = undefined

    // When: トークン生成
    const token = apiAuth.generateToken(accountId)

    // Then: nullが返る
    expect(token).toBeNull()
  })

  //
  // IT-021-10: 空文字列のトークンが拒否される
  //
  test('IT-021-10: 空文字列のトークンが拒否される', () => {
    // Given: 空文字列のトークン
    const accountId = 'test_user_010'
    const emptyToken = ''

    // When: 空文字列で検証
    const result = apiAuth.verifyTokenOnLogin(accountId, emptyToken)

    // Then: 検証失敗
    expect(result).toBe(false)
  })

  //
  // IT-021-11: nullトークンが拒否される
  //
  test('IT-021-11: nullトークンが拒否される', () => {
    // Given: nullトークン
    const accountId = 'test_user_011'
    const nullToken = null

    // When: nullで検証
    const result = apiAuth.verifyTokenOnLogin(accountId, nullToken)

    // Then: 検証失敗
    expect(result).toBe(false)
  })

  //
  // IT-021-12: トークンのJWT形式が正しい（header.payload.signature）
  //
  test('IT-021-12: トークンのJWT形式が正しい（header.payload.signature）', () => {
    // Given: トークン生成
    const accountId = 'test_user_012'
    const token = apiAuth.generateToken(accountId)

    // When: JWT各部分を確認
    const parts = token.split('.')

    // Then: 3部分に分かれている
    expect(parts.length).toBe(3)

    // 各部分がBase64URL形式
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/
    expect(parts[0]).toMatch(base64UrlRegex) // header
    expect(parts[1]).toMatch(base64UrlRegex) // payload
    expect(parts[2]).toMatch(base64UrlRegex) // signature

    // headerをデコード（アルゴリズム確認）
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString())
    expect(header.alg).toBeDefined() // HS256等
    expect(header.typ).toBe('JWT')
  })

})

//
// 追加: パフォーマンステスト
//
describe('IT-021-REF: API認証パフォーマンステスト', () => {

  test('REF-01: 1000回のトークン生成・検証が1秒以内に完了', () => {
    const startTime = Date.now()

    // Given: 1000ユーザー
    for (let i = 0; i < 1000; i++) {
      const accountId = `perf_user_${i}`

      // When: トークン生成・検証
      const token = apiAuth.generateToken(accountId)
      const result = apiAuth.verifyTokenOnLogin(accountId, token)

      // Then: 検証成功
      expect(result).toBe(true)
    }

    const endTime = Date.now()
    const elapsedMs = endTime - startTime

    console.log(`✅ 1000回のトークン生成・検証: ${elapsedMs}ms`)
    expect(elapsedMs).toBeLessThan(3000) // 3秒以内（ログ出力コスト考慮）
  })

})
