# PostgreSQL不要の結合テストケース提案

**作成日**: 2025-11-06
**目的**: PostgreSQL環境なしでも実行可能な結合テストを追加し、カバレッジを向上

---

## 概要

現在の78テストケースのほとんどがPostgreSQL依存のため、DB環境がない状態ではテストを実行できません。
以下のカテゴリでPostgreSQL不要のテストを追加することで、DB環境構築前でもカバレッジを向上できます。

**提案テストケース数**: 42件（追加）
**実行環境**: Node.js + Javaのみ（PostgreSQL不要）

---

## カテゴリ別提案

### 1. API認証結合テスト（IT-021）- 12件

**ファイル**: `api-auth.integration.test.js`
**対象**: `models/api-auth.js`
**PostgreSQL**: 不要

#### テストケース

| IT番号 | テストケース | 観点 |
|:------|:-----------|:-----|
| IT-021-01 | トークン生成が正常に動作する | JWT生成 |
| IT-021-02 | 生成されたトークンが検証できる | JWT検証 |
| IT-021-03 | accountIdとトークンの紐付けが正しい | Payload確認 |
| IT-021-04 | トークン有効期限が設定される（5日間） | Expiry確認 |
| IT-021-05 | 期限切れトークンが拒否される | タイムトラベル |
| IT-021-06 | 不正なトークンが拒否される | 改ざん検知 |
| IT-021-07 | 異なるaccountIdでトークン検証が失敗する | ID不一致 |
| IT-021-08 | 再発行用トークン検証が動作する | decode検証 |
| IT-021-09 | undefinedのaccountIdでnullが返る | エッジケース |
| IT-021-10 | 空文字列のトークンが拒否される | 入力バリデーション |
| IT-021-11 | nullトークンが拒否される | Null処理 |
| IT-021-12 | トークンのJWT形式が正しい（header.payload.signature） | 形式確認 |

**実装例**:
```javascript
test('IT-021-01: トークン生成が正常に動作する', () => {
  const accountId = 'test_user_001'
  const token = apiAuth.generateToken(accountId)

  expect(token).toBeDefined()
  expect(typeof token).toBe('string')
  expect(token.split('.').length).toBe(3) // JWT形式
})

test('IT-021-05: 期限切れトークンが拒否される', () => {
  jest.useFakeTimers()

  const accountId = 'test_user_002'
  const token = apiAuth.generateToken(accountId)

  // 6日後にタイムトラベル（有効期限5日を超過）
  jest.advanceTimersByTime(6 * 24 * 60 * 60 * 1000)

  const result = apiAuth.verifyTokenOnLogin(accountId, token)
  expect(result).toBe(false)

  jest.useRealTimers()
})
```

---

### 2. ユーティリティ関数結合テスト（IT-022）- 15件

**ファイル**: `hm-util.integration.test.js`
**対象**: `util/hm-util.js`
**PostgreSQL**: 不要

#### テストケース

| IT番号 | テストケース | 観点 |
|:------|:-----------|:-----|
| IT-022-01 | isNullorUndefined: nullを正しく判定 | Null判定 |
| IT-022-02 | isNullorUndefined: undefinedを正しく判定 | Undefined判定 |
| IT-022-03 | isNullorUndefined: 空文字列は判定しない | False判定 |
| IT-022-04 | formatDate: YYYY-MM-DD形式で日付フォーマット | 基本形式 |
| IT-022-05 | formatDate: YYYY-MM-DD hh:mm:ss形式 | 時刻含む |
| IT-022-06 | formatDate: ミリ秒を含む形式 | 高精度 |
| IT-022-07 | calcMonth: 月加算が正しく動作（+3ヶ月） | 加算 |
| IT-022-08 | calcMonth: 月減算が正しく動作（-2ヶ月） | 減算 |
| IT-022-09 | calcMonth: 年をまたぐ月計算（12月+2ヶ月） | 年跨ぎ |
| IT-022-10 | calcDate: 日付加算が正しく動作 | 加算 |
| IT-022-11 | calcDate: 日付減算が正しく動作 | 減算 |
| IT-022-12 | calcHour: 時刻加算が正しく動作（+5時間） | 加算 |
| IT-022-13 | checkCliVersion: 許可バージョンを正しく判定 | ホワイトリスト |
| IT-022-14 | checkIpAddressIncludedList: IPアドレス範囲判定 | CIDR表記 |
| IT-022-15 | checkIpAddressIncludedList: ワイルドカード変換 | *変換 |

**実装例**:
```javascript
test('IT-022-09: calcMonth: 年をまたぐ月計算（12月+2ヶ月）', () => {
  const date = '20251201' // 2025年12月1日
  const result = hmUtil.calcMonth(date, 2)

  expect(result).toBe('20260201') // 2026年2月1日
})

test('IT-022-14: checkIpAddressIncludedList: IPアドレス範囲判定', () => {
  const reqIp = '192.168.1.100'
  const ipList = ['192.168.1.0/24_社内ネットワーク']

  const result = hmUtil.checkIpAddressIncludedList(reqIp, ipList)
  expect(result).toBe(true)
})
```

---

### 3. Java EncDec独立結合テスト（IT-023）- 10件

**ファイル**: `java-encdec.integration.test.js`
**対象**: `util/EncDec.class`
**PostgreSQL**: 不要
**前提**: Javaが実行可能

#### テストケース

| IT番号 | テストケース | 観点 |
|:------|:-----------|:-----|
| IT-023-01 | 短いパスワードの暗号化・復号化 | 基本動作 |
| IT-023-02 | 長いパスワード（100文字）の暗号化・復号化 | 長文 |
| IT-023-03 | 特殊文字を含むパスワード | 特殊文字 |
| IT-023-04 | 日本語を含むパスワード | Unicode |
| IT-023-05 | 空白を含むパスワード | 空白文字 |
| IT-023-06 | 同じパスワードでも暗号化結果が異なる | ランダム性 |
| IT-023-07 | 暗号化したパスワードを復号化して元に戻る | 可逆性 |
| IT-023-08 | Javaコマンド失敗時のエラーハンドリング | 異常系 |
| IT-023-09 | 不正なクラスパスでのエラー処理 | 環境エラー |
| IT-023-10 | パフォーマンス: 100回の暗号化・復号化 | 性能 |

**実装例**:
```javascript
test('IT-023-06: 同じパスワードでも暗号化結果が異なる', async () => {
  const password = 'test123'
  const classPath = path.resolve(__dirname + '/../util')

  // 1回目の暗号化
  const encCmd1 = `java -classpath ${classPath} EncDec enc ${password}`
  const result1 = await exec(encCmd1)
  const encrypted1 = result1.stdout.trim()

  // 2回目の暗号化
  const encCmd2 = `java -classpath ${classPath} EncDec enc ${password}`
  const result2 = await exec(encCmd2)
  const encrypted2 = result2.stdout.trim()

  // 暗号化結果は異なる（ソルト使用のため）
  expect(encrypted1).not.toBe(encrypted2)

  // 両方とも正しく復号化できる
  const decCmd1 = `java -classpath ${classPath} EncDec dec ${encrypted1}`
  const decResult1 = await exec(decCmd1)
  expect(decResult1.stdout.replace(/\r?\n/g, '')).toBe(password)

  const decCmd2 = `java -classpath ${classPath} EncDec dec ${encrypted2}`
  const decResult2 = await exec(decCmd2)
  expect(decResult2.stdout.replace(/\r?\n/g, '')).toBe(password)
})
```

---

### 4. HTTPミドルウェア結合テスト（IT-024）- 5件

**ファイル**: `middleware.integration.test.js`
**対象**: `app.js`のミドルウェアチェーン
**PostgreSQL**: 不要（モック使用）
**ツール**: supertest

#### テストケース

| IT番号 | テストケース | 観点 |
|:------|:-----------|:-----|
| IT-024-01 | CORSヘッダーが正しく設定される | CORS |
| IT-024-02 | Cache-Controlヘッダーが設定される | キャッシュ制御 |
| IT-024-03 | 存在しないパスで404が返る | エラーハンドリング |
| IT-024-04 | JSONボディパーサーが動作する | Body Parser |
| IT-024-05 | トークン認証ミドルウェアが動作する | 認証 |

**実装例**:
```javascript
const request = require('supertest')
const app = require('../app')

test('IT-024-01: CORSヘッダーが正しく設定される', async () => {
  const response = await request(app)
    .options('/heresme_be/login')
    .set('Origin', 'http://example.com')

  expect(response.status).toBe(200)
  expect(response.headers['access-control-allow-origin']).toBeDefined()
})

test('IT-024-03: 存在しないパスで404が返る', async () => {
  const response = await request(app)
    .get('/nonexistent/path')

  expect(response.status).toBe(404)
})
```

---

## 実装優先度

### 高優先度（すぐに実装可能）

1. **IT-021: API認証結合テスト**（12件）
   - JWT動作確認は基本機能
   - PostgreSQL不要で実行可能
   - 実装時間: 2-3時間

2. **IT-022: ユーティリティ関数結合テスト**（15件）
   - ビジネスロジックで頻繁に使用される
   - 日付計算・IP判定などクリティカル
   - 実装時間: 3-4時間

### 中優先度

3. **IT-023: Java EncDec独立結合テスト**（10件）
   - 既存テストに含まれるが独立させる価値あり
   - Java環境が必要
   - 実装時間: 2-3時間

### 低優先度

4. **IT-024: HTTPミドルウェア結合テスト**（5件）
   - E2Eテストで代替可能
   - supertest導入が必要
   - 実装時間: 2時間

---

## カバレッジ向上効果

| カテゴリ | 現在 | IT-021追加後 | IT-022追加後 | IT-023追加後 | IT-024追加後 | 合計 |
|:---------|-----:|-------------:|-------------:|-------------:|-------------:|-----:|
| PostgreSQL依存 | 78 | 78 | 78 | 78 | 78 | 78 |
| PostgreSQL不要 | 0 | 12 | 27 | 37 | 42 | 42 |
| **合計** | **78** | **90** | **105** | **115** | **120** | **120** |
| **向上率** | - | +15% | +35% | +47% | +54% | +54% |

**全Phase完了時**:
- PostgreSQL依存: 127件（Phase 3完了時）
- PostgreSQL不要: 42件（本提案）
- **総合計: 169件**（+117%向上）

---

## 実装手順

### Phase A: IT-021（API認証）

```bash
# 1. テストファイル作成
touch ref/api-auth.integration.test.js

# 2. テスト実装（12件）

# 3. テスト実行
npm test -- ref/api-auth.integration.test.js

# 4. tests/integration/にコピー
cp ref/api-auth.integration.test.js tests/integration/
```

### Phase B: IT-022（ユーティリティ関数）

```bash
# 1. テストファイル作成
touch ref/hm-util.integration.test.js

# 2. テスト実装（15件）

# 3. テスト実行
npm test -- ref/hm-util.integration.test.js

# 4. tests/integration/にコピー
cp ref/hm-util.integration.test.js tests/integration/
```

### Phase C: IT-023（Java EncDec）

```bash
# 1. テストファイル作成
touch ref/java-encdec.integration.test.js

# 2. テスト実装（10件）

# 3. Java環境確認
java -version

# 4. テスト実行
npm test -- ref/java-encdec.integration.test.js

# 5. tests/integration/にコピー
cp ref/java-encdec.integration.test.js tests/integration/
```

### Phase D: IT-024（HTTPミドルウェア）

```bash
# 1. supertestインストール
npm install --save-dev supertest

# 2. テストファイル作成
touch ref/middleware.integration.test.js

# 3. テスト実装（5件）

# 4. テスト実行
npm test -- ref/middleware.integration.test.js

# 5. tests/integration/にコピー
cp ref/middleware.integration.test.js tests/integration/
```

---

## 利点

### 1. 即座に実行可能

- PostgreSQL環境構築を待たずにテスト可能
- CI/CD環境でDB起動不要
- 開発者のローカル環境で即座に実行

### 2. 高速実行

- DB接続オーバーヘッドなし
- テストデータ投入不要
- 並列実行が容易

### 3. 独立性が高い

- 他のテストと依存関係なし
- テストデータの状態に影響されない
- 冪等性が保証される

### 4. 基本機能のカバレッジ

- JWT認証（セキュリティ）
- 日付計算（ビジネスロジック）
- パスワード暗号化（セキュリティ）
- ミドルウェア（アーキテクチャ）

---

## 制約事項

### IT-023（Java EncDec）の制約

- Java実行環境が必要
- `util/EncDec.class`が配置されている必要あり
- Java環境がない場合はスキップ

### IT-024（HTTPミドルウェア）の制約

- `supertest`パッケージのインストールが必要
- DBモックの設定が必要（一部テスト）
- 実装コストがやや高い

---

## 次のステップ

### 短期（すぐに実施）

- [ ] IT-021実装（API認証 12件）
- [ ] IT-022実装（ユーティリティ 15件）
- [ ] テスト実行と結果確認
- [ ] ドキュメント更新

### 中期

- [ ] IT-023実装（Java EncDec 10件）
- [ ] Java環境確認と動作テスト

### 長期（オプション）

- [ ] IT-024実装（HTTPミドルウェア 5件）
- [ ] supertest導入とモック設定

---

## 関連ドキュメント

- `ref/PostgreSQL結合テスト実行ガイド.md` - PostgreSQL依存テストの実行ガイド
- `ref/結合テスト状況サマリ.md` - 全体テスト状況
- `ref/テストケース追加提案.md` - PostgreSQL依存の追加テスト提案（Phase 2-3）

---

**最終更新日**: 2025-11-06
**提案者**: Claude (結合テスト作成プロジェクト)
**ステータス**: 提案 / 実装待ち
