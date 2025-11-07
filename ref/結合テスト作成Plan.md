# 結合テスト作成Plan【更新版】

**作成日**: 2025-11-06
**対象プロジェクト**: Here's Me Server
**バージョン**: 2.0

---

## 📋 概要

Here's Me Serverの結合テストを段階的に作成・実施する計画です。

### 🚨 重要な方針
1. **既に発見されたバグは修正しない** → Expected Failとして明記
2. **E2Eテストは今回対象外** → 別フェーズ（総合テスト）で実施
3. **E2Eテストケースはドキュメント化** → 将来の総合テスト用に保存

---

## 🎯 作成する結合テストの全体像

### テスト対象
```
【Node.js側】10ケース
├─ IT-001-002: 旧クライアント互換性テスト (telework.js) ✅ PASS期待
├─ IT-003: グループ別位置情報取得 (geolocation.js) ❌ Expected FAIL (BUG-001)
├─ IT-004-006: AWS SSM連携テスト (db-util.js) ✅ PASS期待
├─ IT-007-008: パスワード変更テスト (user-info.js) ❌ Expected FAIL (Bug #1-4)
├─ IT-009: Constructor動作テスト (db-util.js) ✅ PASS期待
└─ IT-010: Java連携認証テスト (login-auth.js) ✅ PASS期待

【Java側】12ケース
└─ IT-J001-012: 全て ✅ PASS期待（バグなし）
```

### Expected Fail対象（バグ修正しないため）

| テストID | 対象モジュール | 既知バグ | Expected結果 |
|----------|---------------|---------|-------------|
| IT-003 | geolocation.js | BUG-001: `sectionId` 未定義 | ❌ FAIL |
| IT-007 | user-info.js | Bug #1-4: stderr/stdout処理不備 | ❌ FAIL |
| IT-008 | user-info.js | Bug #1-4: try-catch不足 | ❌ FAIL |

---

## 📅 3段階の作成アプローチ（Phase 0-2 + 報告）

### **Phase 0: 準備 (1日)**

#### 目的
環境構築、テストデータ準備、既知バグの文書化

#### ✅ 作成タスク（バグ修正なし）

**1. テストスクリプト作成**
```bash
ref/test-data-setup.sql              # テストデータ投入SQL
ref/test-data-cleanup.sql            # クリーンアップSQL
ref/run-java-integration-tests.sh    # Java結合テスト実行スクリプト
ref/test-java-integration.js         # Node.jsからJava呼び出しテスト
```

**2. 環境構築**
- [ ] PostgreSQL テストDB作成 (`heresme_test`)
- [ ] スキーマ適用
- [ ] Java EncDec.class 配置確認
- [ ] 環境変数設定 (`.env.test`)

**3. 既知バグ文書化** ⭐ 新規
```bash
ref/KNOWN_BUGS_EXPECTED_FAILURES.md
```
内容：
```markdown
# 既知のバグとExpected Failures

## BUG-001: geolocation.js - 未定義変数エラー
- **ファイル**: models/geolocation.js
- **行**: Line 120
- **内容**: `sectionId`が未定義（正しくは`groupId`を使用すべき）
- **影響**: グループIDによる位置情報取得が不可能
- **Expected Fail テスト**: IT-003
- **修正方針**: 本バグは修正せず、テスト結果を「Expected FAIL」として記録

## Bug #1-4: user-info.js - パスワード変更処理
- **ファイル**: models/user-info.js
- **行**: Lines 502-513, 537-548
- **内容**:
  - Bug #1: stderr判定ロジックの誤り
  - Bug #2: stdout判定不足
  - Bug #3: try-catch不足によるクラッシュリスク
  - Bug #4: エラーメッセージ不明瞭
- **影響**: パスワード変更時のエラーハンドリングが不適切
- **Expected Fail テスト**: IT-007, IT-008
- **修正方針**: 本バグは修正せず、テスト結果を「Expected FAIL」として記録
```

**4. テストデータ準備**
- [ ] マスタデータ投入SQL作成
  - 企業マスタ (company001, company002)
  - ユーザマスタ (user001-005)
  - 部署マスタ (section001-003)
  - グループマスタ (group001-003)
  - 位置情報マスタ (本社、支社オフィス)
- [ ] トランザクションデータ投入SQL作成
- [ ] クリーンアップSQL作成
- [ ] テストデータ投入確認

**成果物**:
- Phase0完了チェックリスト
- 既知バグ文書（KNOWN_BUGS_EXPECTED_FAILURES.md）
- テストデータSQL

---

### **Phase 1: 開発環境結合テスト (2-3日)**

#### 目的
ローカル環境でのNode.js + Java + PostgreSQL統合動作確認

#### 作成タスク

**1. Jest結合テスト設定ファイル作成**
```bash
ref/jest.integration.config.js
```
```javascript
module.exports = {
  testMatch: ['**/tests/integration/**/*.test.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/integration/setup.js'],
  collectCoverage: false,
  maxWorkers: 1,  // DB競合回避のため直列実行
  // Expected Failを許容する設定
  bail: false,
  testTimeout: 30000
}
```

**2. 結合テストセットアップファイル作成**
```bash
ref/integration-setup.js
```
```javascript
// DB接続確認、テストデータ投入、Java環境確認
beforeAll(async () => {
  console.log('========================================')
  console.log('結合テスト環境セットアップ')
  console.log('========================================')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  console.log('JAVA_CLASSPATH:', process.env.JAVA_CLASSPATH || './util')
  console.log('========================================')

  // PostgreSQL接続確認
  console.log('[Setup] データベース接続確認...')
  // テストデータクリーンアップ
  console.log('[Setup] 既存テストデータのクリーンアップ...')
  // テストデータ投入
  console.log('[Setup] テストデータ投入...')
  // Java EncDec動作確認
  console.log('[Setup] Java環境確認...')
  console.log('[Setup] セットアップ完了')
})

afterAll(async () => {
  console.log('[Teardown] テストデータクリーンアップ...')
  // テストデータクリーンアップ
  // DB接続クローズ
  console.log('[Teardown] クリーンアップ完了')
})
```

**3. 個別テストファイル作成**

```bash
# 作成するテストファイル（優先度順）
ref/telework.integration.test.js        # IT-001, IT-002 ✅ PASS期待
ref/db-util.integration.test.js         # IT-009 ✅ PASS期待
ref/login-auth.integration.test.js      # IT-010 ✅ PASS期待
ref/geolocation.integration.test.js     # IT-003 ❌ Expected FAIL (BUG-001)
ref/user-info.integration.test.js       # IT-007, IT-008 ❌ Expected FAIL (Bug #1-4)
```

**4. Expected Failテストの書き方** ⭐ 重要

```javascript
// ref/geolocation.integration.test.js
describe('IT-003: グループ別位置情報取得', () => {
  test.failing('groupIdで位置情報を取得できる (BUG-001のためExpected FAIL)', async () => {
    // Given: テストデータ準備
    const groupId = 'group001'

    // When: グループIDで位置情報取得
    const result = await geolocation.getByGroupId(groupId)

    // Then: 取得成功を期待（実際はBUG-001でエラー）
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  test('【参考】BUG-001修正後の期待動作を記録', () => {
    // このテストは実行しないが、修正後の期待動作を記録
    // 修正内容: Line 120の sectionId → groupId
    // 修正後の期待結果: groupIdで位置情報が正常に取得できる
    expect(true).toBe(true)
  })
})
```

```javascript
// ref/user-info.integration.test.js
describe('IT-007: パスワード変更正常系', () => {
  test.failing('パスワード変更が正常に完了する (Bug #1-4のためExpected FAIL)', async () => {
    // Given: 既存ユーザー
    const userId = 'user001'
    const oldPassword = 'test123'
    const newPassword = 'newpass456'

    // When: パスワード変更API呼び出し
    const result = await userInfo.changePassword(userId, oldPassword, newPassword)

    // Then: 正常終了を期待（実際はBug #1-4でエラー）
    expect(result).toBe(true)
  })
})

describe('IT-008: パスワード変更エラーハンドリング', () => {
  test.failing('旧パスワード不一致時に適切にエラーが返る (Bug #1-4のためExpected FAIL)', async () => {
    // Given: 既存ユーザー、不正な旧パスワード
    const userId = 'user001'
    const wrongOldPassword = 'wrongpass'
    const newPassword = 'newpass456'

    // When: パスワード変更API呼び出し
    const result = await userInfo.changePassword(userId, wrongOldPassword, newPassword)

    // Then: falseが返ることを期待（実際はBug #1-4でクラッシュの可能性）
    expect(result).toBe(false)
  })
})
```

**5. PASS期待テストの例**

```javascript
// ref/telework.integration.test.js
describe('IT-001: 旧クライアント勤務開始登録', () => {
  test('updated未指定で初期値0が設定される', async () => {
    // Given: テストデータ準備
    const userId = 'user001'
    const companyId = 'company001'

    // When: 旧クライアント形式で勤務開始（updatedパラメータなし）
    const result = await telework.startWork({
      userId,
      companyId,
      category: 1,
      logDate: '2025-11-06',
      logTime: '09:00:00',
      latitude: 35.6812,
      longitude: 139.7671
      // updated パラメータを意図的に省略
    })

    // Then: DB確認、updated=0が設定される
    expect(result).toBeDefined()
    const dbRecord = await telework.getLatestLog(userId)
    expect(dbRecord.updated).toBe(0)
    expect(dbRecord.latitude).toBe(35.6812)
  })

  test('linked_date未指定でlog_dateが設定される', async () => {
    // 旧クライアント互換動作確認
    const result = await telework.startWork({
      userId: 'user001',
      companyId: 'company001',
      category: 1,
      logDate: '2025-11-06',
      logTime: '09:00:00'
      // linked_date パラメータを意図的に省略
    })

    const dbRecord = await telework.getLatestLog('user001')
    expect(dbRecord.linked_date).toBe('2025-11-06')
  })
})
```

**6. テスト実施記録テンプレート作成**
```bash
ref/TEST_EXECUTION_RECORD_TEMPLATE.md
```
内容：
```markdown
# 結合テスト実施記録

## テストケースID: IT-XXX
- **テスト名**:
- **実施日**: YYYY-MM-DD
- **実施者**:
- **環境**: 開発/検証
- **実施結果**: ✅ PASS / ❌ FAIL / ⚠️ Expected FAIL
- **Expected FAIL理由**: （該当する場合）BUG-001/Bug #1-4による既知の不具合
- **エビデンス**:
  - ログファイル:
  - スクリーンショット:
  - DBダンプ:
- **備考**:

---

## 詳細

### 前提条件
-

### 実施内容
1.
2.
3.

### 実測値
-

### 判定理由
-
```

**成果物**:
- Jest結合テスト5ファイル
- テスト実施記録
- Expected Fail分析レポート

---

### **Phase 2: 検証環境結合テスト (2-3日)**

#### 目的
AWS環境でのSSM連携確認

#### 作成タスク

**1. AWS SSM連携テスト作成**
```bash
ref/aws-ssm.integration.test.js
```
```javascript
describe('IT-004: AWS SSM正常系', () => {
  test('SSMからDB接続情報を取得できる', async () => {
    // AWS環境でのみ実行
    if (process.env.environmentType !== '1') {
      return test.skip('AWS環境でのみ実行')
    }

    // Given: AWS SSM Parameter Store設定済み
    const parameterName = 'heresme.db_auth_info'

    // When: SSMからパラメータ取得
    const dbInfo = await dbUtil.getDbAuthFromSSM(parameterName)

    // Then: DB接続情報が取得できる
    expect(dbInfo).toBeDefined()
    expect(dbInfo.host).toBeDefined()
    expect(dbInfo.port).toBe(5432)
    expect(dbInfo.database).toBeDefined()

    // DB接続成功確認
    const connection = await dbUtil.connect(dbInfo)
    expect(connection).toBeDefined()
  })
})

describe('IT-005: AWS SSMエラー系', () => {
  test('SSMパラメータ不正時に適切にエラー処理される', async () => {
    if (process.env.environmentType !== '1') {
      return test.skip('AWS環境でのみ実行')
    }

    // Given: 存在しないパラメータ名
    const invalidParameterName = 'heresme.invalid_parameter'

    // When: SSMからパラメータ取得試行
    // Then: 適切なエラーハンドリング
    await expect(dbUtil.getDbAuthFromSSM(invalidParameterName))
      .rejects
      .toThrow()
  })
})

describe('IT-006: DB再接続リトライ', () => {
  test('DB接続失敗時にリトライ処理が動作する', async () => {
    // Given: 不正なDB接続情報
    const invalidDbInfo = {
      host: 'invalid-host',
      port: 5432,
      database: 'test_db',
      user: 'user',
      password: 'pass'
    }

    // When: DB接続試行
    // Then: リトライ後にエラーとなる
    await expect(dbUtil.connectWithRetry(invalidDbInfo, { maxRetries: 3 }))
      .rejects
      .toThrow()

    // リトライログの確認
    // expect(logs).toContain('Retry attempt 1')
    // expect(logs).toContain('Retry attempt 2')
    // expect(logs).toContain('Retry attempt 3')
  })
})
```

**2. 検証環境専用設定**
```bash
ref/.env.test.aws
```
```bash
NODE_ENV=test
environmentType=1  # AWS環境
AWS_REGION=ap-northeast-1
# DATABASE_URLはSSMから取得するため設定不要
```

**成果物**:
- AWS連携テスト3ファイル
- 検証環境テスト結果

---

### **Phase 3: 回帰テスト・報告書作成 (2日)**

#### 作成タスク

**1. 全テスト再実行スクリプト**
```bash
ref/run-all-integration-tests.sh
```
```bash
#!/bin/bash

echo "========================================"
echo "結合テスト実行開始"
echo "========================================"

# Phase 1: 開発環境テスト
echo ""
echo "[Phase 1] 開発環境結合テスト実行..."
npm test -- --config=ref/jest.integration.config.js
PHASE1_EXIT=$?

# Java結合テスト
echo ""
echo "[Java] Java結合テスト実行..."
./ref/run-java-integration-tests.sh
JAVA_EXIT=$?

# Phase 2: 検証環境テスト（AWS環境の場合のみ）
if [ "$environmentType" = "1" ]; then
  echo ""
  echo "[Phase 2] 検証環境結合テスト実行..."
  npm test -- ref/aws-ssm.integration.test.js
  PHASE2_EXIT=$?
else
  echo ""
  echo "[Phase 2] 検証環境テストはスキップ（AWS環境でないため）"
  PHASE2_EXIT=0
fi

echo ""
echo "========================================"
echo "結合テスト実行完了"
echo "========================================"
echo "Phase 1: Exit Code = $PHASE1_EXIT"
echo "Java:    Exit Code = $JAVA_EXIT"
echo "Phase 2: Exit Code = $PHASE2_EXIT"
echo "========================================"

# いずれかが失敗した場合は1を返す
if [ $PHASE1_EXIT -ne 0 ] || [ $JAVA_EXIT -ne 0 ] || [ $PHASE2_EXIT -ne 0 ]; then
  exit 1
fi

exit 0
```

**2. 総合テスト報告書テンプレート作成**
```bash
ref/INTEGRATION_TEST_REPORT_TEMPLATE.md
```
内容：
```markdown
# 結合テスト実施報告書

**プロジェクト名**: Here's Me Server
**実施期間**: YYYY-MM-DD ～ YYYY-MM-DD
**報告日**: YYYY-MM-DD
**作成者**:

---

## 1. テスト結果サマリー

| Phase | 実施ケース数 | PASS | Expected FAIL | Unexpected FAIL | SKIP |
|-------|------------|------|---------------|-----------------|------|
| Phase 1 (開発環境) | 7 | X | X | X | X |
| Phase 2 (検証環境) | 3 | X | X | X | X |
| Java結合テスト | 12 | X | X | X | X |
| **合計** | **22** | **X** | **X** | **X** | **X** |

### 合格率
- **全体**: X / 22 = XX.X%
- **PASS率**（Expected FAIL除く）: X / (22 - Expected FAIL数) = XX.X%

---

## 2. Expected Fail詳細

### IT-003: グループ別位置情報取得
- **結果**: ❌ Expected FAIL
- **原因**: BUG-001 (geolocation.js Line 120: sectionId未定義)
- **詳細**:
  - エラーメッセージ:
  - 発生箇所:
- **修正方針**: 次フェーズで修正予定
- **エビデンス**:

### IT-007: パスワード変更正常系
- **結果**: ❌ Expected FAIL
- **原因**: Bug #1-4 (user-info.js Lines 502-513: stderr/stdoutチェック不備)
- **詳細**:
- **修正方針**: 次フェーズで修正予定
- **エビデンス**:

### IT-008: パスワード変更エラーハンドリング
- **結果**: ❌ Expected FAIL
- **原因**: Bug #1-4 (user-info.js: try-catch不足)
- **詳細**:
- **修正方針**: 次フェーズで修正予定
- **エビデンス**:

---

## 3. Unexpected Fail詳細（新規発見バグ）

（該当なしの場合は「なし」と記載）

---

## 4. PASS テスト詳細

### IT-001: 旧クライアント勤務開始登録
- **結果**: ✅ PASS
- **実施内容**:
- **判定理由**:

### IT-002: 日またぎ勤務
- **結果**: ✅ PASS
- **実施内容**:
- **判定理由**:

（以下同様に記載）

---

## 5. Java結合テスト結果

### IT-J001-003: 暗号化/復号化テスト
- **結果**: ✅ PASS
- **詳細**:

（以下同様に記載）

---

## 6. 環境情報

### 開発環境
- **OS**:
- **Node.js**:
- **Java**:
- **PostgreSQL**:

### 検証環境
- **AWS環境**:
- **RDS**:
- **SSM Parameter Store**:

---

## 7. テスト実施上の課題・問題点

1.
2.

---

## 8. 残課題一覧

| 課題ID | 内容 | 優先度 | 対応予定 |
|--------|------|--------|---------|
| ISSUE-001 | BUG-001の修正 | 高 | 次フェーズ |
| ISSUE-002 | Bug #1-4の修正 | 高 | 次フェーズ |

---

## 9. 総合試験移行判定

### 判定基準
- [ ] Expected FAIL以外のテストが全てPASS
- [ ] Unexpected FAILが0件
- [ ] 新規バグがCritical/High優先度で0件
- [ ] テスト実施記録が完備

### 判定結果
- **判定**: ⬜ 移行可 / ⬜ 移行不可 / ⬜ 条件付き移行可
- **理由**:

---

## 10. 次フェーズへの申し送り事項

1. **バグ修正**: BUG-001, Bug #1-4の修正が必要
2. **E2Eテスト**: 総合テストフェーズで実施予定
3. **改善提案**:

---

**承認者署名**:

| 役割 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| テストリーダー | | | |
| プロジェクトマネージャー | | | |
| 品質保証責任者 | | | |
```

**3. 残課題一覧テンプレート作成**
```bash
ref/REMAINING_ISSUES_TEMPLATE.md
```

**成果物**:
- 総合テスト報告書
- 残課題一覧
- 次フェーズへの申し送り事項

---

## 📄 E2E用テストケースドキュメント作成

### E2Eテストケースは実装せず、ドキュメント化のみ

**作成ファイル**:
```bash
ref/E2E_TEST_SCENARIOS.md
```

**内容例**:
```markdown
# E2E用テストケース（総合テスト用）

**注意**: このドキュメントは結合テストでは実施せず、将来の総合テスト（E2Eテスト）フェーズで使用します。

---

## E2E-001: ログインフロー

### 目的
ユーザーがログインして認証トークンを取得するまでの一連の流れを検証

### 前提条件
- フロントエンド（Vue.js）が起動している
- バックエンドAPIが起動している
- テストユーザーが登録されている
- BUG-001, Bug #1-4が修正済み

### テストステップ
1. **ログイン画面を表示**
   - URL: http://localhost:8080/login
   - 期待結果: ログインフォームが表示される

2. **ユーザーID・パスワードを入力**
   - ユーザーID: user001
   - パスワード: test123
   - 期待結果: 入力フィールドに値が設定される

3. **ログインボタンをクリック**
   - 期待結果: POST /api/login APIが呼び出される

4. **バックエンド処理**
   - Java EncDec経由でパスワード復号化
   - DB照合
   - JWTトークン発行
   - 期待結果: 200 OKレスポンス、tokenが返却される

5. **ホーム画面遷移**
   - 期待結果: /home に遷移、ユーザー名が表示される

### 使用ツール（総合テスト時）
- Playwright
- Supertest（APIレイヤーテスト）

### テストコード例（参考）
```javascript
// tests/e2e/login-flow.spec.js
test('E2E-001: ログインフロー', async ({ page }) => {
  // 1. ログイン画面表示
  await page.goto('http://localhost:8080/login')
  await expect(page.locator('h1')).toContainText('ログイン')

  // 2. 入力
  await page.fill('#userId', 'user001')
  await page.fill('#password', 'test123')

  // 3. ログインボタンクリック
  await page.click('button[type="submit"]')

  // 4-5. ホーム画面遷移確認
  await expect(page).toHaveURL(/.*home/)
  await expect(page.locator('.user-name')).toContainText('Test User')
})
```

---

## E2E-002: 位置情報登録フロー

### 目的
ユーザーが現在位置を登録し、勤務開始する流れを検証

### 前提条件
- ログイン済みの状態
- 位置情報取得許可が必要
- BUG-001が修正済み

### テストステップ
1. **ログイン完了**（E2E-001と同様）
2. **位置情報取得許可**
   - ブラウザの位置情報許可ダイアログで「許可」を選択
3. **現在位置を取得**
   - 期待結果: 地図上に現在位置が表示される
4. **勤務開始ボタンをクリック**
   - 期待結果: POST /api/telework/start APIが呼び出される
5. **成功メッセージが表示される**
   - 期待結果: 「勤務を開始しました」メッセージ表示
6. **DB確認**
   - 期待結果: telework_logテーブルにレコードが登録される

### テストコード例（参考）
```javascript
test('E2E-002: 位置情報登録フロー', async ({ page, context }) => {
  // 位置情報モック
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({
    latitude: 35.6812,
    longitude: 139.7671
  })

  // ログイン（省略）

  // ホーム画面
  await page.goto('http://localhost:8080/home')

  // 勤務開始ボタンクリック
  await page.click('button#start-work')

  // 成功メッセージ確認
  await expect(page.locator('.success-message')).toBeVisible()
  await expect(page.locator('.success-message')).toContainText('勤務を開始しました')

  // 勤務中ステータス確認
  await expect(page.locator('.work-status')).toContainText('勤務中')
})
```

---

## E2E-003: 勤務管理フロー

### 目的
勤務開始から終了までの一連の流れを検証

### 前提条件
- ログイン済み
- 位置情報取得済み

### テストステップ
1. **勤務開始**（E2E-002と同様）
2. **勤務中ステータス表示確認**
   - 期待結果: 「勤務中」ステータスが表示される
3. **休憩開始**
   - 休憩開始ボタンをクリック
   - 期待結果: 「休憩中」ステータスに変更
4. **休憩終了**
   - 休憩終了ボタンをクリック
   - 期待結果: 「勤務中」ステータスに戻る
5. **勤務終了**
   - 勤務終了ボタンをクリック
   - 期待結果: 「勤務終了しました」メッセージ表示
6. **勤務実績一覧表示**
   - 期待結果: 本日の勤務実績が一覧に表示される

### テストコード例（参考）
```javascript
test('E2E-003: 勤務管理フロー', async ({ page }) => {
  // 勤務開始
  await page.click('button#start-work')
  await expect(page.locator('.work-status')).toContainText('勤務中')

  // 休憩開始
  await page.click('button#start-break')
  await expect(page.locator('.work-status')).toContainText('休憩中')

  // 休憩終了
  await page.click('button#end-break')
  await expect(page.locator('.work-status')).toContainText('勤務中')

  // 勤務終了
  await page.click('button#end-work')
  await expect(page.locator('.success-message')).toBeVisible()

  // 勤務実績確認
  await page.click('a[href="/history"]')
  await expect(page.locator('.work-history-item')).toHaveCount(1)
})
```

---

## E2Eテスト実施時の注意事項

### 実施タイミング
総合テスト フェーズで実施（結合テストでは実施しない）

### 前提条件
1. **既知バグが修正済み**
   - BUG-001 (geolocation.js): 修正完了
   - Bug #1-4 (user-info.js): 修正完了
2. **結合テストが完了し、全てPASS**
3. **本番相当環境が構築済み**

### 使用ツール
- **Playwright**: E2Eテストフレームワーク
- **Lighthouse**: パフォーマンス測定（オプション）

### テスト環境
- 本番相当環境
- フロントエンド + バックエンド統合環境

### テストデータ
専用のE2Eテストデータを準備
```sql
-- e2e-test-data.sql
INSERT INTO users (user_id, company_id, passwd, name)
VALUES ('e2e_user001', 'company001', '<暗号化パスワード>', 'E2E Test User');
```

---

## E2Eテスト環境構築手順（総合テスト時）

### 1. Playwrightインストール
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. playwright.config.js 作成
```javascript
module.exports = {
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    }
  ]
}
```

### 3. E2Eテストデータ準備
```bash
psql heresme_e2e < tests/e2e/e2e-test-data.sql
```

### 4. E2Eテスト実行
```bash
# 全E2Eテスト実行
npx playwright test

# 特定のテスト実行
npx playwright test tests/e2e/login-flow.spec.js

# デバッグモード
npx playwright test --debug

# UIモード（対話型）
npx playwright test --ui
```

---

## E2Eテスト成功基準

| 指標 | 目標値 |
|------|--------|
| **テストケースPASS率** | 100% |
| **レスポンスタイム** | < 2秒（画面遷移） |
| **エラー発生率** | 0% |
| **クロスブラウザ対応** | Chrome, Firefox, Safari |

---

**このドキュメントは総合テストフェーズで使用します。**
```

---

## 🔧 作成する主要ファイル一覧【更新版】

### 設定ファイル
```
ref/
├── jest.integration.config.js      # Jest結合テスト設定
├── integration-setup.js            # 結合テスト共通セットアップ
├── .env.test                       # テスト環境変数（開発環境）
└── .env.test.aws                   # テスト環境変数（検証環境）
```

### テストデータ
```
ref/
├── test-data-setup.sql             # テストデータ投入SQL
└── test-data-cleanup.sql           # クリーンアップSQL
```

### 結合テストファイル
```
tests/integration/
├── setup.js                        # 共通セットアップ
├── telework.integration.test.js    # IT-001, IT-002 ✅
├── geolocation.integration.test.js # IT-003 ❌ Expected FAIL
├── db-util.integration.test.js     # IT-009 ✅
├── login-auth.integration.test.js  # IT-010 ✅
├── user-info.integration.test.js   # IT-007, IT-008 ❌ Expected FAIL
└── aws-ssm.integration.test.js     # IT-004-006 ✅
```

### ドキュメント ⭐ 新規
```
ref/
├── 結合テスト作成Plan.md                      # このドキュメント
├── KNOWN_BUGS_EXPECTED_FAILURES.md         # 既知バグ一覧
├── TEST_EXECUTION_RECORD_TEMPLATE.md       # テスト実施記録テンプレート
├── INTEGRATION_TEST_REPORT_TEMPLATE.md     # 総合テスト報告書テンプレート
├── REMAINING_ISSUES_TEMPLATE.md            # 残課題一覧テンプレート
└── E2E_TEST_SCENARIOS.md                   # E2E用テストケース（総合テスト用）
```

### 実行スクリプト
```
ref/
├── run-java-integration-tests.sh   # Java結合テスト実行
├── test-java-integration.js        # Node.js - Java連携テスト
└── run-all-integration-tests.sh    # 全結合テスト実行
```

---

## ✅ 作成完了基準【更新版】

### Phase 0: 準備
- [ ] テストデータSQL作成完了
- [ ] 環境構築完了
- [ ] **既知バグ文書作成完了** （KNOWN_BUGS_EXPECTED_FAILURES.md）
- [ ] テストデータ投入確認

### Phase 1: 開発環境結合テスト
- [ ] Jest結合テスト5ファイル作成
- [ ] PASS期待テスト: 全てPASS（IT-001, IT-002, IT-009, IT-010）
- [ ] **Expected FAILテスト: 全てExpected通りにFAIL**（IT-003, IT-007, IT-008）
- [ ] 実施記録作成

### Phase 2: 検証環境結合テスト
- [ ] AWS連携テスト3ファイル作成（IT-004-006）
- [ ] 検証環境で全テストPASS

### Phase 3: 回帰テスト・報告書作成
- [ ] 総合テスト報告書作成
- [ ] 残課題一覧作成
- [ ] **E2E用テストケースドキュメント作成** （E2E_TEST_SCENARIOS.md）

---

## 🚀 実施スケジュール（目安）

| 日程 | Phase | 作業内容 | 成果物 |
|------|-------|---------|--------|
| Day 1 | Phase 0 | 環境構築、テストデータ準備、既知バグ文書化 | 既知バグ文書、テストデータSQL |
| Day 2-3 | Phase 1 | Jest結合テスト作成（PASS期待） | telework, db-util, login-auth テスト |
| Day 4 | Phase 1 | Jest結合テスト作成（Expected FAIL） | geolocation, user-info テスト |
| Day 5 | Phase 2 | AWS SSM連携テスト作成 | aws-ssm テスト |
| Day 6 | Phase 2 | 検証環境でのテスト実施 | 検証環境テスト結果 |
| Day 7-8 | Phase 3 | 回帰テスト、報告書作成、E2Eドキュメント作成 | 総合テスト報告書、E2E_TEST_SCENARIOS.md |

**総所要時間**: 約8営業日

---

## 📊 テスト結果の評価基準【更新版】

| 結果分類 | 判定 | 説明 | 総合試験移行への影響 |
|---------|------|------|-------------------|
| ✅ PASS | 合格 | テストが正常に成功 | 移行可 |
| ❌ Expected FAIL | 合格 | 既知バグによる失敗（想定通り） | 移行可（修正は次フェーズ） |
| ⚠️ Unexpected FAIL | 不合格 | 新規バグの発見（調査必要） | 移行不可（バグ修正必要） |
| ⏭️ SKIP | - | 環境条件により未実施 | 影響なし |

### 総合試験移行条件
1. **Unexpected FAIL = 0件** （必須）
2. **Expected FAIL = 既知バグ文書に記載済み** （必須）
3. **PASS率 = 100%**（Expected FAIL除く） （必須）
4. **テスト実施記録が完備** （必須）

---

## 📝 重要な注意事項

### 1. バグ修正について
- **既知のバグ（BUG-001, Bug #1-4）は修正しない**
- Expected FAILテストケースとして記録
- 次フェーズ（総合テスト前）での修正を前提とする

### 2. E2Eテストについて
- **結合テストでは実施しない**
- E2E_TEST_SCENARIOS.mdとしてドキュメント化のみ
- 総合テストフェーズで実施予定

### 3. テスト環境
- 開発環境: ローカル環境（PostgreSQL, Java）
- 検証環境: AWS環境（SSM Parameter Store使用）

---

## 📚 関連ドキュメント

### 既存ドキュメント
- [結合テスト実施計画書.md](./結合テスト実施計画書.md) - 詳細実施計画
- [結合テスト実施計画_サマリー.md](./結合テスト実施計画_サマリー.md) - エグゼクティブサマリー
- [Java結合テスト実施計画書.md](./Java結合テスト実施計画書.md) - Java側詳細計画
- [結合テストツール戦略書.md](./結合テストツール戦略書.md) - ツール選定方針
- [Phase0_準備チェックリスト.md](./Phase0_準備チェックリスト.md) - Phase 0タスク詳細

### 新規作成ドキュメント（このplanに基づく）
- KNOWN_BUGS_EXPECTED_FAILURES.md - 既知バグ一覧
- TEST_EXECUTION_RECORD_TEMPLATE.md - テスト実施記録テンプレート
- INTEGRATION_TEST_REPORT_TEMPLATE.md - 総合テスト報告書テンプレート
- REMAINING_ISSUES_TEMPLATE.md - 残課題一覧テンプレート
- E2E_TEST_SCENARIOS.md - E2E用テストケース（総合テスト用）

---

## 変更履歴

| 版数 | 日付 | 変更内容 | 作成者 |
|-----|------|---------|--------|
| 1.0 | 2025-11-06 | 初版作成 | Claude Code |
| 2.0 | 2025-11-06 | バグ修正なし方針、E2E除外方針を反映 | Claude Code |

---

## 承認

| 役割 | 氏名 | 承認日 | 署名 |
|-----|------|--------|------|
| テストリーダー | | | |
| プロジェクトマネージャー | | | |
| 品質保証責任者 | | | |

---

**次のアクション**:
1. ✅ このplanをgitに登録
2. ✅ Phase 0から作業開始
3. ✅ 既知バグ文書（KNOWN_BUGS_EXPECTED_FAILURES.md）を最初に作成
