# 統合テスト・総合テストへの申し送り事項

## 文書の目的

単体テストでカバーできなかった以下の項目について、統合テスト・総合テスト（E2Eテスト）で検証することを推奨します。

**作成日**: 2025-11-04
**対象フェーズ**: Phase 1 & 1.5 & 2 完了後
**単体テストカバレッジ状況**:
- C0 (Statements): 94.86%
- C1 (Branches): 87.41%
- 総テストケース数: 296件

---

## 1. 統合テスト推奨項目

### 1.1 telework.js - 旧バージョン対応コード（高優先度）

**対象**: `models/telework.js` Lines 251, 257-279
**メソッド**: `insertTeleworkLogByMember`
**優先度**: **高**

#### 未カバーコード
```javascript
// Line 247-279
// 旧バージョン対応(～ver2.0)
// (更新有無フラグ)
let updated = payload.updated
if (hmUtil.isNullorUndefined(updated)) {
  updated = TELEWORK_DATA_INITIAL  // Line 251 ← 未カバー
}
// (紐づく年月日)
let linked_date = payload.linked_date
if (hmUtil.isNullorUndefined(linked_date)) {
  if (payload.category === TELEWORK_CATEGORY_START) {
    // Lines 257-279 ← 未カバー
    // 直近のlinked_dateを取得する複雑な処理
  }
}
```

#### 単体テストでカバー困難な理由
1. **モックの複雑性**
   - 前のテストケースで設定した`dbUtil.executeQueryRead`のモックが残存
   - `jest.clearAllMocks()`はモック実装をクリアしない
   - 新しいテストのモック設定が正しく適用されない

2. **旧バージョン対応コード**
   - `updated`と`linked_date`の両方が未指定（undefined）となるのは旧クライアント（ver2.0以前）のみ
   - 実環境でのみ発生する複雑な相互作用が存在

#### 統合テストで検証すべき項目

**テストシナリオ1: 旧クライアント（ver2.0以前）からの勤務開始登録**
```
前提条件:
- クライアントバージョン: ver1.x
- 既に前日の勤務データが存在

テストケース:
1. updated未指定、linked_date未指定で勤務開始（category=1）を登録
2. DBに正しくlinked_dateが設定されることを確認
3. updatedがTELEWORK_DATA_INITIALに設定されることを確認
```

**テストシナリオ2: 旧クライアントからの日またぎ勤務登録**
```
前提条件:
- 前日23:00に勤務開始
- 翌日02:00に離席登録

テストケース:
1. updated未指定、linked_date未指定で離席（category=2）を登録
2. linked_dateが前日の日付で設定されることを確認
3. 日またぎ勤務として正しく記録されることを確認
```

**期待される動作**:
- Lines 251, 257-279が実行される
- 旧クライアントとの互換性が保たれる
- 日またぎ勤務が正しく処理される

---

### 1.2 db-util.js - AWS環境依存コード（中優先度）

**対象**: `models/db-util.js` Lines 35-49, 67-68, 208-209
**メソッド**: `getConnectionInfoFromAWS`, `executeQuery`, `executeQueryInjection`
**優先度**: **中**

#### 未カバーコード
```javascript
// Lines 22-58: getConnectionInfoFromAWS
async getConnectionInfoFromAWS() {
  if (environmentType === 0) {
    // localhost用（単体テストでカバー済み）
    db_config = { ... }
    return
  }

  // Lines 35-49: AWS SSM関連（未カバー）
  var params = {
    Name: 'heresme.db_auth_info',
    WithDecryption: true
  }
  ssm.getParameter(params, (err, data) => {
    if (err) {
      L.eLog.error('failed to get db connection info. (' + err + ')')  // Line 41
    }
    else {
      L.sLog.debug('get db connection info succeeded.')  // Line 44
      // DB接続情報作成
      let dbAuthInfo = data.Parameter.Value.split(',')  // Line 48
      db_config = { ... }
    }
  })
}

// Lines 66-68: db_config === null の場合の再取得
if (db_config === null) {
  L.sLog.warn('get DB connection info again.')  // Line 67
  let ret = this.getConnectionInfoFromAWS()     // Line 68
}
```

#### 単体テストでカバー困難な理由
- `environmentType`がハードコードで`0`（localhost）に設定されている
- AWS SSMサービスは実環境でのみ利用可能
- AWS認証情報が必要

#### 統合テストで検証すべき項目

**テストシナリオ1: 検証環境でのDB接続情報取得**
```
前提条件:
- 検証環境にデプロイ
- environmentType = 1
- AWS SSMに接続情報が設定済み

テストケース:
1. アプリケーション起動時にgetConnectionInfoFromAWSが実行される
2. AWS SSMから接続情報が正常に取得される
3. db_configが正しく設定される
4. データベース接続が成功する
```

**テストシナリオ2: AWS SSMエラー時の動作**
```
前提条件:
- AWS SSMの接続情報が不正または存在しない

テストケース:
1. getConnectionInfoFromAWSがエラーを返す
2. エラーログが出力される
3. アプリケーションが適切にエラーハンドリングする
```

**テストシナリオ3: db_config初期化失敗時の再取得**
```
前提条件:
- 初回のgetConnectionInfoFromAWSが失敗
- db_config === null

テストケース:
1. executeQuery実行時にdb_config === nullを検知
2. getConnectionInfoFromAWSを再実行
3. 警告ログが出力される
4. 接続情報が再取得される
```

---

### 1.3 db-util.js - constructorのearly return（低優先度）

**対象**: `models/db-util.js` Line 16
**メソッド**: `constructor`
**優先度**: **低**

#### 未カバーコード
```javascript
constructor() {
  if (db_config !== null) {
    // 接続情報取得済み
    return  // Line 16 ← 未カバー
  }
  this.getConnectionInfoFromAWS()
  L.sLog.debug('db_config : ' + JSON.stringify(db_config))
}
```

#### 統合テストで検証すべき項目

**テストシナリオ: アプリケーション再起動後のDB接続**
```
前提条件:
- 初回起動でdb_configが設定済み
- アプリケーション再起動（プロセス再起動ではなくモジュール再読み込み）

テストケース:
1. 2回目のDbUtilインスタンス化
2. constructorのearly returnが実行される
3. getConnectionInfoFromAWSが再実行されない
4. 既存のdb_configが使用される
```

---

## 2. バグ修正後の検証推奨項目

以下の項目はバグ修正が必要なため、修正後に統合テストで検証することを推奨します。

### 2.1 geolocation.js - sectionId未定義バグ（高優先度）

**対象**: `models/geolocation.js` Line 123
**バグ番号**: BUG-001
**優先度**: **高**

#### バグ内容
```javascript
async getGeolocationByGroup(companyId, groupId) {
  const query = SELECT_GEOLOCATION_BY_GROUP
  const params = [
    companyId,
    companyId,
    sectionId,  // Line 120 ← sectionIdが未定義
  ]
  return await dbUtil.executeQueryRead(query, params, 'getGeolocationByGroup')
}
```

#### 修正後の統合テスト
```
テストシナリオ:
1. groupIdを指定してgetGeolocationByGroupを実行
2. 正しいグループの位置情報が取得される
3. エラーが発生しない
```

---

### 2.2 user-info.js - 暗号化/復号化コマンドのバグ（中優先度）

**対象**: `models/user-info.js` Lines 503-504, 508-509, 538-539, 543-544
**バグ内容**: `stderr`/`stdout`が`null`/`undefined`の場合の処理が不適切
**優先度**: **中**

#### 修正後の統合テスト
```
テストシナリオ1: パスワード変更の正常系
1. 正しい旧パスワードで変更
2. 暗号化/復号化が正常に動作
3. 新パスワードでログイン成功

テストシナリオ2: 暗号化コマンドエラー
1. 暗号化コマンドがエラーを返す
2. 適切なエラーハンドリング
3. ユーザーに分かりやすいエラーメッセージ
```

---

### 2.3 login-auth.js - 外部コマンド依存コード（低優先度）

**対象**: `models/login-auth.js` Lines 84-128
**メソッド**: `authenticate` (パスワード暗号化/復号化部分)
**優先度**: **低**

#### 統合テストで検証すべき項目
```
テストシナリオ:
1. 実際の暗号化コマンドを使用した認証
2. 正しいパスワードで認証成功
3. 間違ったパスワードで認証失敗
4. コマンド実行エラー時のハンドリング
```

---

## 3. 到達不可能コード（テスト対象外）

### 3.1 hm-util.js Line 161 - Dead Code

**対象**: `util/hm-util.js` Line 161
**判定**: **到達不可能コード（Dead Code）**
**テスト対象**: **対象外**

#### 理由
```javascript
if (range.indexOf('*') >= 0) {        // Line 147: *が1つ以上ある
  let cidr = 32
  for (...) {
    if (range_array[i] !== '*') continue
    cidr -= 8  // *が見つかるたびに-8
  }
  if(cidr < 32) {  // Line 161: 必ず真（cidrは24,16,8,0のいずれか）
    conv_range += "/" + cidr;
  }
  // else { } ← 論理的に実行不可能
}
```

**cidr値のパターン**:
- *が1個: cidr=24 → `24 < 32` ✓
- *が2個: cidr=16 → `16 < 32` ✓
- *が3個: cidr=8 → `8 < 32` ✓
- *が4個: cidr=0 → `0 < 32` ✓

→ すべてのケースで`cidr < 32`が真になるため、else分岐は実行されない

**推奨対応**: コードレビューでelse分岐を削除、またはカバレッジ除外設定を追加

---

## 4. 統合テスト実施時の注意事項

### 4.1 環境設定
- **検証環境**: environmentType = 1 に設定
- **AWS設定**: SSMパラメータストアに接続情報を設定
- **データベース**: 検証用DBを使用

### 4.2 テストデータ準備
- 旧クライアント（ver2.0以前）のシミュレーション環境
- 日またぎ勤務のテストデータ
- AWS接続情報の正常/異常ケース

### 4.3 テスト実行順序
1. **高優先度**: telework.js（旧バージョン対応）、geolocation.js（バグ修正後）
2. **中優先度**: db-util.js（AWS環境依存）、user-info.js（バグ修正後）
3. **低優先度**: その他の項目

### 4.4 成功基準
- すべての統合テストシナリオがパスすること
- エラーログに異常がないこと
- 実環境に近い条件での動作確認

---

## 5. 参考ドキュメント

- **CHANGELOG.md** - Phase 1, 1.5, 2の詳細成果
- **phase1_phase1.5_completion_status (memory)** - 完了状況の詳細
- **tests/models/telework.test.js** (Lines 968-1000) - telework.jsの困難な理由
- **TEST_COVERAGE_SUMMARY_c0c1.md** - カバレッジレポート詳細
- **BUG_REPORT_user-info.md** - user-info.jsのバグレポート

---

## 6. 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-11-04 | Claude Code | 初版作成（Phase 2完了後） |

---

**次のステップ**: 統合テスト計画を立案し、上記項目を検証してください。
