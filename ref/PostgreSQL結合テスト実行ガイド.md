# PostgreSQL結合テスト実行ガイド

> **📌 用語について**: このドキュメントでは Integration Test を「**結合テスト**」と呼びます。詳細は [テスト用語定義.md](./テスト用語定義.md) を参照してください。

## 目次

1. [概要](#概要)
2. [前提条件](#前提条件)
3. [PostgreSQLセットアップ](#postgresqlセットアップ)
4. [データベース準備](#データベース準備)
5. [テスト実行手順](#テスト実行手順)
6. [テスト結果の確認方法](#テスト結果の確認方法)
7. [トラブルシューティング](#トラブルシューティング)
8. [テストモジュール一覧](#テストモジュール一覧)

---

## 概要

本ドキュメントは、Here's Me Serverの結合テストをPostgreSQL環境で実行するための手順書です。

**テスト概要**:
- **テストモジュール数**: 10ファイル
- **総テストケース数**: 78件
- **Expected FAIL**: 3件（既知のバグによる）
- **実行環境**: localhost（開発環境）

---

## 前提条件

### 必須ソフトウェア

| ソフトウェア | バージョン | 確認コマンド |
|:------------|:----------|:------------|
| Node.js | 14.x以上 | `node --version` |
| npm | 6.x以上 | `npm --version` |
| PostgreSQL | 12.x以上 | `psql --version` |
| Java | 8以上 | `java -version` |

### 必須ファイル

- `util/EncDec.class` - Javaパスワード暗号化/復号化クラス
- `ref/test-data-setup.sql` - テストデータ投入SQL
- `ref/test-data-cleanup.sql` - テストデータ削除SQL
- `ref/.env.test` - localhost環境設定ファイル

---

## PostgreSQLセットアップ

### 方法1: Ubuntu/Debian環境

```bash
# PostgreSQLインストール
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL起動
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 状態確認
sudo systemctl status postgresql
```

### 方法2: macOS環境

```bash
# Homebrewでインストール
brew install postgresql@14

# PostgreSQL起動
brew services start postgresql@14

# 状態確認
brew services list | grep postgresql
```

### 方法3: Docker環境

```bash
# PostgreSQLコンテナ起動
docker run -d \
  --name heres-postgres \
  -p 5432:5432 \
  -e POSTGRES_USER=imhereadmin \
  -e POSTGRES_PASSWORD=admin555 \
  -e POSTGRES_DB=imhere \
  postgres:14

# 状態確認
docker ps | grep heres-postgres

# ログ確認
docker logs heres-postgres
```

### PostgreSQL接続確認

```bash
# psqlで接続
psql -h localhost -U imhereadmin -d imhere

# パスワード: admin555

# 接続成功時の出力例:
# psql (14.x)
# Type "help" for help.
#
# imhere=#
```

---

## データベース準備

### 1. データベース・ユーザー作成

PostgreSQLにログイン（postgresユーザー）:

```bash
sudo -u postgres psql
```

以下のSQLを実行:

```sql
-- ユーザー作成
CREATE USER imhereadmin WITH PASSWORD 'admin555';

-- データベース作成
CREATE DATABASE imhere OWNER imhereadmin;

-- 権限付与
GRANT ALL PRIVILEGES ON DATABASE imhere TO imhereadmin;

-- 終了
\q
```

### 2. スキーマ作成

プロジェクトのスキーマファイルを適用:

```bash
# スキーマファイルがある場合
psql -h localhost -U imhereadmin -d imhere -f schema/create_tables.sql

# または、既存のバックアップから復元
psql -h localhost -U imhereadmin -d imhere < backup.sql
```

**最低限必要なテーブル**:

- `iw_usertbl` - ユーザー情報
- `iw_companytbl` - 企業情報
- `iw_locatetbl` - 位置情報
- `telework_log` - テレワークログ
- `iw_tokentbl` - 認証トークン

### 3. テストデータ投入

```bash
# テストデータ投入スクリプト実行
psql -h localhost -U imhereadmin -d imhere -f ref/test-data-setup.sql

# 投入確認
psql -h localhost -U imhereadmin -d imhere -c "SELECT COUNT(*) FROM iw_usertbl;"
```

**テストデータ投入内容** (`test-data-setup.sql`):

```sql
-- 企業マスタ
INSERT INTO iw_companytbl (company_id, company_name) VALUES
  ('company001', 'テスト企業A'),
  ('company002', 'テスト企業B');

-- ユーザーマスタ
INSERT INTO iw_usertbl (user_id, company_id, staff_id, passwd, mail, group_id, section) VALUES
  ('user001', 'company001', 'staff001', 'encrypted_password_here', 'test@example.com', 'group001', 'section001'),
  ('user002', 'company001', 'staff002', 'encrypted_password_here', 'test2@example.com', 'group001', 'section001');

-- 位置情報マスタ
INSERT INTO iw_locatetbl (company_id, staff_id, latitude, longitude, message, send_time) VALUES
  ('company001', 'staff001', '35.6812', '139.7671', 'Tokyo Station', NOW()),
  ('company001', 'staff002', '35.6895', '139.6917', 'Shinjuku', NOW());

-- ※実際のパスワードはJava EncDecで暗号化する必要があります
```

### 4. Java EncDecセットアップ

パスワード暗号化/復号化用のJavaクラスを配置:

```bash
# EncDec.classがutil/ディレクトリに存在することを確認
ls -l util/EncDec.class

# 動作確認
java -classpath util/ EncDec enc test123
# 出力: <暗号化された文字列>

java -classpath util/ EncDec dec <暗号化された文字列>
# 出力: test123
```

**パスワードの暗号化手順**:

```bash
# テストユーザーのパスワード(test123)を暗号化
ENCRYPTED=$(java -classpath util/ EncDec enc test123)
echo $ENCRYPTED

# DBに暗号化パスワードを設定
psql -h localhost -U imhereadmin -d imhere -c \
  "UPDATE iw_usertbl SET passwd='$ENCRYPTED' WHERE user_id='user001';"
```

---

## テスト実行手順

### 1. 環境変数の設定

テスト環境設定ファイル `.env.test` を確認:

```bash
cat ref/.env.test
```

**設定内容**:

```bash
NODE_ENV=test
environmentType=0  # localhost環境

# PostgreSQL設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=imhere
DB_USER=imhereadmin
DB_PASSWORD=admin555

# Java設定
JAVA_CLASSPATH=./util
```

### 2. 環境チェックスクリプト実行

テスト実行前に環境を確認:

```bash
bash ref/check-test-environment.sh
```

**出力例**:

```
========================================
Here's Me Server - テスト環境確認
========================================

[必須コマンド確認]
✓ node: /usr/bin/node
✓ npm: /usr/bin/npm
✓ java: /usr/bin/java
✓ psql: /usr/bin/psql

[サービス確認]
✓ PostgreSQL: Running on port 5432

[ファイル確認]
✓ util/EncDec.class: 存在
✓ ref/.env.test: 存在

[環境変数確認]
✓ NODE_ENV: test
✓ DB_HOST: localhost

[npmパッケージ確認]
✓ jest: インストール済み
✓ pg: インストール済み

[データベース接続確認]
✓ PostgreSQL接続: 成功 (imhere)

========================================
環境チェック完了: 11/11 項目 OK
========================================
```

### 3. 全テスト実行

全ての結合テストを実行:

```bash
# 全テスト実行
npm test -- --config=ref/jest.integration.config.js tests/integration/

# または、実行スクリプトを使用
bash ref/run-all-integration-tests.sh
```

### 4. 個別テスト実行

特定のテストモジュールのみを実行:

```bash
# IT-001, IT-002: Telework基本機能
npm test -- tests/integration/telework.integration.test.js

# IT-003: Geolocation（Expected FAIL含む）
npm test -- tests/integration/geolocation.integration.test.js

# IT-007, IT-008: UserInfo（Expected FAIL含む）
npm test -- tests/integration/user-info.integration.test.js

# IT-009: DB Util
npm test -- tests/integration/db-util.integration.test.js

# IT-010: Login認証
npm test -- tests/integration/login-auth.integration.test.js

# IT-011: Telework境界値テスト
npm test -- tests/integration/telework-boundary.integration.test.js

# IT-012: Teleworkエラーハンドリング
npm test -- tests/integration/telework-error.integration.test.js

# IT-013: Geolocation境界値テスト
npm test -- tests/integration/geolocation-boundary.integration.test.js

# IT-014: UserInfo境界値テスト
npm test -- tests/integration/user-info-boundary.integration.test.js
```

### 5. AWS環境テスト（オプション）

AWS環境でのSSMテストをスキップせずに実行する場合:

```bash
# AWS環境設定
export environmentType=1
export AWS_REGION=ap-northeast-1
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key

# AWS SSMテスト実行
npm test -- tests/integration/aws-ssm.integration.test.js
```

**注意**: localhost環境では `environmentType=0` のため、AWS SSMテストは自動的にスキップされます。

---

## テスト結果の確認方法

### 1. Jest出力の見方

```
 PASS  tests/integration/telework.integration.test.js
  IT-001: 旧クライアント勤務開始登録
    ✓ updated未指定で初期値0が設定される (123ms)
    ✓ linked_date未指定でlog_dateが設定される (45ms)
    ✓ 緯度・経度が正しく記録される (38ms)
    ✓ カスタムマッチャー: DB存在確認 (42ms)
  IT-002: 旧クライアントからの日またぎ勤務登録
    ✓ 日またぎ勤務でlinked_dateが前日になる (56ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        2.345 s
```

**ステータス記号**:
- `✓` - PASS（成功）
- `✕` - FAIL（失敗）
- `○` - SKIP（スキップ）
- `⊗` - Expected FAIL（失敗が期待される）

### 2. Expected FAILの確認

既知のバグによる失敗は `test.failing()` でマークされています:

```
 PASS  tests/integration/geolocation.integration.test.js
  IT-003: グループ別位置情報取得（Expected FAIL）
    ⊗ IT-003-01: groupIdで位置情報を取得できる (BUG-001のためExpected FAIL) (150ms)
      → ReferenceError: sectionId is not defined ← 期待通りの失敗
    ✓ IT-003-02: 【参考】BUG-001修正後の期待動作を記録 (5ms)
```

**Expected FAIL一覧**:

| IT番号 | テストケース | 失敗理由 | バグ番号 |
|:------|:-----------|:---------|:---------|
| IT-003-01 | groupIdで位置情報取得 | `sectionId`未定義 | BUG-001 |
| IT-007-01 | パスワード変更正常系 | stderr判定逆転 | Bug #1-4 |
| IT-008-01 | 旧パスワード不一致エラー | stderr判定逆転 | Bug #1-4 |

### 3. Skip理由の確認

テストがスキップされた場合、理由がコンソールに表示されます:

```
  IT-010: Java連携認証テスト
    ○ IT-010-02: 正しいID/パスワードで認証が成功する
      ⚠️  テストユーザーが存在しないため、テストをスキップします
      test-data-setup.sqlでユーザーデータを登録してください
```

### 4. テスト実行レポート生成

詳細なテスト実行レポートを作成する場合:

```bash
# HTML形式のカバレッジレポート生成
npm test -- --coverage --coverageDirectory=coverage

# レポート確認
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

### 5. テスト実行記録の作成

テスト実行後、記録を作成:

```bash
# テンプレートをコピー
cp ref/TEST_EXECUTION_RECORD_TEMPLATE.md test-results/TEST_EXECUTION_RECORD_$(date +%Y%m%d).md

# エディタで開いて結果を記入
vim test-results/TEST_EXECUTION_RECORD_$(date +%Y%m%d).md
```

---

## トラブルシューティング

### 問題1: PostgreSQL接続エラー

**エラーメッセージ**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**原因**: PostgreSQLが起動していない、または別のポートで動作している

**対処法**:
```bash
# PostgreSQL状態確認
sudo systemctl status postgresql  # Linux
brew services list | grep postgresql  # macOS

# 起動
sudo systemctl start postgresql  # Linux
brew services start postgresql@14  # macOS

# ポート確認
sudo netstat -tlnp | grep 5432
```

### 問題2: 認証エラー

**エラーメッセージ**:
```
FATAL: password authentication failed for user "imhereadmin"
```

**原因**: パスワードが間違っている、またはユーザーが存在しない

**対処法**:
```bash
# postgresユーザーとしてログイン
sudo -u postgres psql

# パスワード再設定
ALTER USER imhereadmin WITH PASSWORD 'admin555';

# pg_hba.confの設定確認
sudo vim /etc/postgresql/14/main/pg_hba.conf
# 以下の行があることを確認:
# local   all   all   md5
# host    all   all   127.0.0.1/32   md5

# PostgreSQL再起動
sudo systemctl restart postgresql
```

### 問題3: テーブルが存在しない

**エラーメッセージ**:
```
error: relation "iw_usertbl" does not exist
```

**原因**: スキーマが作成されていない

**対処法**:
```bash
# スキーマファイルを適用
psql -h localhost -U imhereadmin -d imhere -f schema/create_tables.sql

# テーブル一覧確認
psql -h localhost -U imhereadmin -d imhere -c "\dt"
```

### 問題4: Java EncDecエラー

**エラーメッセージ**:
```
Error: Could not find or load main class EncDec
```

**原因**: EncDec.classが見つからない

**対処法**:
```bash
# EncDec.classの存在確認
ls -l util/EncDec.class

# 存在しない場合、Javaソースからコンパイル
cd util
javac EncDec.java
cd ..

# クラスパス確認
java -classpath util/ EncDec enc test
```

### 問題5: テストデータが不足

**エラーメッセージ**:
```
⚠️  テストユーザー user001 が存在しないため、テストをスキップします
```

**原因**: テストデータが投入されていない

**対処法**:
```bash
# テストデータ投入
psql -h localhost -U imhereadmin -d imhere -f ref/test-data-setup.sql

# データ確認
psql -h localhost -U imhereadmin -d imhere -c "SELECT * FROM iw_usertbl LIMIT 5;"
```

### 問題6: タイムアウトエラー

**エラーメッセージ**:
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**原因**: Java実行やDB処理に時間がかかっている

**対処法**:

テストファイルでタイムアウトを延長（既に30秒に設定済み）:
```javascript
test('IT-010-02: 認証テスト', async () => {
  // テストコード
}, 30000)  // 30秒
```

### 問題7: Expected FAILがPASSになる

**状況**: BUG-001やBug #1-4が修正された場合

**対処法**:

1. `test.failing()` を `test()` に変更
2. バグ修正を確認
3. `KNOWN_BUGS_EXPECTED_FAILURES.md` を更新

```javascript
// 修正前
test.failing('IT-003-01: groupIdで位置情報を取得できる', async () => {

// 修正後
test('IT-003-01: groupIdで位置情報を取得できる', async () => {
```

---

## テストモジュール一覧

### Phase 0 & Phase 1: 基本機能テスト

| ファイル名 | IT番号 | テスト件数 | 対象機能 | Expected FAIL |
|:----------|:------|----------:|:---------|:-------------|
| telework.integration.test.js | IT-001, IT-002 | 5 | テレワークログ登録 | なし |
| geolocation.integration.test.js | IT-003 | 7 | 位置情報取得 | 1件 (BUG-001) |
| user-info.integration.test.js | IT-007, IT-008 | 9 | パスワード変更 | 2件 (Bug #1-4) |
| db-util.integration.test.js | IT-009 | 9 | DB接続・クエリ | なし |
| login-auth.integration.test.js | IT-010 | 10 | 認証・トークン | なし |

### Phase 2: AWS環境テスト

| ファイル名 | IT番号 | テスト件数 | 対象機能 | Skip条件 |
|:----------|:------|----------:|:---------|:---------|
| aws-ssm.integration.test.js | IT-004～IT-006 | 13 | SSM連携・DB再接続 | localhost環境時 |

### Phase 1追加: 境界値・エラーハンドリング

| ファイル名 | IT番号 | テスト件数 | 対象機能 | 備考 |
|:----------|:------|----------:|:---------|:-----|
| telework-boundary.integration.test.js | IT-011 | 6 | テレワーク境界値 | 時刻境界、日付境界 |
| telework-error.integration.test.js | IT-012 | 7 | テレワークエラー | 重複、欠損、SQLi |
| geolocation-boundary.integration.test.js | IT-013 | 7 | 位置情報境界値 | 緯度経度限界値 |
| user-info-boundary.integration.test.js | IT-014 | 5 | パスワード境界値 | 最小/最大長 |

**合計**: 10ファイル、78テストケース

---

## テスト実行チェックリスト

実行前に以下を確認してください:

- [ ] PostgreSQLが起動している（`psql -h localhost -U imhereadmin -d imhere` で接続確認）
- [ ] データベース `imhere` が存在する
- [ ] 必要なテーブルが作成されている（`\dt` でテーブル一覧確認）
- [ ] テストデータが投入されている（`test-data-setup.sql` 実行済み）
- [ ] `util/EncDec.class` が配置されている
- [ ] Javaが正常に動作する（`java -version` で確認）
- [ ] `ref/.env.test` が存在し、設定が正しい
- [ ] npm依存パッケージがインストールされている（`npm install` 実行済み）

---

## 参考資料

### 関連ドキュメント

- `ref/結合テスト作成Plan.md` - テスト作成計画
- `ref/KNOWN_BUGS_EXPECTED_FAILURES.md` - 既知のバグ一覧
- `ref/テスト実行手順書.md` - 詳細な実行手順
- `ref/テストケース追加提案.md` - Phase 2/3の追加提案
- `ref/E2E_TEST_SCENARIOS.md` - E2Eテスト計画

### テンプレート

- `ref/TEST_EXECUTION_RECORD_TEMPLATE.md` - テスト実行記録テンプレート
- `ref/INTEGRATION_TEST_REPORT_TEMPLATE.md` - テスト報告書テンプレート
- `ref/REMAINING_ISSUES_TEMPLATE.md` - 残課題管理テンプレート

---

**最終更新日**: 2025-11-06
**作成者**: Claude (結合テスト作成プロジェクト)
**バージョン**: 1.0
