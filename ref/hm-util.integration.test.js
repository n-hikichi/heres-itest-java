/**
 * IT-022: ユーティリティ関数結合テスト
 *
 * 目的: hm-util.jsの各種ユーティリティ関数の結合テスト
 *
 * 前提条件:
 * - PostgreSQL不要
 * - Node.jsのみで実行可能
 *
 * カテゴリ: PostgreSQL不要結合テスト（Phase A）
 */

const hmUtil = require('../util/hm-util')

describe('IT-022: ユーティリティ関数結合テスト', () => {

  //
  // IT-022-01: isNullorUndefined: nullを正しく判定
  //
  test('IT-022-01: isNullorUndefined: nullを正しく判定', () => {
    // Given: null値
    const value = null

    // When: Null判定
    const result = hmUtil.isNullorUndefined(value)

    // Then: trueが返る
    expect(result).toBe(true)
  })

  //
  // IT-022-02: isNullorUndefined: undefinedを正しく判定
  //
  test('IT-022-02: isNullorUndefined: undefinedを正しく判定', () => {
    // Given: undefined値
    const value = undefined

    // When: Undefined判定
    const result = hmUtil.isNullorUndefined(value)

    // Then: trueが返る
    expect(result).toBe(true)
  })

  //
  // IT-022-03: isNullorUndefined: 空文字列は判定しない
  //
  test('IT-022-03: isNullorUndefined: 空文字列はfalseを返す', () => {
    // Given: 空文字列
    const value = ''

    // When: Null/Undefined判定
    const result = hmUtil.isNullorUndefined(value)

    // Then: falseが返る（空文字列はnull/undefinedではない）
    expect(result).toBe(false)
  })

  //
  // IT-022-04: formatDate: YYYY-MM-DD形式で日付フォーマット
  //
  test('IT-022-04: formatDate: YYYY-MM-DD形式で日付フォーマット', () => {
    // Given: 日付オブジェクト（2025年11月6日）
    const date = new Date('2025-11-06T12:34:56')

    // When: YYYY-MM-DD形式でフォーマット
    const result = hmUtil.formatDate(date, 'YYYY-MM-DD')

    // Then: 正しくフォーマットされる
    expect(result).toBe('2025-11-06')
  })

  //
  // IT-022-05: formatDate: YYYY-MM-DD hh:mm:ss形式
  //
  test('IT-022-05: formatDate: YYYY-MM-DD hh:mm:ss形式', () => {
    // Given: 日付オブジェクト
    const date = new Date('2025-11-06T12:34:56')

    // When: デフォルトフォーマット（時刻含む）
    const result = hmUtil.formatDate(date)

    // Then: 正しくフォーマットされる
    expect(result).toBe('2025-11-06 12:34:56')
  })

  //
  // IT-022-06: formatDate: ミリ秒を含む形式
  //
  test('IT-022-06: formatDate: ミリ秒を含む形式', () => {
    // Given: 日付オブジェクト（ミリ秒付き）
    const date = new Date('2025-11-06T12:34:56.789')

    // When: ミリ秒を含む形式でフォーマット
    const result = hmUtil.formatDate(date, 'YYYY-MM-DD hh:mm:ss.SSS')

    // Then: ミリ秒まで正しくフォーマットされる
    expect(result).toBe('2025-11-06 12:34:56.789')
  })

  //
  // IT-022-07: calcMonth: 月加算が正しく動作（+3ヶ月）
  //
  test('IT-022-07: calcMonth: 月加算が正しく動作（+3ヶ月）', () => {
    // Given: 2025年11月1日
    const date = '20251101'

    // When: 3ヶ月加算
    const result = hmUtil.calcMonth(date, 3)

    // Then: 2026年2月1日になる
    expect(result).toBe('20260201')
  })

  //
  // IT-022-08: calcMonth: 月減算が正しく動作（-2ヶ月）
  //
  test('IT-022-08: calcMonth: 月減算が正しく動作（-2ヶ月）', () => {
    // Given: 2025年11月1日
    const date = '20251101'

    // When: 2ヶ月減算
    const result = hmUtil.calcMonth(date, -2)

    // Then: 2025年9月1日になる
    expect(result).toBe('20250901')
  })

  //
  // IT-022-09: calcMonth: 年をまたぐ月計算（12月+2ヶ月）
  //
  test('IT-022-09: calcMonth: 年をまたぐ月計算（12月+2ヶ月）', () => {
    // Given: 2025年12月1日
    const date = '20251201'

    // When: 2ヶ月加算
    const result = hmUtil.calcMonth(date, 2)

    // Then: 2026年2月1日になる
    expect(result).toBe('20260201')
  })

  //
  // IT-022-10: calcDate: 日付加算が正しく動作
  //
  test('IT-022-10: calcDate: 日付加算が正しく動作（+7日）', () => {
    // Given: 2025年11月6日
    const date = '20251106'

    // When: 7日加算
    const result = hmUtil.calcDate(date, 7)

    // Then: 2025年11月13日になる
    expect(result).toBe('20251113')
  })

  //
  // IT-022-11: calcDate: 日付減算が正しく動作
  //
  test('IT-022-11: calcDate: 日付減算が正しく動作（-10日）', () => {
    // Given: 2025年11月6日
    const date = '20251106'

    // When: 10日減算
    const result = hmUtil.calcDate(date, -10)

    // Then: 2025年10月27日になる
    expect(result).toBe('20251027')
  })

  //
  // IT-022-12: calcHour: 時刻加算が正しく動作（+5時間）
  //
  test('IT-022-12: calcHour: 時刻加算が正しく動作（+5時間）', () => {
    // Given: 2025年11月6日 10:00
    const datetime = '202511061000'

    // When: 5時間加算
    const result = hmUtil.calcHour(datetime, 5)

    // Then: 2025年11月6日 15:00になる
    expect(result).toBe('202511061500')
  })

  //
  // IT-022-13: checkCliVersion: 許可バージョンを正しく判定
  //
  test('IT-022-13: checkCliVersion: 許可バージョンを正しく判定', () => {
    // Given: 許可されているバージョン
    const allowedVersions = ['2.6.3', '2.7.0', '3.0.0']

    // When: 各バージョンをチェック
    allowedVersions.forEach(version => {
      const result = hmUtil.checkCliVersion(version)
      // Then: trueが返る
      expect(result).toBe(true)
    })

    // Given: 許可されていないバージョン
    const deniedVersions = ['1.0.0', '2.5.0', '3.1.0']

    // When: 各バージョンをチェック
    deniedVersions.forEach(version => {
      const result = hmUtil.checkCliVersion(version)
      // Then: falseが返る
      expect(result).toBe(false)
    })
  })

  //
  // IT-022-14: checkIpAddressIncludedList: IPアドレス範囲判定（CIDR表記）
  //
  test('IT-022-14: checkIpAddressIncludedList: IPアドレス範囲判定（CIDR表記）', () => {
    // Given: IPアドレスとホワイトリスト
    const reqIp = '192.168.1.100'
    const ipList = ['192.168.1.0/24_社内ネットワーク']

    // When: IPアドレスチェック
    const result = hmUtil.checkIpAddressIncludedList(reqIp, ipList)

    // Then: 範囲内なのでtrueが返る
    expect(result).toBe(true)

    // Given: 範囲外のIPアドレス
    const outsideIp = '192.168.2.100'

    // When: IPアドレスチェック
    const resultOutside = hmUtil.checkIpAddressIncludedList(outsideIp, ipList)

    // Then: 範囲外なのでfalseが返る
    expect(resultOutside).toBe(false)
  })

  //
  // IT-022-15: checkIpAddressIncludedList: ワイルドカード変換
  //
  test('IT-022-15: checkIpAddressIncludedList: ワイルドカード変換', () => {
    // Given: ワイルドカードを含むIPアドレス範囲
    const reqIp = '192.168.1.100'
    const ipListWithWildcard = ['192.168.1.*_社内ネットワーク']

    // When: IPアドレスチェック（内部でCIDR変換される: 192.168.1.0/24）
    const result = hmUtil.checkIpAddressIncludedList(reqIp, ipListWithWildcard)

    // Then: 範囲内なのでtrueが返る
    expect(result).toBe(true)

    // Given: 複数のワイルドカード
    const ipListWithMultiWildcard = ['192.168.*.*_社内全体']
    const reqIp2 = '192.168.5.50'

    // When: IPアドレスチェック（192.168.0.0/16に変換される）
    const result2 = hmUtil.checkIpAddressIncludedList(reqIp2, ipListWithMultiWildcard)

    // Then: 範囲内なのでtrueが返る
    expect(result2).toBe(true)
  })

})

//
// 追加: エッジケースと境界値テスト
//
describe('IT-022-REF: ユーティリティ関数エッジケーステスト', () => {

  test('REF-01: calcMonth: 月末日の加算（1月31日 + 1ヶ月）', () => {
    // Given: 2025年1月31日
    const date = '20250131'

    // When: 1ヶ月加算
    const result = hmUtil.calcMonth(date, 1)

    // Then: 2月末日（28日）になる
    expect(result).toBe('20250228')
  })

  test('REF-02: calcDate: 月をまたぐ日付加算（11月30日 + 2日）', () => {
    // Given: 2025年11月30日
    const date = '20251130'

    // When: 2日加算
    const result = hmUtil.calcDate(date, 2)

    // Then: 2025年12月2日になる
    expect(result).toBe('20251202')
  })

  test('REF-03: calcHour: 日をまたぐ時刻加算（23:00 + 3時間）', () => {
    // Given: 2025年11月6日 23:00
    const datetime = '202511062300'

    // When: 3時間加算
    const result = hmUtil.calcHour(datetime, 3)

    // Then: 2025年11月7日 02:00になる
    expect(result).toBe('202511070200')
  })

  test('REF-04: isNullorUndefinedStr: 文字列"null"を判定', () => {
    // Given: 文字列の"null"
    const value = 'null'

    // When: 文字列null判定
    const result = hmUtil.isNullorUndefinedStr(value)

    // Then: trueが返る
    expect(result).toBe(true)
  })

  test('REF-05: isNullorUndefinedStr: 文字列"undefined"を判定', () => {
    // Given: 文字列の"undefined"
    const value = 'undefined'

    // When: 文字列undefined判定
    const result = hmUtil.isNullorUndefinedStr(value)

    // Then: trueが返る
    expect(result).toBe(true)
  })

  test('REF-06: checkIpAddressIncludedList: 複数の許可IPリスト', () => {
    // Given: 複数のIPアドレス範囲
    const ipList = [
      '192.168.1.0/24_社内ネットワークA',
      '10.0.0.0/8_社内ネットワークB',
      '172.16.0.0/12_VPN'
    ]

    // When: 各範囲のIPアドレスをチェック
    const testCases = [
      { ip: '192.168.1.50', expected: true },
      { ip: '10.20.30.40', expected: true },
      { ip: '172.17.0.1', expected: true },
      { ip: '8.8.8.8', expected: false }
    ]

    testCases.forEach(testCase => {
      const result = hmUtil.checkIpAddressIncludedList(testCase.ip, ipList)
      expect(result).toBe(testCase.expected)
    })
  })

  test('REF-07: formatDate: 1桁の月・日のゼロパディング', () => {
    // Given: 2025年1月5日 3時4分5秒
    const date = new Date('2025-01-05T03:04:05')

    // When: フォーマット
    const result = hmUtil.formatDate(date, 'YYYY-MM-DD hh:mm:ss')

    // Then: ゼロパディングされる
    expect(result).toBe('2025-01-05 03:04:05')
  })

})
