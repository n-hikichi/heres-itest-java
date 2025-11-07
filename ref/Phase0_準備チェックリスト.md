# Phase 0: 結合テスト準備チェックリスト

**期間**: 1日  
**目標**: バグ修正完了、テスト環境構築完了、テストデータ準備完了

---

## 1. バグ修正タスク

### 1.1 BUG-001: geolocation.js パラメータ誤り

**ファイル**: `models/geolocation.js`  
**対象行**: Line 120  

**タスク**:
- [ ] コードレビュー実施
- [ ] 修正内容確認
  ```javascript
  // 修正前（Line 120）
  const params = [companyId, companyId, sectionId]
  
  // 修正後
  const params = [companyId, companyId, groupId]
  ```
- [ ] 単体テスト再実行（カバレッジ維持確認）
- [ ] Git commit & PR作成
- [ ] コードレビュー承認
- [ ] マージ完了

**検証方法**:
```bash
# 単体テストで該当箇所が正常に動作することを確認
npm test -- tests/models/geolocation.test.js

# 期待結果: 全テストPASS、エラーログなし
```

**担当者**: _____________  
**期限**: Phase 0 Day 1 午前中  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 1.2 Bug #1: user-info.js stderr チェックロジック

**ファイル**: `models/user-info.js`  
**対象行**: Line 503, Line 538  
**対象メソッド**: `_checkOldPassword()`, `_changeToNewPassword()`

**タスク**:
- [ ] 現状コード確認
- [ ] stderr チェックロジック修正
  ```javascript
  // 修正前（Line 503付近）
  if (hmUtil.isNullorUndefined(stderr))
  
  // 修正後
  if (stderr && stderr.trim() !== '')
  ```
- [ ] 両メソッドで同様の修正を適用
- [ ] 単体テスト再実行
- [ ] Git commit

**担当者**: _____________  
**期限**: Phase 0 Day 1 午前中  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 1.3 Bug #2: user-info.js stdout チェック

**ファイル**: `models/user-info.js`  
**対象行**: Line 508, Line 543  

**タスク**:
- [ ] stdout が undefined の場合の処理を追加
  ```javascript
  // 修正後（Line 508付近）
  if (hmUtil.isNullorUndefined(stdout)) {
    L.sLog.warn('Password None ! - ' + userId)
    return false
  }
  ```
- [ ] 同様の処理を両メソッドに適用
- [ ] 単体テスト再実行
- [ ] Git commit

**担当者**: _____________  
**期限**: Phase 0 Day 1 午前中  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 1.4 Bug #3: user-info.js try-catch 追加

**ファイル**: `models/user-info.js`  
**対象メソッド**: `_checkOldPassword()`, `_changeToNewPassword()`

**タスク**:
- [ ] exec() 実行箇所に try-catch を追加
  ```javascript
  // 修正後
  try {
    const { stdout, stderr } = await exec(java_cmd)
    
    // stderr チェック
    if (stderr && stderr.trim() !== '') {
      L.eLog.error('Java command error. ' + stderr)
      return false
    }
    
    // stdout チェック
    if (hmUtil.isNullorUndefined(stdout)) {
      L.sLog.warn('Password None ! - ' + userId)
      return false
    }
    
    // 正常処理
    let dec_pass = stdout.replace(/\r?\n/g, '')
    return dec_pass
    
  } catch (err) {
    L.eLog.error('Java command execution failed: ' + err.message)
    return false
  }
  ```
- [ ] 両メソッドに適用
- [ ] エラーハンドリングテストケース作成
- [ ] 単体テスト全体再実行
- [ ] Git commit

**担当者**: _____________  
**期限**: Phase 0 Day 1 午後  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 1.5 Bug #4: user-info.js エラーメッセージ改善

**ファイル**: `models/user-info.js`  
**対象箇所**: エラーハンドリング全般

**タスク**:
- [ ] ユーザー向けエラーメッセージを明確化
  ```javascript
  // API レスポンス例
  {
    "success": false,
    "error": "パスワード変更に失敗しました。時間をおいて再度お試しください。"
  }
  ```
- [ ] ログレベルの適切な設定
- [ ] 単体テスト更新（エラーケース）
- [ ] Git commit

**担当者**: _____________  
**期限**: Phase 0 Day 1 午後  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 1.6 バグ修正総合確認

**タスク**:
- [ ] 全単体テスト実行
  ```bash
  npm test
  ```
- [ ] カバレッジ確認
  ```bash
  npm run test:coverage
  
  # 期待結果:
  # C0 Coverage: > 94.86%
  # C1 Coverage: > 87.41%
  ```
- [ ] ESLint 実行（警告ゼロ確認）
  ```bash
  npm run lint
  ```
- [ ] PR 作成・レビュー・マージ
- [ ] バグ修正完了報告書作成

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

## 2. テスト環境構築

### 2.1 開発環境（Phase 1用）

**ローカル PostgreSQL セットアップ**:
- [ ] PostgreSQL 14.12+ インストール確認
  ```bash
  psql --version
  # 期待: PostgreSQL 14.12 以上
  ```
- [ ] テスト用データベース作成
  ```bash
  createdb heresme_test
  ```
- [ ] スキーマ適用
  ```bash
  psql heresme_test < schema/heresme_schema.sql
  ```
- [ ] 接続確認
  ```bash
  psql heresme_test -c "SELECT version();"
  ```

**Node.js 環境確認**:
- [ ] Node.js バージョン確認
  ```bash
  node --version
  # 期待: v22.14.0 以上
  ```
- [ ] npm パッケージインストール
  ```bash
  npm install
  ```
- [ ] アプリケーション起動確認
  ```bash
  npm start
  # 期待: Server started on port 3000
  ```

**Java 環境確認**:
- [ ] JDK バージョン確認
  ```bash
  java -version
  # 期待: Java 11 以上
  ```
- [ ] JAVA_HOME 設定確認
  ```bash
  echo $JAVA_HOME
  ```
- [ ] EncDec.class 配置確認
  ```bash
  ls -la util/EncDec.class
  # または
  ls -la src/main/java/com/micros/util/EncDec.class
  ```
- [ ] EncDec 動作確認
  ```bash
  # パスワード暗号化テスト
  java -classpath util EncDec enc test123
  
  # パスワード復号化テスト（暗号化結果を使用）
  java -classpath util EncDec dec <暗号化結果>
  ```

**担当者**: _____________  
**期限**: Phase 0 Day 1 午後  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 2.2 検証環境（Phase 2用）

**AWS アカウント準備**:
- [ ] AWS CLI インストール・設定確認
  ```bash
  aws --version
  aws configure list
  ```
- [ ] 必要な権限確認
  - SSM Parameter Store: Read/Write
  - RDS: Connect
  - CloudWatch Logs: Read

**AWS SSM Parameter Store 設定**:
- [ ] パラメータ作成
  ```bash
  aws ssm put-parameter \
    --name "heresme.db_auth_info" \
    --value "検証DB_HOST,5432,heresme_test,dbuser,dbpassword" \
    --type "SecureString" \
    --overwrite
  ```
- [ ] パラメータ取得確認
  ```bash
  aws ssm get-parameter \
    --name "heresme.db_auth_info" \
    --with-decryption
  ```

**検証用 PostgreSQL セットアップ**:
- [ ] RDS インスタンス確認（または検証用DB確認）
- [ ] 接続情報確認
- [ ] スキーマ適用
- [ ] セキュリティグループ設定確認

**環境変数設定**:
- [ ] `.env.test` ファイル作成
  ```bash
  NODE_ENV=test
  environmentType=1
  DATABASE_URL=<検証DB接続文字列>
  JWT_SECRET=<テスト用シークレット>
  ```

**担当者**: _____________  
**期限**: Phase 1完了後（Phase 2開始前）  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

## 3. テストデータ準備

### 3.1 マスタデータ投入スクリプト

**タスク**:
- [ ] `scripts/test-data-setup.sql` 作成
- [ ] 以下のマスタデータを含める:
  - [ ] 企業マスタ (company001, company002)
  - [ ] ユーザマスタ (user001-005)
  - [ ] 部署マスタ (section001-003)
  - [ ] グループマスタ (group001-003)
  - [ ] 位置情報マスタ (本社、支社オフィス)
- [ ] パスワード暗号化
  ```bash
  # ユーザパスワード暗号化
  java -classpath util EncDec enc test123
  # 結果をマスタデータに含める
  ```
- [ ] スクリプト実行確認
  ```bash
  psql heresme_test < scripts/test-data-setup.sql
  ```

**担当者**: _____________  
**期限**: Phase 0 Day 1 午後  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 3.2 トランザクションデータ投入

**テストシナリオ別データ**:

**IT-001/IT-002 用データ**:
- [ ] 前日の勤務ログ（日またぎテスト用）
  ```sql
  INSERT INTO telework_log (user_id, company_id, log_date, log_time, category, linked_date, updated)
  VALUES 
    ('user001', 'company001', '2025-11-05', '23:00:00', 1, '2025-11-05', 0);
  ```

**IT-010 用データ**:
- [ ] ユーザ認証用データ（暗号化パスワード）
  ```sql
  INSERT INTO users (user_id, company_id, passwd, name)
  VALUES 
    ('user001', 'company001', '<暗号化されたパスワード>', 'Test User');
  ```

**IT-003 用データ**:
- [ ] グループ別位置情報
  ```sql
  INSERT INTO geolocation (id, company_id, group_id, name, latitude, longitude, radius)
  VALUES
    (1, 'company001', 'group001', '本社オフィス', 35.6812, 139.7671, 100),
    (2, 'company001', 'group001', '支社オフィス', 35.6895, 139.6917, 50);
  ```

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 3.3 クリーンアップスクリプト

**タスク**:
- [ ] `scripts/test-data-cleanup.sql` 作成
- [ ] トランザクションデータ削除クエリ
  ```sql
  -- テストデータ削除
  DELETE FROM telework_log WHERE user_id LIKE 'user%';
  DELETE FROM geolocation WHERE company_id = 'company001';
  DELETE FROM users WHERE user_id LIKE 'user%';
  ```
- [ ] マスタデータは残す（再利用）
- [ ] スクリプト実行確認

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

## 4. テストツール準備

### 4.1 Postman セットアップ

**タスク**:
- [ ] Postman インストール
- [ ] Here's Me Server API コレクション作成
- [ ] 環境変数設定（開発環境、検証環境）
- [ ] 認証トークン管理設定
- [ ] サンプルリクエスト作成
  - [ ] POST /api/login
  - [ ] POST /api/geolocation
  - [ ] GET /api/geolocation/:memberId
  - [ ] POST /api/telework/start

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 4.2 ログ監視ツール準備

**タスク**:
- [ ] アプリケーションログ出力確認
  ```bash
  tail -f logs/app.log
  ```
- [ ] エラーログフィルタースクリプト作成
  ```bash
  # error-filter.sh
  tail -f logs/app.log | grep -i "error\|warn\|critical"
  ```
- [ ] ログローテーション設定確認

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

## 5. ドキュメント準備

### 5.1 テスト実施手順書

**タスク**:
- [ ] 各テストケースの実施手順を詳細化
- [ ] 期待結果の明確化
- [ ] スクリーンショット取得箇所の明記
- [ ] チェックリスト形式で作成

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

### 5.2 テスト結果記録テンプレート

**タスク**:
- [ ] 日次テスト報告書テンプレート作成
- [ ] 不具合報告書テンプレート作成
- [ ] GitHub Issue テンプレート作成
  - バグ報告用
  - 改善提案用

**担当者**: _____________  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了

---

## 6. 最終確認

### 6.1 Phase 0 完了判定

**全タスク完了確認**:
- [ ] バグ修正完了（6項目）
- [ ] 開発環境構築完了
- [ ] テストデータ準備完了
- [ ] テストツール準備完了
- [ ] ドキュメント準備完了

**動作確認**:
- [ ] アプリケーションが正常起動する
- [ ] データベース接続が正常
- [ ] Java EncDec が正常動作
- [ ] テストデータが正しく投入されている
- [ ] 単体テストが全てPASS

**Phase 1 開始判定**:
- [ ] 上記全てクリア
- [ ] テストリーダー承認
- [ ] Phase 1 開始GO判定

**担当者**: テストリーダー  
**期限**: Phase 0 Day 1 終了時  
**ステータス**: ⬜ 未完了 / ⬜ 完了

---

## 7. 報告

**Phase 0 完了報告**:
- [ ] バグ修正完了報告
- [ ] 環境構築完了報告
- [ ] Phase 1 開始可否判定
- [ ] 課題・リスク報告

**報告先**: プロジェクトマネージャー  
**報告期限**: Phase 0 Day 1 17:00

---

**チェックリスト記入者**: _____________  
**最終更新日**: 2025-11-06  
**ステータスサマリー**: ⬜ 未着手 / ⬜ 作業中 / ⬜ 完了
