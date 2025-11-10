# Here's Me Server - 結合テスト実行ガイド

**作成日**: 2025-11-10
**対象**: PostgreSQL + Java 結合テスト
**バージョン**: 1.0

---

## 📋 目次

1. [概要](#概要)
2. [結合テストの対象](#結合テストの対象)
3. [前提条件](#前提条件)
4. [実行方法](#実行方法)
5. [トラブルシューティング](#トラブルシューティング)
6. [既知の不具合](#既知の不具合)

---

## 概要

この結合テストパッケージは、Here's Me Serverアプリケーションの以下のコンポーネントを検証します：

- **PostgreSQLデータベース連携** - 実際のDBを使用した動作確認
- **Java EncDec暗号化/復号化** - パスワード暗号化モジュールの検証
- **外部サービス連携** - AWS SSM、S3などの統合テスト

---

## 結合テストの対象

### Node.js結合テスト（16ファイル）

| カテゴリ | テストファイル | 対象機能 |
|---------|---------------|---------|
| **データベース** | db-util.integration.test.js | PostgreSQL接続、クエリ実行 |
| **認証** | api-auth.integration.test.js | API認証 |
| **認証** | login-auth.integration.test.js | ログイン認証、Java EncDec連携 |
| **ユーザー情報** | user-info.integration.test.js | ユーザー情報管理 |
| **ユーザー情報** | user-info-boundary.integration.test.js | 境界値テスト |
| **勤務管理** | telework.integration.test.js | 勤務ログ管理 |
| **勤務管理** | telework-boundary.integration.test.js | 境界値テスト |
| **勤務管理** | telework-error.integration.test.js | エラーハンドリング |
| **位置情報** | geolocation.integration.test.js | 位置情報管理 |
| **位置情報** | geolocation-boundary.integration.test.js | 境界値テスト |
| **AWS** | aws-ssm.integration.test.js | AWS SSM連携 |
| **設定** | config.integration.test.js | 設定管理 |
| **ユーティリティ** | hm-util.integration.test.js | ユーティリティ関数 |
| **ロガー** | logger.integration.test.js | ログ出力 |
| **ミドルウェア** | middleware.integration.test.js | ミドルウェア |
| **セットアップ** | setup.js | テスト環境初期化 |

### Java結合テスト（12ケース）

| テストID | テスト内容 | カテゴリ |
|---------|-----------|---------|
| IT-J001 | コマンドライン暗号化 | 基本動作 |
| IT-J002 | コマンドライン復号化 | 基本動作 |
| IT-J003 | 暗号化→復号化 往復テスト | 基本動作 |
| IT-J004 | 特殊文字を含むパスワード | 境界値 |
| IT-J005 | マルチバイト文字（日本語） | 境界値 |
| IT-J006 | 長いパスワード（境界値） | 境界値 |
| IT-J007 | 不正なコマンド引数 | 異常系 |
| IT-J008 | 不正な暗号化文字列の復号化 | 異常系 |
| IT-J009 | クラスパス解決 | 環境依存 |
| IT-J010 | Node.js連携テスト | 統合 |
| IT-J011 | パフォーマンステスト（1000回） | 性能 |
| IT-J012 | 同時実行テスト | 性能 |

**詳細**: [tests/integration/java/README.md](tests/integration/java/README.md)

---

## 前提条件

### 必須環境

| 項目 | バージョン | 確認コマンド |
|------|-----------|------------|
| **Git** | 任意 | `git --version` |
| **Node.js** | v22.14.0以上 | `node --version` |
| **npm** | v10.9.2以上 | `npm --version` |
| **Java** | 8以上（推奨: 11以上） | `java -version` |
| **PostgreSQL** | 14.12 | `psql --version` |

### 推奨環境

- OS: Linux, macOS, Windows (WSL2)
- メモリ: 4GB以上
- ディスク空き容量: 1GB以上

---

## 実行方法

### 基本的な実行フロー

```
1. リポジトリクローン
   ↓
2. テストパッケージ展開
   ↓
3. 依存パッケージインストール
   ↓
4. PostgreSQL環境設定
   ↓
5. Java環境確認
   ↓
6. 結合テスト実行
```

詳細な手順は、**結合テスト実行手順.md** を参照してください。

### クイックスタート

```bash
# 1. リポジトリクローン
git clone https://github.com/MicrosSoftwareInc/heresme-cli
cd heresme-cli

# 2. テストパッケージ展開
unzip -o heresme-sv-integration-tests.zip

# 3. 依存パッケージインストール
npm install

# 4. 環境設定
cp .env.example .env
# .envファイルを編集してDB接続情報を設定

# 5. Java結合テスト実行
bash tests/integration/java/run-all-java-tests.sh

# 6. Node.js結合テスト実行（PostgreSQL必須）
npm run test:integration
```

---

## トラブルシューティング

### Q1: PostgreSQL接続エラー

**症状**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**対策**:
1. PostgreSQLが起動しているか確認
   ```bash
   # Linux/Mac
   sudo systemctl status postgresql

   # または
   pg_isready
   ```

2. .envファイルの接続情報を確認
   ```bash
   cat .env
   # DB_HOST, DB_PORT, DB_USER, DB_PASSWORD を確認
   ```

3. データベースが存在するか確認
   ```bash
   psql -U postgres -c "\l" | grep heresme_test
   ```

### Q2: Java EncDec実行エラー

**症状**:
```
Could not find or load main class EncDec
```

**対策**:
1. EncDec.classが存在するか確認
   ```bash
   ls -la util/EncDec.class
   ```

2. Javaバージョン確認
   ```bash
   java -version
   # Java 8以上が必要
   ```

3. クラスパスを明示的に指定
   ```bash
   java -classpath util EncDec enc "test"
   ```

### Q3: npm installでエラー

**症状**:
```
npm ERR! peer dependencies
```

**対策**:
```bash
# 警告を無視してインストール
npm install --legacy-peer-deps

# または、package-lock.jsonを削除してから再インストール
rm package-lock.json
npm install
```

### Q4: 日本語パスワードのテスト失敗

**症状**:
```
IT-J005: マルチバイト文字（日本語）- 失敗
```

**対策**:
これは既知の不具合です。EncDec.javaでUTF-8エンコーディングが明示されていないため、
日本語などのマルチバイト文字が文字化けします。

詳細: [tests/integration/java/KNOWN_BUGS.md](tests/integration/java/KNOWN_BUGS.md)

---

## 既知の不具合

### 1. 日本語・マルチバイト文字の文字化け（高優先度）

**影響**: IT-J005, IT-J010-03

**原因**: EncDec.javaで文字エンコーディング未指定

**回避策**: ASCII文字のみのパスワードを使用

**詳細**: [KNOWN_BUGS.md - 問題1](tests/integration/java/KNOWN_BUGS.md#問題1-日本語マルチバイト文字の文字化け)

### 2. 不正なコマンド引数に対する終了コード（中優先度）

**影響**: IT-J007, IT-J010-05

**原因**: エラー時にexit code 0を返す

**詳細**: [KNOWN_BUGS.md - 問題2](tests/integration/java/KNOWN_BUGS.md#問題2-不正なコマンド引数に対する終了コード)

### 3. パフォーマンス目標未達成（低優先度）

**影響**: IT-J010-10

**原因**: JVM起動オーバーヘッド（平均405.91ms vs 目標100ms）

**詳細**: [KNOWN_BUGS.md - 問題3](tests/integration/java/KNOWN_BUGS.md#問題3-パフォーマンス目標未達成)

---

## テスト結果の確認

### 期待される結果

**Java結合テスト（IT-J001～J009）**:
- 成功: 27/32テスト（84.4%）
- 失敗: 5/32テスト（主に日本語関連）

**Node.js結合テスト（IT-J010）**:
- 成功: 7/10テスト（70.0%）
- 失敗: 3/10テスト（日本語、エラーハンドリング、パフォーマンス）

詳細: [TEST_EXECUTION_REPORT.md](tests/integration/java/TEST_EXECUTION_REPORT.md)

---

## 参考ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [tests/integration/java/README.md](tests/integration/java/README.md) | Java結合テスト詳細 |
| [tests/integration/java/KNOWN_BUGS.md](tests/integration/java/KNOWN_BUGS.md) | 既知の不具合一覧 |
| [tests/integration/java/TEST_EXECUTION_REPORT.md](tests/integration/java/TEST_EXECUTION_REPORT.md) | テスト実行レポート |
| [ref/Java結合テスト実施計画書.md](ref/Java結合テスト実施計画書.md) | Java結合テスト仕様 |
| [ref/IT-023_Java_EncDec結合テスト実施ガイド.md](ref/IT-023_Java_EncDec結合テスト実施ガイド.md) | IT-023実施ガイド |

---

## サポート

問題が解決しない場合は、以下の情報を添えてお問い合わせください：

1. 実行環境（OS、Node.jsバージョン、Javaバージョン、PostgreSQLバージョン）
2. エラーメッセージの全文
3. 実行したコマンド
4. .envファイルの設定内容（パスワードは除く）

---

**更新日**: 2025-11-10
**バージョン**: 1.0
