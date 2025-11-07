# 結合テスト・総合テストケース集

## 文書の目的

このドキュメントは、単体テストから申し送りされたテストケースを、実際に結合テスト（E2Eテスト）として実装可能な形式にまとめたものです。

**作成日**: 2025-11-06
**ベース文書**: INTEGRATION_TEST_HANDOVER.md, TEST_REPORT_PHASE1_2.md
**単体テストカバレッジ**: C0: 94.86%, C1: 87.41%

---

## テストケース一覧

| ID | 優先度 | 対象モジュール | カテゴリ | ステータス |
|----|--------|---------------|----------|-----------|
| IT-001 | 🔴 高 | telework.js | 旧バージョン対応 | 未実装 |
| IT-002 | 🔴 高 | telework.js | 旧バージョン対応 | 未実装 |
| IT-003 | 🔴 高 | geolocation.js | バグ修正後検証 | 未実装（要バグ修正） |
| IT-004 | 🟡 中 | db-util.js | AWS環境依存 | 未実装 |
| IT-005 | 🟡 中 | db-util.js | AWS環境依存 | 未実装 |
| IT-006 | 🟡 中 | db-util.js | AWS環境依存 | 未実装 |
| IT-007 | 🟡 中 | user-info.js | バグ修正後検証 | 未実装（要バグ修正） |
| IT-008 | 🟡 中 | user-info.js | バグ修正後検証 | 未実装（要バグ修正） |
| IT-009 | ⚪ 低 | db-util.js | Constructor動作 | 未実装 |
| IT-010 | ⚪ 低 | login-auth.js | 外部コマンド依存 | 未実装 |

---

## 🔴 高優先度テストケース

### IT-001: 旧クライアント（ver2.0以前）からの勤務開始登録

**対象ファイル**: `models/telework.js`
**対象メソッド**: `insertTeleworkLogByMember`
**対象行**: Lines 251, 257-279
**カテゴリ**: 旧バージョン互換性

#### 単体テストでカバー困難な理由
1. モックの複雑性 - 前のテストケースで設定した`dbUtil.executeQueryRead`のモックが残存
2. 旧バージョン対応コード - `updated`と`linked_date`の両方が未指定（undefined）となるのは旧クライアント（ver2.0以前）のみ
3. 実環境でのみ発生する複雑な相互作用が存在

#### テストシナリオ

**前提条件**:
- クライアントバージョン: ver1.x または ver2.0以前
- 既に前日（例: 2025-11-05）の勤務データが存在
- データベースが正常に稼働している

**テストデータ準備**:
```sql
-- 前日の勤務データを投入
INSERT INTO telework_log (user_id, company_id, log_date, category, linked_date, updated)
VALUES ('user001', 'company001', '2025-11-05', 1, '2025-11-05', 0);
```

**実行手順**:
1. 旧クライアント（ver1.x）のシミュレーション
2. 以下のペイロードでAPI呼び出し:
   ```json
   {
     "userId": "user001",
     "companyId": "company001",
     "category": 1,
     "logDate": "2025-11-06",
     "latitude": 35.6812,
     "longitude": 139.7671
     // updated未指定
     // linked_date未指定
   }
   ```
3. データベースから登録結果を取得

**期待結果**:
- HTTPステータスコード: 200
- レスポンスボディ: `{ success: true }`
- データベース確認:
  ```sql
  SELECT * FROM telework_log
  WHERE user_id = 'user001'
  AND log_date = '2025-11-06'
  AND category = 1;
  ```
- 検証項目:
  - `updated` が `TELEWORK_DATA_INITIAL` (0) に設定されていること
  - `linked_date` が正しく設定されていること（2025-11-06）
  - その他のフィールドが正常に記録されていること

**検証コード（Lines 251）**:
```javascript
// models/telework.js Line 251がカバーされる
if (hmUtil.isNullorUndefined(updated)) {
  updated = TELEWORK_DATA_INITIAL  // ← この行が実行される
}
```

---

### IT-002: 旧クライアントからの日またぎ勤務登録

**対象ファイル**: `models/telework.js`
**対象メソッド**: `insertTeleworkLogByMember`
**対象行**: Lines 257-279
**カテゴリ**: 日またぎ勤務処理

#### テストシナリオ

**前提条件**:
- クライアントバージョン: ver1.x または ver2.0以前
- 前日23:00に勤務開始済み
- データベースが正常に稼働している

**テストデータ準備**:
```sql
-- 前日23:00の勤務開始データを投入
INSERT INTO telework_log (user_id, company_id, log_date, log_time, category, linked_date, updated)
VALUES ('user001', 'company001', '2025-11-05', '23:00:00', 1, '2025-11-05', 0);
```

**実行手順**:
1. 旧クライアント（ver1.x）のシミュレーション
2. システム時刻を翌日02:00に設定
3. 以下のペイロードで離席登録API呼び出し:
   ```json
   {
     "userId": "user001",
     "companyId": "company001",
     "category": 2,
     "logDate": "2025-11-06",
     "logTime": "02:00:00",
     "latitude": 35.6812,
     "longitude": 139.7671
     // updated未指定
     // linked_date未指定
   }
   ```
4. データベースから登録結果を取得

**期待結果**:
- HTTPステータスコード: 200
- レスポンスボディ: `{ success: true }`
- データベース確認:
  ```sql
  SELECT * FROM telework_log
  WHERE user_id = 'user001'
  AND log_date = '2025-11-06'
  AND log_time = '02:00:00'
  AND category = 2;
  ```
- 検証項目:
  - `linked_date` が前日の日付（2025-11-05）で設定されていること
  - `updated` が `TELEWORK_DATA_INITIAL` (0) に設定されていること
  - 日またぎ勤務として正しく記録されていること

**検証コード（Lines 257-279）**:
```javascript
// models/telework.js Lines 257-279がカバーされる
let linked_date = payload.linked_date
if (hmUtil.isNullorUndefined(linked_date)) {
  if (payload.category === TELEWORK_CATEGORY_START) {
    // ← このブロック全体が実行される
    // 直近のlinked_dateを取得する複雑な処理
  }
}
```

---

### IT-003: グループIDによる位置情報取得（バグ修正後）

**対象ファイル**: `models/geolocation.js`
**対象メソッド**: `getGeolocationByGroup`
**対象行**: Line 123
**カテゴリ**: バグ修正後の検証
**関連バグ**: BUG-001 - `sectionId`未定義エラー

#### バグ内容
```javascript
async getGeolocationByGroup(companyId, groupId) {
  const query = SELECT_GEOLOCATION_BY_GROUP
  const params = [
    companyId,
    companyId,
    sectionId,  // Line 120 ← sectionIdが未定義（バグ）
  ]
  return await dbUtil.executeQueryRead(query, params, 'getGeolocationByGroup')
}
```

**修正内容**: `sectionId` → `groupId` に修正が必要

#### テストシナリオ（修正後）

**前提条件**:
- バグ修正が完了していること
- データベースに位置情報マスタデータが存在すること

**テストデータ準備**:
```sql
-- グループに紐づく位置情報を投入
INSERT INTO geolocation (id, company_id, group_id, name, latitude, longitude, radius)
VALUES
  (1, 'company001', 'group001', '本社オフィス', 35.6812, 139.7671, 100),
  (2, 'company001', 'group001', '支社オフィス', 35.6895, 139.6917, 50);
```

**実行手順**:
1. 以下のパラメータでAPI呼び出し:
   ```javascript
   const companyId = 'company001';
   const groupId = 'group001';
   const result = await geolocation.getGeolocationByGroup(companyId, groupId);
   ```
2. 結果を検証

**期待結果**:
- エラーが発生しないこと
- 返り値が正しい位置情報の配列であること:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "company_id": "company001",
        "group_id": "group001",
        "name": "本社オフィス",
        "latitude": 35.6812,
        "longitude": 139.7671,
        "radius": 100
      },
      {
        "id": 2,
        "company_id": "company001",
        "group_id": "group001",
        "name": "支社オフィス",
        "latitude": 35.6895,
        "longitude": 139.6917,
        "radius": 50
      }
    ]
  }
  ```

**バグ修正前の動作**:
- `ReferenceError: sectionId is not defined` が発生する

---

## 🟡 中優先度テストケース

### IT-004: 検証環境でのDB接続情報取得（AWS SSM）

**対象ファイル**: `models/db-util.js`
**対象メソッド**: `getConnectionInfoFromAWS`
**対象行**: Lines 35-49
**カテゴリ**: AWS環境依存

#### 単体テストでカバー困難な理由
- `environmentType`がハードコードで`0`（localhost）に設定されている
- AWS SSMサービスは実環境でのみ利用可能
- AWS認証情報が必要

#### テストシナリオ

**前提条件**:
- 検証環境（AWS）にデプロイ済み
- `environmentType = 1` に設定
- AWS SSMパラメータストアに接続情報が設定済み
  - パラメータ名: `heresme.db_auth_info`
  - 形式: `host,port,database,user,password`
  - 暗号化: 有効

**環境設定**:
```bash
# AWS SSMパラメータストアに接続情報を設定
aws ssm put-parameter \
  --name "heresme.db_auth_info" \
  --value "db.example.com,5432,heresme_db,dbuser,dbpassword" \
  --type "SecureString" \
  --overwrite
```

**実行手順**:
1. アプリケーションを検証環境で起動
2. 初回のDB接続が試行される
3. `getConnectionInfoFromAWS()` が自動的に実行される
4. ログを確認

**期待結果**:
- AWS SSMから接続情報が正常に取得される
- ログ出力:
  ```
  [DEBUG] get db connection info succeeded.
  [DEBUG] db_config : {"host":"db.example.com","port":5432,"database":"heresme_db","user":"dbuser","password":"dbpassword"}
  ```
- データベース接続が成功する
- アプリケーションが正常に動作する

**検証コード（Lines 35-49）**:
```javascript
// models/db-util.js Lines 35-49がカバーされる
var params = {
  Name: 'heresme.db_auth_info',
  WithDecryption: true
}
ssm.getParameter(params, (err, data) => {
  if (err) {
    L.eLog.error('failed to get db connection info. (' + err + ')')
  }
  else {
    L.sLog.debug('get db connection info succeeded.')  // ← Line 44
    let dbAuthInfo = data.Parameter.Value.split(',')   // ← Line 48
    db_config = { ... }
  }
})
```

---

### IT-005: AWS SSMエラー時の動作確認

**対象ファイル**: `models/db-util.js`
**対象メソッド**: `getConnectionInfoFromAWS`
**対象行**: Line 41
**カテゴリ**: エラーハンドリング

#### テストシナリオ

**前提条件**:
- 検証環境（AWS）にデプロイ済み
- AWS SSMの接続情報が不正または存在しない

**環境設定**:
```bash
# AWS SSMパラメータを削除または無効化
aws ssm delete-parameter --name "heresme.db_auth_info"
```

**実行手順**:
1. アプリケーションを起動
2. DB接続が試行される
3. `getConnectionInfoFromAWS()` がエラーを返す
4. ログを確認

**期待結果**:
- エラーログが出力される:
  ```
  [ERROR] failed to get db connection info. (ParameterNotFound: Parameter heresme.db_auth_info not found)
  ```
- アプリケーションが適切にエラーハンドリングする
- クラッシュせずに継続動作または安全に終了する

**検証コード（Line 41）**:
```javascript
// models/db-util.js Line 41がカバーされる
if (err) {
  L.eLog.error('failed to get db connection info. (' + err + ')')  // ← この行が実行される
}
```

---

### IT-006: db_config初期化失敗時の再取得

**対象ファイル**: `models/db-util.js`
**対象メソッド**: `executeQuery`
**対象行**: Lines 67-68
**カテゴリ**: リトライ処理

#### テストシナリオ

**前提条件**:
- 初回の`getConnectionInfoFromAWS`が失敗
- `db_config === null`の状態

**実行手順**:
1. AWS SSMへのアクセスを一時的にブロック
2. アプリケーションを起動（初回接続失敗）
3. AWS SSMへのアクセスを復旧
4. SQLクエリを実行（`executeQuery`を呼び出す）
5. ログを確認

**期待結果**:
- `executeQuery`実行時に`db_config === null`を検知
- 警告ログが出力される:
  ```
  [WARN] get DB connection info again.
  ```
- `getConnectionInfoFromAWS`を再実行
- 接続情報が再取得される
- クエリが正常に実行される

**検証コード（Lines 67-68）**:
```javascript
// models/db-util.js Lines 67-68がカバーされる
if (db_config === null) {
  L.sLog.warn('get DB connection info again.')  // ← Line 67
  let ret = this.getConnectionInfoFromAWS()     // ← Line 68
}
```

---

### IT-007: パスワード変更の正常系（バグ修正後）

**対象ファイル**: `models/user-info.js`
**対象メソッド**: `changePassword`（内部: `_checkOldPassword`, `_changeToNewPassword`）
**対象行**: Lines 502-513, 537-548
**カテゴリ**: バグ修正後の検証
**関連バグ**: BUG_REPORT_user-info.md - Bug #1, #2, #3, #4

#### バグ内容（修正前）
1. **Bug #1**: `stderr`のチェックロジックが逆
   - `if (hmUtil.isNullorUndefined(stderr))` は誤り
   - 正: `if (stderr && stderr.trim() !== '')`

2. **Bug #3**: `exec()`に`try-catch`がない
   - Javaコマンドが失敗した場合、アプリケーションがクラッシュ

#### テストシナリオ（修正後）

**前提条件**:
- バグ修正が完了していること
- Java EncDecクラスが正しく配置されていること
- データベースにユーザーデータが存在すること

**テストデータ準備**:
```sql
-- ユーザーデータを投入（パスワードは暗号化済み）
INSERT INTO users (user_id, company_id, passwd)
VALUES ('user001', 'company001', 'encrypted_old_password');
```

**実行手順**:
1. 以下のパラメータでパスワード変更API呼び出し:
   ```json
   {
     "userId": "user001",
     "companyId": "company001",
     "oldPassword": "OldPass123!",
     "newPassword": "NewPass456!"
   }
   ```
2. 内部でJavaコマンドが実行される:
   - 復号化: `java -cp ... EncDec dec encrypted_old_password`
   - 比較: 復号化結果 === "OldPass123!"
   - 暗号化: `java -cp ... EncDec enc NewPass456!`
3. 結果を検証

**期待結果**:
- HTTPステータスコード: 200
- レスポンスボディ: `{ success: true }`
- データベース確認:
  ```sql
  SELECT passwd FROM users
  WHERE user_id = 'user001'
  AND company_id = 'company001';
  ```
- `passwd`フィールドが新しい暗号化パスワードに更新されていること
- 新パスワードでログインできること

**検証コード（Lines 502-513, 537-548）**:
```javascript
// 修正後のコード例
try {
  const { stdout, stderr } = await exec(java_cmd)

  // Bug #1修正: stderrのチェックロジックを修正
  if (stderr && stderr.trim() !== '') {
    L.eLog.error('Java command error. ' + stderr)  // ← Line 503が実行される
    return false
  }

  // Bug #2修正: stdoutのチェック
  if (hmUtil.isNullorUndefined(stdout)) {
    L.sLog.warn('Password None ! - ' + userId)  // ← Line 508が実行される
    return false
  }

  let dec_pass = stdout.replace(/\r?\n/g, '')
} catch (err) {
  // Bug #3修正: try-catchを追加
  L.eLog.error('Java command execution failed: ' + err.message)
  return false
}
```

---

### IT-008: 暗号化コマンドエラー時の適切なハンドリング

**対象ファイル**: `models/user-info.js`
**対象メソッド**: `changePassword`
**対象行**: Lines 537-548
**カテゴリ**: エラーハンドリング

#### テストシナリオ（修正後）

**前提条件**:
- バグ修正が完了していること
- Javaコマンドが意図的にエラーを返す状態を作る

**実行手順**:
1. Javaコマンドのパスを不正な値に設定
2. パスワード変更API呼び出し
3. エラーログを確認

**期待結果**:
- HTTPステータスコード: 500
- レスポンスボディ: `{ success: false, error: "パスワード変更に失敗しました" }`
- エラーログが出力される:
  ```
  [ERROR] Java command error. (コマンドのエラーメッセージ)
  ```
- アプリケーションがクラッシュしないこと
- ユーザーに分かりやすいエラーメッセージが返されること

---

## ⚪ 低優先度テストケース

### IT-009: アプリケーション再起動後のDB接続

**対象ファイル**: `models/db-util.js`
**対象メソッド**: `constructor`
**対象行**: Line 16
**カテゴリ**: Constructor動作

#### テストシナリオ

**前提条件**:
- 初回起動で`db_config`が設定済み
- アプリケーション再起動（プロセス再起動ではなくモジュール再読み込み）

**実行手順**:
1. アプリケーションを起動し、DB接続を確立
2. モジュールを再読み込み
3. 2回目の`DbUtil`インスタンス化
4. ログを確認

**期待結果**:
- constructorの`early return`が実行される（Line 16）
- `getConnectionInfoFromAWS`が再実行されない
- 既存の`db_config`が使用される
- データベース接続が正常に動作する

**検証コード（Line 16）**:
```javascript
// models/db-util.js Line 16がカバーされる
constructor() {
  if (db_config !== null) {
    return  // ← この行が実行される
  }
  this.getConnectionInfoFromAWS()
}
```

---

### IT-010: 外部コマンド実行を含む認証処理

**対象ファイル**: `models/login-auth.js`
**対象メソッド**: `authenticate`
**対象行**: Lines 84-128
**カテゴリ**: 外部コマンド依存

#### テストシナリオ1: 正しいパスワードで認証成功

**前提条件**:
- Java EncDecクラスが正しく配置されていること
- データベースにユーザーデータが存在すること

**テストデータ準備**:
```sql
-- ユーザーデータを投入
INSERT INTO users (user_id, company_id, passwd, name)
VALUES ('user001', 'company001', 'encrypted_password', 'Test User');
```

**実行手順**:
1. 以下のパラメータで認証API呼び出し:
   ```json
   {
     "userId": "user001",
     "companyId": "company001",
     "password": "CorrectPassword123!"
   }
   ```
2. 内部でJavaコマンドが実行される:
   - `java -cp ... EncDec dec encrypted_password`
   - 復号化結果 === "CorrectPassword123!"
3. 結果を検証

**期待結果**:
- HTTPステータスコード: 200
- レスポンスボディ:
  ```json
  {
    "success": true,
    "user": {
      "userId": "user001",
      "companyId": "company001",
      "name": "Test User"
    },
    "token": "jwt_token_here"
  }
  ```
- セッションが確立される

#### テストシナリオ2: 間違ったパスワードで認証失敗

**実行手順**:
1. 以下のパラメータで認証API呼び出し:
   ```json
   {
     "userId": "user001",
     "companyId": "company001",
     "password": "WrongPassword"
   }
   ```
2. 復号化結果と比較が行われる
3. 結果を検証

**期待結果**:
- HTTPステータスコード: 401
- レスポンスボディ:
  ```json
  {
    "success": false,
    "error": "認証に失敗しました"
  }
  ```
- セッションが確立されない

#### テストシナリオ3: コマンド実行エラー時のハンドリング

**実行手順**:
1. Javaコマンドのパスを不正な値に設定
2. 認証API呼び出し
3. エラーハンドリングを確認

**期待結果**:
- HTTPステータスコード: 500
- エラーログが出力される
- アプリケーションがクラッシュしないこと

---

## 結合テスト実施の前提条件

### 環境設定

#### 1. 検証環境（AWS）
- `environmentType = 1` に設定
- AWS SSMパラメータストアに接続情報を設定:
  ```bash
  aws ssm put-parameter \
    --name "heresme.db_auth_info" \
    --value "host,port,database,user,password" \
    --type "SecureString"
  ```

#### 2. データベース
- 検証用DBを使用
- テストデータの投入スクリプトを準備
- テスト後のクリーンアップスクリプトを準備

#### 3. Java環境
- Java EncDecクラスが正しく配置されていること
- クラスパスが正しく設定されていること
- 実行権限が付与されていること

#### 4. 旧クライアントシミュレーション
- ver1.x または ver2.0以前のクライアントの動作をシミュレート
- `updated`と`linked_date`を未指定にするテストクライアントを準備

---

## テスト実行順序

### Phase 1: バグ修正不要な項目（優先実施）
1. ✅ **IT-001**: 旧クライアント勤務開始登録
2. ✅ **IT-002**: 旧クライアント日またぎ勤務登録
3. ✅ **IT-004**: AWS SSM接続情報取得
4. ✅ **IT-005**: AWS SSMエラー時の動作
5. ✅ **IT-006**: db_config再取得
6. ✅ **IT-009**: Constructor early return
7. ✅ **IT-010**: 外部コマンド実行認証

### Phase 2: バグ修正後に実施
8. ⚠️ **IT-003**: geolocation.js（BUG-001修正後）
9. ⚠️ **IT-007**: user-info.js パスワード変更（Bug #1-4修正後）
10. ⚠️ **IT-008**: user-info.js エラーハンドリング（Bug #1-4修正後）

---

## 成功基準

### 全体
- すべての結合テストシナリオがパスすること
- エラーログに異常がないこと
- 実環境に近い条件での動作確認ができること

### 個別テストケース
各テストケースの「期待結果」セクションに記載された条件をすべて満たすこと

---

## 参考ドキュメント

- **INTEGRATION_TEST_HANDOVER.md** - 詳細な申し送り事項と背景
- **BUG_REPORT_user-info.md** - user-info.jsのバグ詳細
- **TEST_REPORT_PHASE1_2.md** - Phase 1, 1.5, 2の完了報告
- **TESTING_SUMMARY.md** - テストサマリー
- **CHANGELOG.md** - 各フェーズの詳細成果
- **TEST_COVERAGE_SUMMARY_c0c1.md** - カバレッジレポート詳細

---

## 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-11-06 | Claude Code | 初版作成 - INTEGRATION_TEST_HANDOVER.mdから構造化されたテストケース集を作成 |

---

**次のステップ**:
1. Phase 1のテストケース（バグ修正不要）から実装開始
2. バグ修正完了後、Phase 2のテストケースを実装
3. テスト自動化の検討（Cypress, Playwright等）
