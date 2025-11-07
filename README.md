Here's Integration test for heresme-sv/Java.

== prev. Readme

# heresme-sv
Here's Me Server Application.

# Description
Here's MeのBackEndのサーバーアプリケーションです。

# Prerequisites

## npm/Node.js

実行実績のあるNode.jsのバージョンは以下の通りです。

### npm
- v10.9.2
### Node.js
- v22.14.0

## PostgreSQL
PostgreSQLのインストールとセットアップを行ってください。
実行実績のあるPostgreSQLのバージョンは以下の通りです。
- postgresql-14.12-2-windows-x64

# Configuration

## Database
PostgreSQLに以下のデータベースとユーザーを作成してください。
* 詳細は別資料を参照してください。

# Installation

```bash
npm install
```
古いバージョンのパッケージを使っているため、依存関係の競合が発生することがあります。

インストールの際は、多数の警告が表示されますが、動作可能です。

# How to run

データベースのエンドポイントは`serc/models/db-util.js`で設定します。
environmentTypeを0に設定するとlocalhostのPostgreSQLに接続します。

ローカル実行するためには以下のコマンドを実行してください。

```bash
npm start
```

# Testing

## Unit Tests

単体テストを実行するには以下のコマンドを実行してください。

```bash
# テスト実行
npm test

# カバレッジ付きでテスト実行
npm test -- --coverage

# または Makefile を使用
make test
make test-coverage
```

### テスト結果の期待値

```
Test Suites: 2 failed, 12 passed, 14 total
Tests:       4 failed, 263 passed, 267 total
Coverage:    89.96%
```

### 既知の失敗テスト（許容範囲）

以下の4テストは既知の理由で失敗します：

#### 1. geolocation.test.js - 2テスト失敗（Expected Fail）
- **原因**: Bug-001 - 実装不具合（`sectionId` 未定義）
- **該当**: models/geolocation.js:120
- **詳細**: tests/models/geolocation.test.js:311-317 参照

#### 2. login-auth.test.js - 2テスト失敗（結合テスト移行推奨）
- **原因**: 外部プロセス（Java EncDec）依存によりタイムアウト
- **該当**: models/login-auth.js:84-128
- **詳細**: tests/models/login-auth.test.js:78-88 参照

### スキップされているテスト（バグにより到達不可能）

以下のテストケースは既存実装のバグにより到達不可能なため、`test.skip()` でマークされています：

#### user-info.test.js - 4テストスキップ
- **原因**: stderr/stdout チェックロジックのバグ（逆ロジック）
- **該当コード**:
  - models/user-info.js:502-504 (_checkOldPassword の stderr チェック)
  - models/user-info.js:507-509 (_checkOldPassword の stdout チェック)
  - models/user-info.js:537-539 (_changeToNewPassword の stderr チェック)
  - models/user-info.js:542-544 (_changeToNewPassword の stdout チェック)
- **詳細**: `BUG_REPORT_user-info.md` および `tests/models/user-info.test.js` の冒頭コメント参照
- **TODO**: バグ修正後、skipテストを実装する必要があります

## Integration Tests（結合テスト）

### Java結合テスト（IT-J001～J012）

Java EncDecモジュールの結合テストが利用可能です。

**対象**: `util/EncDec.class` - Java暗号化/復号化ユーティリティ
**テストケース**: 全12ケース
**所要時間**: 約5～10分

#### 実行方法

```bash
# 全Java結合テスト実行
bash tests/integration/java/run-all-java-tests.sh

# 基本テストのみ（IT-J001～J009）
bash tests/integration/java/java-basic.test.sh

# Node.js連携テスト（IT-J010）
npx jest tests/integration/java/java-encdec.integration.test.js --verbose

# パフォーマンステスト（IT-J011～J012）
bash tests/integration/java/java-performance.test.sh
```

**詳細**: [`tests/integration/java/README.md`](tests/integration/java/README.md)
**仕様書**: [`ref/Java結合テスト実施計画書.md`](ref/Java結合テスト実施計画書.md)

### Node.js結合テスト

以下の機能は結合テスト環境での検証を推奨します：

#### 対象モジュール

1. **login-auth.js** - パスワード認証処理
   - Java EncDecによる暗号化/復号化
   - 実DB接続が必要

2. **user-info.js** - S3アップロード処理
   - AWS S3連携
   - ファイルアップロード/削除

#### 結合テスト環境の要件

- Java実行環境（EncDecクラス）
- PostgreSQL 14.12
- AWS S3 アクセス（または LocalStack）
- AWS SSM アクセス（または環境変数）

#### 実行方法

```bash
# 結合テスト実行（将来的に整備予定）
make integration-test

# 全テスト実行（単体 + 結合）
make test-all
```

**注意**: Node.js側結合テストは現在整備中です。

## テストカバレッジ

現在のカバレッジ: **89.96%**

- Statements: 89.96% (789/877)
- Branches: 80.76% (231/286)
- Functions: 91.4% (117/128)
- Lines: 89.93% (786/874)

**目標**:
- 単体テスト: 95%以上（結合テスト移行項目を除く）
- 全体（単体+結合）: 95%以上

詳細は `.serena/memories/known_issues.md` を参照してください。
