# E2E用テストケース（総合テスト用）

**作成日**: 2025-11-06
**対象プロジェクト**: Here's Me Server
**対象フェーズ**: 総合テスト（E2Eテスト）

---

## ⚠️ 重要な注意事項

**このドキュメントは結合テストフェーズでは実施しません**

- **実施タイミング**: 総合テスト フェーズ（結合テスト完了後）
- **前提条件**: BUG-001, Bug #1-4 が修正済み
- **目的**: 将来のE2Eテスト実施時の参考ドキュメント

---

## 目次

1. [E2Eテスト概要](#e2eテスト概要)
2. [テストシナリオ一覧](#テストシナリオ一覧)
3. [E2E-001: ログインフロー](#e2e-001-ログインフロー)
4. [E2E-002: 位置情報登録フロー](#e2e-002-位置情報登録フロー)
5. [E2E-003: 勤務管理フロー](#e2e-003-勤務管理フロー)
6. [E2E-004: パスワード変更フロー](#e2e-004-パスワード変更フロー)
7. [E2E-005: グループ管理フロー](#e2e-005-グループ管理フロー)
8. [E2E環境構築手順](#e2e環境構築手順)
9. [実施時の注意事項](#実施時の注意事項)

---

## E2Eテスト概要

### 目的

フロントエンド（Vue.js）からバックエンド（Node.js + Java + PostgreSQL）まで、システム全体の統合動作を検証します。

### 対象範囲

- ユーザーインターフェース（Vue.js）
- REST API（Express.js）
- ビジネスロジック（Node.js + Java）
- データベース（PostgreSQL）
- 外部連携（AWS SSM、位置情報API）

### 使用ツール

- **Playwright**: E2Eテストフレームワーク
- **Supertest**: APIレイヤーテスト（オプション）
- **Lighthouse**: パフォーマンス測定（オプション）

---

## テストシナリオ一覧

| シナリオID | シナリオ名 | 重要度 | 実施環境 | 所要時間（予想） |
|-----------|-----------|--------|---------|---------------|
| **E2E-001** | ログインフロー | 🔴 High | 本番相当環境 | 5分 |
| **E2E-002** | 位置情報登録フロー | 🔴 High | 本番相当環境 | 10分 |
| **E2E-003** | 勤務管理フロー | 🔴 High | 本番相当環境 | 15分 |
| **E2E-004** | パスワード変更フロー | 🟡 Medium | 本番相当環境 | 10分 |
| **E2E-005** | グループ管理フロー | 🟡 Medium | 本番相当環境 | 10分 |
| **E2E-006** | 勤務実績レポート | 🟢 Low | 本番相当環境 | 10分 |
| **E2E-007** | エラーハンドリング | 🟡 Medium | 本番相当環境 | 15分 |

---

## E2E-001: ログインフロー

### 目的

ユーザーがログインして認証トークンを取得するまでの一連の流れを検証

### 前提条件

- ✅ フロントエンド（Vue.js）が起動している
- ✅ バックエンドAPIが起動している
- ✅ PostgreSQLが稼働している
- ✅ テストユーザーが登録されている
- ✅ **BUG-001, Bug #1-4が修正済み**

### テストステップ

#### Step 1: ログイン画面を表示

**操作**:
- ブラウザで `http://localhost:8080/login` にアクセス

**期待結果**:
- ログインフォームが表示される
- ユーザーID入力欄が存在する
- パスワード入力欄が存在する
- ログインボタンが表示される

---

#### Step 2: ユーザーID・パスワードを入力

**操作**:
- ユーザーID: `e2e_user001`
- パスワード: `test123`
- 入力フィールドに値を入力

**期待結果**:
- 入力した値が入力フィールドに表示される
- パスワードはマスク表示される（●●●●●）

---

#### Step 3: ログインボタンをクリック

**操作**:
- ログインボタンをクリック

**期待結果**:
- `POST /api/login` APIが呼び出される
- ローディング表示が出る（オプション）

---

#### Step 4: バックエンド処理

**バックエンド処理フロー**:
1. login-auth.js の `authenticate()` 呼び出し
2. DB照会（iw_usertbl）
3. Java EncDec経由でパスワード復号化
4. パスワード照合
5. JWTトークン発行（api-auth.js）

**期待結果**:
- 200 OK レスポンス
- レスポンスボディに `token`, `user_id`, `name` が含まれる
- ブラウザのlocalStorageにトークンが保存される

---

#### Step 5: ホーム画面遷移

**期待結果**:
- `/home` に遷移
- ユーザー名が表示される（例: "E2E Test User"）
- ナビゲーションバーが表示される
- ログアウトボタンが表示される

---

### テストコード例（Playwright）

```javascript
// tests/e2e/login-flow.spec.js
import { test, expect } from '@playwright/test'

test.describe('E2E-001: ログインフロー', () => {

  test('正常なログインフロー', async ({ page }) => {
    // Step 1: ログイン画面表示
    await page.goto('http://localhost:8080/login')
    await expect(page.locator('h1')).toContainText('ログイン')

    // Step 2: 入力
    await page.fill('#userId', 'e2e_user001')
    await page.fill('#password', 'test123')

    // パスワードがマスク表示されていることを確認
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')

    // Step 3: ログインボタンクリック
    await page.click('button[type="submit"]')

    // Step 4-5: ホーム画面遷移確認
    await expect(page).toHaveURL(/.*home/)
    await expect(page.locator('.user-name')).toContainText('E2E Test User')

    // トークンがlocalStorageに保存されていることを確認
    const token = await page.evaluate(() => localStorage.getItem('authToken'))
    expect(token).toBeTruthy()
  })

  test('不正なパスワードでログイン失敗', async ({ page }) => {
    await page.goto('http://localhost:8080/login')

    await page.fill('#userId', 'e2e_user001')
    await page.fill('#password', 'wrongpassword')

    await page.click('button[type="submit"]')

    // エラーメッセージが表示される
    await expect(page.locator('.error-message')).toBeVisible()
    await expect(page.locator('.error-message')).toContainText('認証に失敗しました')
  })

})
```

---

## E2E-002: 位置情報登録フロー

### 目的

ユーザーが現在位置を登録し、勤務開始する流れを検証

### 前提条件

- ✅ ログイン済みの状態
- ✅ ブラウザで位置情報取得許可が必要
- ✅ **BUG-001が修正済み**

### テストステップ

#### Step 1: ログイン完了

（E2E-001と同様）

---

#### Step 2: 位置情報取得許可

**操作**:
- ブラウザの位置情報許可ダイアログで「許可」を選択
- （Playwrightでは `context.grantPermissions(['geolocation'])` でモック）

**期待結果**:
- 位置情報取得が許可される

---

#### Step 3: 現在位置を取得

**操作**:
- ホーム画面で位置情報取得ボタンをクリック

**期待結果**:
- 地図上に現在位置が表示される
- 現在位置の住所が表示される（逆ジオコーディング）
- 勤務開始ボタンが活性化される

---

#### Step 4: 勤務開始ボタンをクリック

**操作**:
- 勤務開始ボタンをクリック

**期待結果**:
- `POST /api/telework/start` APIが呼び出される
- リクエストボディに位置情報（latitude, longitude）が含まれる

---

#### Step 5: 成功メッセージが表示される

**期待結果**:
- 「勤務を開始しました」メッセージが表示される
- 勤務中ステータスが「勤務中」に変わる

---

#### Step 6: DB確認

**期待結果**:
- `iw_workinghourstbl` テーブルにレコードが登録される
- `iw_locatetbl` テーブルに位置情報が登録される
- `updated=0`, `linked_date` が正しく設定される（IT-001の確認項目）

---

### テストコード例（Playwright）

```javascript
// tests/e2e/geolocation-flow.spec.js
import { test, expect } from '@playwright/test'

test.describe('E2E-002: 位置情報登録フロー', () => {

  test('勤務開始フロー（位置情報あり）', async ({ page, context }) => {
    // 位置情報モック
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({
      latitude: 35.6812,  // 東京駅
      longitude: 139.7671
    })

    // ログイン（省略）
    await page.goto('http://localhost:8080/login')
    await page.fill('#userId', 'e2e_user001')
    await page.fill('#password', 'test123')
    await page.click('button[type="submit"]')

    // ホーム画面
    await page.goto('http://localhost:8080/home')

    // 位置情報取得
    await page.click('button#get-location')
    await expect(page.locator('.current-location')).toBeVisible()

    // 勤務開始ボタンクリック
    await page.click('button#start-work')

    // 成功メッセージ確認
    await expect(page.locator('.success-message')).toBeVisible()
    await expect(page.locator('.success-message')).toContainText('勤務を開始しました')

    // 勤務中ステータス確認
    await expect(page.locator('.work-status')).toContainText('勤務中')
  })

})
```

---

## E2E-003: 勤務管理フロー

### 目的

勤務開始から終了までの一連の流れを検証

### テストステップ

1. **勤務開始**（E2E-002と同様）
2. **勤務中ステータス表示確認**
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

### テストコード例（Playwright）

```javascript
test('E2E-003: 勤務管理フロー', async ({ page }) => {
  // 勤務開始（省略）

  // 勤務中ステータス確認
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

## E2E-004: パスワード変更フロー

### 目的

ユーザーがパスワードを変更する一連の流れを検証

### 前提条件

- ✅ ログイン済みの状態
- ✅ **Bug #1-4が修正済み**（重要）

### テストステップ

1. **設定画面へ遷移**
2. **パスワード変更画面を表示**
3. **旧パスワード、新パスワードを入力**
4. **パスワード変更ボタンをクリック**
5. **成功メッセージが表示される**
6. **ログアウト**
7. **新パスワードでログイン**

### テストコード例（Playwright）

```javascript
test('E2E-004: パスワード変更フロー', async ({ page }) => {
  // ログイン（省略）

  // 設定画面へ
  await page.click('a[href="/settings"]')

  // パスワード変更画面
  await page.click('a[href="/settings/password"]')

  // 入力
  await page.fill('#oldPassword', 'test123')
  await page.fill('#newPassword', 'newpass456')
  await page.fill('#newPasswordConfirm', 'newpass456')

  // 変更ボタンクリック
  await page.click('button#change-password')

  // 成功メッセージ
  await expect(page.locator('.success-message')).toBeVisible()

  // ログアウト
  await page.click('button#logout')

  // 新パスワードでログイン
  await page.fill('#userId', 'e2e_user001')
  await page.fill('#password', 'newpass456')
  await page.click('button[type="submit"]')

  // ログイン成功確認
  await expect(page).toHaveURL(/.*home/)
})
```

---

## E2E-005: グループ管理フロー

### 目的

グループ別の位置情報表示機能を検証

### 前提条件

- ✅ 管理者権限でログイン済み
- ✅ **BUG-001が修正済み**（重要）

### テストステップ

1. **管理画面へ遷移**
2. **グループ一覧を表示**
3. **特定のグループを選択**
4. **グループに所属するメンバーの位置情報が表示される**

### テストコード例（Playwright）

```javascript
test('E2E-005: グループ管理フロー', async ({ page }) => {
  // 管理者ログイン（省略）

  // 管理画面へ
  await page.click('a[href="/admin"]')

  // グループ一覧
  await page.click('a[href="/admin/groups"]')

  // 特定グループを選択
  await page.click('button#group-group001')

  // メンバー位置情報表示確認
  await expect(page.locator('.member-location-list')).toBeVisible()
  await expect(page.locator('.member-location-item')).toHaveCountGreaterThan(0)
})
```

---

## E2E環境構築手順

### 1. Playwrightインストール

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 2. playwright.config.js 作成

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' }
    }
  ],
  // テストレポート
  reporter: [
    ['html', { outputFolder: 'test-results/e2e' }],
    ['junit', { outputFile: 'test-results/e2e/junit.xml' }]
  ]
}
```

### 3. E2Eテストデータ準備

```sql
-- tests/e2e/e2e-test-data.sql
-- E2Eテスト用ユーザー作成
INSERT INTO iw_usertbl (
  user_id, company_id, passwd, name, mail, staff_id, section, group_id,
  class, admin_flg, telework_flg
)
VALUES (
  'e2e_user001',
  'company001',
  '<暗号化されたパスワード>',  -- Java EncDecで暗号化した'test123'
  'E2E Test User',
  'e2e_test@example.com',
  'staff_e2e_001',
  'section001',
  'group001',
  1,
  0,
  1
);

-- E2E管理者ユーザー作成
INSERT INTO iw_usertbl (
  user_id, company_id, passwd, name, mail, staff_id, section, group_id,
  class, admin_flg, telework_flg
)
VALUES (
  'e2e_admin001',
  'company001',
  '<暗号化されたパスワード>',
  'E2E Admin User',
  'e2e_admin@example.com',
  'staff_e2e_admin',
  'section001',
  'group001',
  1,
  1,
  1
);
```

### 4. E2Eテスト実行

```bash
# 全E2Eテスト実行
npx playwright test

# 特定のテスト実行
npx playwright test tests/e2e/login-flow.spec.js

# ヘッドレスモードoff（ブラウザを表示して実行）
npx playwright test --headed

# デバッグモード
npx playwright test --debug

# UIモード（対話型）
npx playwright test --ui

# 特定のブラウザで実行
npx playwright test --project=chromium
```

---

## 実施時の注意事項

### 実施タイミング

✅ **総合テスト フェーズで実施**（結合テストでは実施しない）

### 前提条件

1. ✅ **既知バグが修正済み**
   - BUG-001 (geolocation.js): 修正完了
   - Bug #1-4 (user-info.js): 修正完了
2. ✅ **結合テストが完了し、全てPASS**
3. ✅ **本番相当環境が構築済み**

### テスト環境

- 本番相当環境
- フロントエンド + バックエンド統合環境
- 専用のE2Eテストデータベース（`heresme_e2e`）

### テストデータ

専用のE2Eテストデータを準備

```bash
# テストデータ投入
psql heresme_e2e < tests/e2e/e2e-test-data.sql

# テストデータクリーンアップ
psql heresme_e2e < tests/e2e/e2e-test-cleanup.sql
```

---

## E2Eテスト成功基準

| 指標 | 目標値 | 備考 |
|------|--------|------|
| **テストケースPASS率** | 100% | 全シナリオPASS必須 |
| **レスポンスタイム** | < 2秒 | 画面遷移時間 |
| **API応答時間** | < 500ms | 通常のAPIリクエスト |
| **エラー発生率** | 0% | Unexpected Error無し |
| **クロスブラウザ対応** | Chrome, Firefox, Safari | 3ブラウザで動作確認 |

---

## トラブルシューティング

### 問題1: Playwrightが起動しない

**原因**: ブラウザがインストールされていない
**対処**:
```bash
npx playwright install
```

### 問題2: タイムアウトエラーが発生

**原因**: ページ読み込みが遅い
**対処**:
```javascript
test.setTimeout(60000) // 60秒に延長
```

### 問題3: 位置情報が取得できない

**原因**: ブラウザの位置情報許可が必要
**対処**:
```javascript
await context.grantPermissions(['geolocation'])
```

---

## 関連ドキュメント

- [結合テスト作成Plan.md](./結合テスト作成Plan.md)
- [KNOWN_BUGS_EXPECTED_FAILURES.md](./KNOWN_BUGS_EXPECTED_FAILURES.md)
- [INTEGRATION_TEST_REPORT_TEMPLATE.md](./INTEGRATION_TEST_REPORT_TEMPLATE.md)
- [REMAINING_ISSUES_TEMPLATE.md](./REMAINING_ISSUES_TEMPLATE.md)

---

**変更履歴**

| 版数 | 日付 | 変更内容 | 作成者 |
|-----|------|---------|--------|
| 1.0 | 2025-11-06 | 初版作成 | Claude Code |

---

**このドキュメントは総合テストフェーズで使用します。**
