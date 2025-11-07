# 残課題一覧

**プロジェクト名**: Here's Me Server
**作成日**: YYYY-MM-DD
**最終更新日**: YYYY-MM-DD
**作成者**:

---

## 目的

結合テストで発見された既知バグ、改善提案、および次フェーズでの対応が必要な課題を一元管理します。

---

## サマリー

| カテゴリ | 件数 | Critical | High | Medium | Low |
|---------|------|----------|------|--------|-----|
| **既知バグ（修正必須）** | X | X | X | X | X |
| **改善提案（オプション）** | X | X | X | X | X |
| **技術的課題** | X | X | X | X | X |
| **プロセス改善** | X | X | X | X | X |
| **合計** | **X** | **X** | **X** | **X** | **X** |

---

## 目次

1. [既知バグ（修正必須）](#1-既知バグ修正必須)
2. [改善提案（オプション）](#2-改善提案オプション)
3. [技術的課題](#3-技術的課題)
4. [プロセス改善](#4-プロセス改善)
5. [長期課題](#5-長期課題)

---

## 1. 既知バグ（修正必須）

### 1.1 BUG-001: geolocation.js - 未定義変数エラー

| 項目 | 内容 |
|------|------|
| **課題ID** | ISSUE-001 |
| **バグID** | BUG-001 |
| **発見テスト** | IT-003 |
| **重要度** | 🔴 High |
| **ステータス** | 🔵 Open / 🟢 In Progress / ✅ Resolved / ⏸️ On Hold |
| **ファイル** | models/geolocation.js |
| **行番号** | Line 120 |
| **概要** | `getGeolocationByGroup()` で `sectionId` が未定義 |
| **詳細** | 関数の引数は `groupId` だが、Line 120で存在しない変数 `sectionId` を参照している |
| **影響範囲** | グループIDによる位置情報取得機能が使用不可 |
| **再現手順** | 1. `geolocation.getGeolocationByGroup('company001', 'group001')` を呼び出し<br>2. ReferenceError が発生 |
| **エラーメッセージ** | `ReferenceError: sectionId is not defined` |

#### 修正方針
- **修正内容**: Line 120の `sectionId` を `groupId` に変更
- **修正難易度**: 低（1行の変数名修正）
- **修正時間見積**: 5分
- **テスト時間見積**: 30分（回帰テスト含む）

#### 修正予定
- **対応者**: （未割当）
- **対応予定日**: YYYY-MM-DD
- **完了予定日**: YYYY-MM-DD
- **対応フェーズ**: 次フェーズ（総合テスト前）

#### 関連情報
- **参照ドキュメント**: ref/KNOWN_BUGS_EXPECTED_FAILURES.md
- **関連テストケース**: IT-003
- **関連バグ**: なし

---

### 1.2 Bug #1-4: user-info.js - パスワード変更処理の不備

| 項目 | 内容 |
|------|------|
| **課題ID** | ISSUE-002 |
| **バグID** | Bug #1-4 |
| **発見テスト** | IT-007, IT-008 |
| **重要度** | 🔴 High |
| **ステータス** | 🔵 Open / 🟢 In Progress / ✅ Resolved / ⏸️ On Hold |
| **ファイル** | models/user-info.js |
| **行番号** | Lines 502-513, 537-548 |
| **概要** | stderr判定ロジックの逆転、try-catch不足 |
| **詳細** | Javaコマンド正常実行時にエラーと判定される、例外処理不足 |
| **影響範囲** | パスワード変更機能全体 |

#### バグ詳細

**Bug #1: stderr判定の誤り**
- 現在: `if (hmUtil.isNullorUndefined(stderr))` でエラー判定
- 問題: stderrが空（正常）の時にエラーとして処理される
- 修正: `if (!hmUtil.isNullorUndefined(stderr))` に変更（否定を追加）

**Bug #3: try-catch不足**
- 現在: `const { stdout, stderr } = await exec(java_cmd)` で例外処理なし
- 問題: exec()失敗時にアプリケーションがクラッシュする可能性
- 修正: try-catchで例外をキャッチし、適切にエラーハンドリング

#### 修正方針
- **修正内容**:
  1. Lines 502, 537の条件式に否定 `!` を追加
  2. try-catch追加
  3. エラーメッセージ改善
- **修正難易度**: 中（ロジック修正 + 例外処理追加）
- **修正時間見積**: 30分
- **テスト時間見積**: 1時間（回帰テスト含む）

#### 修正予定
- **対応者**: （未割当）
- **対応予定日**: YYYY-MM-DD
- **完了予定日**: YYYY-MM-DD
- **対応フェーズ**: 次フェーズ（総合テスト前）

#### 関連情報
- **参照ドキュメント**: ref/KNOWN_BUGS_EXPECTED_FAILURES.md
- **関連テストケース**: IT-007, IT-008
- **関連バグ**: login-auth.js Line 84-92にも同様のバグが存在する可能性

---

### 1.3 （新規発見バグ）

（Unexpected FAILで発見された新規バグがある場合のみ記載）

| 項目 | 内容 |
|------|------|
| **課題ID** | ISSUE-XXX |
| **バグID** | BUG-XXX |
| **発見テスト** | IT-XXX |
| **重要度** | 🔴 Critical / 🔴 High / 🟡 Medium / 🟢 Low |
| **ステータス** | 🔵 Open |
| **ファイル** | |
| **行番号** | |
| **概要** | |
| **詳細** | |
| **影響範囲** | |

---

## 2. 改善提案（オプション）

### 2.1 IMPROVE-001: エラーハンドリングの統一

| 項目 | 内容 |
|------|------|
| **課題ID** | IMPROVE-001 |
| **カテゴリ** | コード品質 |
| **重要度** | 🟡 Medium |
| **ステータス** | 🔵 Open |
| **提案内容** | Java実行部分のエラーハンドリングを共通化 |
| **背景** | 複数のファイル（login-auth.js, user-info.js）で同様のJava実行コードが重複 |
| **改善案** | 共通のJava実行ヘルパー関数を作成 |

#### 詳細

**現状の問題点**:
- login-auth.js, user-info.jsで同じJava EncDec実行コードが重複
- Bug #1-4のような同じバグが複数箇所に存在する可能性

**改善案**:
```javascript
// util/java-executor.js（新規作成）
async function executeJavaCommand(javaCmd) {
  try {
    const { stdout, stderr } = await exec(javaCmd)
    if (!hmUtil.isNullorUndefined(stderr)) {
      L.eLog.error('Java command failed. stderr: ' + stderr)
      return { success: false, error: stderr }
    }
    if (hmUtil.isNullorUndefined(stdout)) {
      L.eLog.error('Java command returned empty stdout')
      return { success: false, error: 'Empty stdout' }
    }
    return { success: true, output: stdout.replace(/\r?\n/g, '') }
  } catch (error) {
    L.eLog.error('Java command execution failed: ' + error.message)
    return { success: false, error: error.message }
  }
}
```

#### 修正予定
- **対応者**: （未割当）
- **対応予定日**: （検討中）
- **優先度**: 低（バグ修正後に実施）

---

### 2.2 IMPROVE-002: テストデータ管理の改善

| 項目 | 内容 |
|------|------|
| **課題ID** | IMPROVE-002 |
| **カテゴリ** | テスト環境 |
| **重要度** | 🟡 Medium |
| **ステータス** | 🔵 Open |
| **提案内容** | テストデータの自動セットアップ・クリーンアップ |
| **背景** | 現在は手動でSQLを実行してテストデータを準備 |
| **改善案** | Jestのsetup/teardownでテストデータを自動管理 |

---

## 3. 技術的課題

### 3.1 TECH-001: 非同期処理の適切な待機

| 項目 | 内容 |
|------|------|
| **課題ID** | TECH-001 |
| **カテゴリ** | 技術的課題 |
| **重要度** | 🟡 Medium |
| **ステータス** | 🔵 Open |
| **概要** | db-util.js Line 18の非同期処理が適切に待機されていない |
| **詳細** | `getConnectionInfoFromAWS()` がコールバックベースで、awaitされていない |
| **影響** | AWS環境で初回DB接続時に失敗する可能性 |

#### 詳細

**問題のコード**（db-util.js Line 22-58）:
```javascript
async getConnectionInfoFromAWS() {
  if (environmentType === 0) {
    // localhost用（同期処理）
    db_config = { ... }
    return
  }

  // AWS環境（コールバック形式、非同期）
  ssm.getParameter(params, (err, data) => {
    // ...
    db_config = { ... }
  })
}
```

**問題点**:
- getConnectionInfoFromAWS()は`async`だが、実際には待機されない
- SSMからの取得完了前にdb_configがnullのままDB接続を試みる可能性

**改善案**:
```javascript
async getConnectionInfoFromAWS() {
  if (environmentType === 0) {
    db_config = { ... }
    return
  }

  try {
    const data = await ssm.getParameter(params).promise()
    const dbAuthInfo = data.Parameter.Value.split(',')
    db_config = { ... }
  } catch (error) {
    L.eLog.error('Failed to get db connection info: ' + error.message)
    throw error
  }
}
```

#### 修正予定
- **対応者**: （未割当）
- **対応予定日**: （検討中）
- **優先度**: 中（AWS環境利用時は対応必須）

---

## 4. プロセス改善

### 4.1 PROCESS-001: テスト実施記録の標準化

| 項目 | 内容 |
|------|------|
| **課題ID** | PROCESS-001 |
| **カテゴリ** | プロセス |
| **重要度** | 🟢 Low |
| **ステータス** | 🔵 Open |
| **提案内容** | テスト実施記録のテンプレート活用と標準化 |
| **背景** | テスト実施記録の形式が統一されていない |
| **改善案** | TEST_EXECUTION_RECORD_TEMPLATE.mdを必ず使用 |

---

## 5. 長期課題

### 5.1 LONG-001: E2Eテストの実装

| 項目 | 内容 |
|------|------|
| **課題ID** | LONG-001 |
| **カテゴリ** | 長期課題 |
| **重要度** | 🟡 Medium |
| **ステータス** | 🔵 Planned |
| **概要** | E2Eテストの実装（総合テストフェーズ） |
| **詳細** | フロントエンド + バックエンド統合のE2Eテスト |
| **対応予定** | 総合テストフェーズ |

#### 詳細
- **使用ツール**: Playwright
- **テストケース**: ref/E2E_TEST_SCENARIOS.md に記載
- **前提条件**: BUG-001, Bug #1-4が修正済み

---

## 進捗管理

### 課題ステータス集計

| ステータス | 件数 | 備考 |
|-----------|------|------|
| 🔵 Open（未着手） | X | |
| 🟢 In Progress（対応中） | X | |
| ✅ Resolved（解決済み） | X | |
| ⏸️ On Hold（保留） | X | |

### 優先度別集計

| 優先度 | 件数 | 対応期限 |
|--------|------|---------|
| 🔴 Critical | X | 即座 |
| 🔴 High | X | 次フェーズ開始前 |
| 🟡 Medium | X | 次フェーズ中 |
| 🟢 Low | X | 適宜 |

---

## 承認

| 役割 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| テストリーダー | | | |
| プロジェクトマネージャー | | | |
| 品質保証責任者 | | | |

---

## 変更履歴

| 版数 | 日付 | 変更内容 | 作成者 |
|-----|------|---------|--------|
| 1.0 | YYYY-MM-DD | 初版作成 | |
| 1.1 | YYYY-MM-DD | ISSUE-XXX追加 | |

---

## 関連ドキュメント

- [結合テスト作成Plan.md](./結合テスト作成Plan.md)
- [KNOWN_BUGS_EXPECTED_FAILURES.md](./KNOWN_BUGS_EXPECTED_FAILURES.md)
- [INTEGRATION_TEST_REPORT_TEMPLATE.md](./INTEGRATION_TEST_REPORT_TEMPLATE.md)
- [E2E_TEST_SCENARIOS.md](./E2E_TEST_SCENARIOS.md)

---

**最終更新**: YYYY-MM-DD
**作成者**:
**レビュー者**:
