# 既知のバグとExpected Failures

**作成日**: 2025-11-06
**プロジェクト**: Here's Me Server
**目的**: 結合テストで発見された既知のバグを文書化し、Expected Failureとして記録する

---

## ⚠️ 重要事項

このドキュメントに記載されているバグは、**結合テストフェーズでは修正しません**。

- **テスト結果**: Expected FAIL として記録
- **修正時期**: 次フェーズ（総合テスト前）で修正予定
- **テスト方針**: `test.failing()` を使用してExpected Failureとして実装

---

## BUG-001: geolocation.js - 未定義変数エラー

### 基本情報
- **ファイル**: `models/geolocation.js`
- **行番号**: Line 120
- **関数**: `getGeolocationByGroup(companyId, groupId)`
- **重要度**: 高
- **発見日**: 2025-11-06

### バグの詳細

#### 問題のコード
```javascript
async getGeolocationByGroup(companyId, groupId) {
  const query = SELECT_GELOCATION_GROUP_INJ
  const params = [
    companyId,
    companyId,
    sectionId,  // ← BUG: sectionId は未定義（引数は groupId）
  ]

  return await dbUtil.executeQueryRead(query, params, 'getGeolocationByGroup')
}
```

#### 正しいコード（修正後のあるべき姿）
```javascript
async getGeolocationByGroup(companyId, groupId) {
  const query = SELECT_GELOCATION_GROUP_INJ
  const params = [
    companyId,
    companyId,
    groupId,  // ← 修正: groupId を使用
  ]

  return await dbUtil.executeQueryRead(query, params, 'getGeolocationByGroup')
}
```

### 影響範囲
- **機能**: グループIDによる位置情報取得が不可能
- **エラー内容**: `ReferenceError: sectionId is not defined`
- **発生条件**: `getGeolocationByGroup()` メソッドを呼び出した時

### 対応するテストケース
- **IT-003**: グループ別位置情報取得 → ❌ Expected FAIL

### 修正方針
- **修正内容**: Line 120の `sectionId` を `groupId` に変更
- **修正時期**: 次フェーズ（総合テスト前）
- **修正難易度**: 低（1行の変数名修正）
- **影響範囲**: 小（該当メソッドのみ）

### テスト実装での対応
```javascript
// tests/integration/geolocation.integration.test.js
describe('IT-003: グループ別位置情報取得', () => {
  test.failing('groupIdで位置情報を取得できる (BUG-001のためExpected FAIL)', async () => {
    // Given: テストデータ準備
    const groupId = 'group001'

    // When: グループIDで位置情報取得
    const result = await geolocation.getGeolocationByGroup('company001', groupId)

    // Then: 取得成功を期待（実際はBUG-001でReferenceError）
    expect(result).toBeDefined()
    expect(result.body.rows.length).toBeGreaterThan(0)
  })
})
```

---

## Bug #1-4: user-info.js - パスワード変更処理の不備

### 基本情報
- **ファイル**: `models/user-info.js`
- **行番号**: Lines 502-513, 537-548
- **関数**: `_checkOldPassword()`, `_changeToNewPassword()`
- **重要度**: 高
- **発見日**: 2025-11-06

### Bug #1: stderr判定ロジックの誤り

#### 問題のコード（Line 502-505, 537-540）
```javascript
const { stdout, stderr } = await exec(java_cmd)
if (hmUtil.isNullorUndefined(stderr)) {
  L.eLog.error('Java command error. ' + stderr)  // ← BUG: stderrがない(正常)時にエラー判定
  return false
}
```

#### 正しいコード（修正後のあるべき姿）
```javascript
const { stdout, stderr } = await exec(java_cmd)
if (!hmUtil.isNullorUndefined(stderr)) {  // ← 修正: 否定を追加
  L.eLog.error('Java command error. ' + stderr)
  return false
}
```

#### 問題点
- `isNullorUndefined(stderr)` は stderr が**空（正常状態）**の時に `true` を返す
- 現在のコードでは、正常時にエラーとして処理され、異常時に処理が続行される（逆になっている）

---

### Bug #2: stdout判定の不足（Line 507-510, 542-545）

#### 問題のコード
```javascript
if (hmUtil.isNullorUndefined(stdout)) {
  L.sLog.warn('Password None ! - ' + userId)
  return false
}
```

#### 問題点
- stdout が空の場合のエラーハンドリングは正しい
- しかし、Bug #1との組み合わせにより、正常動作しない

---

### Bug #3: try-catch不足によるクラッシュリスク

#### 問題のコード
```javascript
const { stdout, stderr } = await exec(java_cmd)
// ← try-catchがない
```

#### 正しいコード（修正後のあるべき姿）
```javascript
try {
  const { stdout, stderr } = await exec(java_cmd)
  // ... 正常処理
} catch (error) {
  L.eLog.error('Java command execution failed: ' + error.message)
  return false
}
```

#### 問題点
- `exec()` が失敗した場合（Javaプロセス起動失敗、タイムアウトなど）にtry-catchがないため、アプリケーション全体がクラッシュする可能性がある

---

### Bug #4: エラーメッセージ不明瞭

#### 問題のコード（Line 503）
```javascript
L.eLog.error('Java command error. ' + stderr)
```

#### 改善案
```javascript
L.eLog.error('Java EncDec command failed. stderr: ' + stderr)
```

---

### 影響範囲

#### _checkOldPassword (Lines 502-513)
- **機能**: 旧パスワードの照合
- **影響**: パスワード照合が常に失敗する
- **エラー**: Javaコマンド正常実行時に「エラー」として処理される

#### _changeToNewPassword (Lines 537-548)
- **機能**: 新パスワードへの変更
- **影響**: パスワード変更が常に失敗する
- **エラー**: Javaコマンド正常実行時に「エラー」として処理される

### 対応するテストケース
- **IT-007**: パスワード変更正常系 → ❌ Expected FAIL
- **IT-008**: パスワード変更エラーハンドリング → ❌ Expected FAIL

### 修正方針

#### 修正内容
1. **Bug #1修正**: Line 502, 537の条件式に否定 `!` を追加
   ```javascript
   if (!hmUtil.isNullorUndefined(stderr)) {
   ```

2. **Bug #3修正**: try-catch追加
   ```javascript
   try {
     const { stdout, stderr } = await exec(java_cmd)
     // ... 処理
   } catch (error) {
     L.eLog.error('Java command execution failed: ' + error.message)
     return false
   }
   ```

3. **Bug #4修正**: エラーメッセージ改善
   ```javascript
   L.eLog.error('Java EncDec command failed. stderr: ' + stderr)
   ```

#### 修正箇所
- `models/user-info.js` Line 502-513 (_checkOldPassword)
- `models/user-info.js` Line 537-548 (_changeToNewPassword)

#### 修正時期
- 次フェーズ（総合テスト前）

#### 修正難易度
- 中（ロジック修正 + try-catch追加）

#### 影響範囲
- 中（パスワード変更機能全体）

### テスト実装での対応

```javascript
// tests/integration/user-info.integration.test.js
describe('IT-007: パスワード変更正常系', () => {
  test.failing('パスワード変更が正常に完了する (Bug #1-4のためExpected FAIL)', async () => {
    // Given: 既存ユーザー
    const userId = 'user001'
    const oldPassword = 'test123'
    const newPassword = 'newpass456'

    // When: パスワード変更API呼び出し
    const result = await userInfo.changePassword(userId, oldPassword, newPassword)

    // Then: 正常終了を期待（実際はBug #1-4でfalseが返る）
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

    // Then: falseが返ることを期待（実際はBug #1-4で予期しない動作）
    expect(result).toBe(false)
  })
})
```

---

## Expected Failures サマリー

| テストID | 対象バグ | 対象モジュール | Expected結果 | 修正優先度 |
|----------|---------|---------------|-------------|----------|
| IT-003 | BUG-001 | geolocation.js | ❌ FAIL (ReferenceError) | 高 |
| IT-007 | Bug #1-4 | user-info.js | ❌ FAIL (常にfalse) | 高 |
| IT-008 | Bug #1-4 | user-info.js | ❌ FAIL (不正な動作) | 高 |

---

## 総合試験移行条件

### ✅ Expected Failuresの扱い
- IT-003, IT-007, IT-008が**Expected通りにFAIL**すればOK
- これらは「不合格」ではなく、「既知の不具合として想定通りの結果」として記録

### ❌ Unexpected Failuresの扱い
- 上記以外のテストケースで失敗が発生した場合は「Unexpected FAIL」
- Unexpected FAILが1件でもある場合は、総合試験移行不可
- 原因調査・バグ修正が必須

---

## バグ修正後の検証計画

### 修正時期
次フェーズ（総合テスト前）

### 検証方法
1. **BUG-001修正後**
   - IT-003を再実行し、PASSすることを確認
   - `test.failing()` を削除して通常のテストに変更

2. **Bug #1-4修正後**
   - IT-007, IT-008を再実行し、PASSすることを確認
   - `test.failing()` を削除して通常のテストに変更

3. **回帰テスト**
   - 全結合テストを再実行し、全てPASSすることを確認

---

## 参考資料

### 関連ドキュメント
- [結合テスト作成Plan.md](./結合テスト作成Plan.md)
- [結合テスト実施計画書.md](./結合テスト実施計画書.md)
- [Phase0_準備チェックリスト.md](./Phase0_準備チェックリスト.md)

### コードリファレンス
- `models/geolocation.js:120` - BUG-001
- `models/user-info.js:502-513` - Bug #1-4 (checkOldPassword)
- `models/user-info.js:537-548` - Bug #1-4 (changeToNewPassword)

---

**承認**

| 役割 | 氏名 | 承認日 | 署名 |
|-----|------|--------|------|
| テストリーダー | | | |
| プロジェクトマネージャー | | | |
| 品質保証責任者 | | | |

---

**変更履歴**

| 版数 | 日付 | 変更内容 | 作成者 |
|-----|------|---------|--------|
| 1.0 | 2025-11-06 | 初版作成 | Claude Code |
