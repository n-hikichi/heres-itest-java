# Java EncDec 結合テスト

**作成日**: 2025-11-07
**対象**: `util/EncDec.class` - Java暗号化/復号化ユーティリティ
**テストケース**: IT-J001 ~ IT-J012 (全12ケース)

---

## 📋 概要

このディレクトリには、Java EncDecモジュールの結合テストが含まれています。
単体テストとは異なり、実際のコマンドライン実行やNode.js連携を検証します。

**参考仕様書**:
- [`ref/Java結合テスト実施計画書.md`](../../../ref/Java結合テスト実施計画書.md)
- [`ref/IT-023_Java_EncDec結合テスト実施ガイド.md`](../../../ref/IT-023_Java_EncDec結合テスト実施ガイド.md)

---

## 🗂️ ファイル構成

```
tests/integration/java/
├── README.md                          # このファイル
├── run-all-java-tests.sh              # 全テスト実行スクリプト
├── java-basic.test.sh                 # IT-J001～J009: 基本テスト
├── java-encdec.integration.test.js    # IT-J010: Node.js連携テスト
└── java-performance.test.sh           # IT-J011～J012: パフォーマンステスト
```

---

## ✅ 前提条件

### 1. Java環境

```bash
# Javaバージョン確認
java -version
# 必要: Java 8以上（推奨: Java 11以上）
```

### 2. Node.js環境

```bash
# Node.jsバージョン確認
node --version
# 必要: Node.js v22.14.0以上
```

### 3. EncDec.classの配置

```bash
# EncDec.classの存在確認
ls -l util/EncDec.class

# もし存在しない場合はビルド
cd util
javac EncDec.java
cd ..
```

---

## 🚀 実行方法

### 方法1: 全テスト実行（推奨）

すべてのテストスイート（IT-J001～J012）を順次実行します。

```bash
# プロジェクトルートから実行
bash tests/integration/java/run-all-java-tests.sh
```

**所要時間**: 約5～10分（パフォーマンステスト含む）

### 方法2: 個別テスト実行

#### 基本テスト（IT-J001～J009）

```bash
bash tests/integration/java/java-basic.test.sh
```

**所要時間**: 約1分
**内容**:
- IT-J001: コマンドライン暗号化
- IT-J002: コマンドライン復号化
- IT-J003: 暗号化→復号化 往復テスト
- IT-J004: 特殊文字を含むパスワード
- IT-J005: マルチバイト文字（日本語）
- IT-J006: 長いパスワード（境界値）
- IT-J007: 不正なコマンド引数（異常系）
- IT-J008: 不正な暗号化文字列の復号化
- IT-J009: クラスパス解決

#### Node.js連携テスト（IT-J010）

```bash
# Jestで実行
npx jest tests/integration/java/java-encdec.integration.test.js --verbose
```

**所要時間**: 約1～2分
**内容**:
- IT-J010-01: 通常のパスワード
- IT-J010-02: 特殊文字を含むパスワード
- IT-J010-03: 日本語を含むパスワード
- IT-J010-04: 長いパスワード（128文字）
- IT-J010-05: stderrのハンドリング
- IT-J010-06: コマンド実行エラーのハンドリング
- IT-J010-07: 改行コードの処理
- IT-J010-08: 連続実行の安定性（10回）
- IT-J010-09: 暗号化のランダム性
- IT-J010-10: パフォーマンス測定（100回）

#### パフォーマンステスト（IT-J011～J012）

```bash
bash tests/integration/java/java-performance.test.sh
```

**所要時間**: 約3～5分
**内容**:
- IT-J011: 1000回の暗号化・復号化
- IT-J012: 10並列プロセスでの同時実行（各100回）

---

## 📊 テスト結果の見方

### 成功例

```
==========================================
IT-J001: コマンドライン暗号化（正常系）
==========================================
  ✓ PASS: 暗号化コマンドが正常終了
  ✓ PASS: 暗号化結果が出力された
    暗号化結果: T6NciJS9+3+S0WL8wl/m4g...
  ✓ PASS: 暗号化結果の長さが適切 (24文字)
```

### 失敗例

```
==========================================
IT-J002: コマンドライン復号化（正常系）
==========================================
  ✗ FAIL: 復号化結果が不一致: expected='test123', actual='test12'
```

### サマリー

```
==========================================
テスト結果サマリー
==========================================
総テスト数: 9
成功: 8
失敗: 1

✗ いくつかのテストが失敗しました
```

---

## 🎯 成功基準

### 必須基準（Phase 0完了判定）

| 指標 | 目標値 | 備考 |
|------|--------|------|
| **必須テストケースPASS率** | 100% | IT-J001-003, J009-010 |
| **Critical不具合** | 0件 | - |
| **Node.js連携テスト** | 全パターンPASS | IT-J010 |
| **クラスパス解決** | 全環境で動作 | IT-J009 |

### 推奨基準

| 指標 | 目標値 | 備考 |
|------|--------|------|
| **全テストケースPASS率** | 100% | IT-J001-010 |
| **境界値テスト** | 全パターンPASS | IT-J004-006 |
| **異常系テスト** | 適切なエラーハンドリング | IT-J007-008 |

### オプション基準

| 指標 | 目標値 | 備考 |
|------|--------|------|
| **パフォーマンス** | < 100ms/operation | IT-J011 |
| **同時実行** | 10並列で安定動作 | IT-J012 |

---

## 🐛 トラブルシューティング

### Q1: "Could not find or load main class EncDec"

**原因**: クラスパスが間違っている

**対策**:
```bash
# ファイル存在確認
ls -la util/EncDec.class

# プロジェクトルートから実行
cd /path/to/heres-itest-java
java -classpath util EncDec enc "test"
```

### Q2: 文字化けが発生する

**原因**: 文字エンコーディングの問題

**対策**:
```bash
# UTF-8環境の確認
locale | grep UTF-8

# エンコーディングを明示的に指定
export LANG=ja_JP.UTF-8
java -Dfile.encoding=UTF-8 -classpath util EncDec enc "パスワード"
```

### Q3: Node.jsから呼び出すと失敗する

**原因**: パスの解決やエスケープの問題

**対策**:
```javascript
// パスを正しく解決
const classPath = path.resolve(__dirname, '../../../util');

// 特殊文字をエスケープ
const password = testCase.password.replace(/"/g, '\\"');
```

### Q4: パフォーマンスが悪い

**原因**: JVM起動オーバーヘッド

**対策**:
- 本番環境では事前にJVMをウォームアップ
- または、長時間稼働のJavaプロセスとして起動し、ソケット通信で連携する方式を検討

---

## 📈 CI/CD統合

### GitHub Actions

```yaml
name: Java Integration Tests

on: [push, pull_request]

jobs:
  java-integration-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'temurin'

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install

      - name: Run Java Integration Tests
        run: bash tests/integration/java/run-all-java-tests.sh
```

---

## 📝 テスト実施レポート作成

テスト実施後は、以下のテンプレートを使用してレポートを作成してください。

**テンプレート**: [`ref/INTEGRATION_TEST_REPORT_TEMPLATE.md`](../../../ref/INTEGRATION_TEST_REPORT_TEMPLATE.md)

### レポートに含めるべき情報

1. **実行環境**
   - Java version
   - Node.js version
   - OS情報

2. **実行結果**
   - 各テストスイートの成功/失敗
   - 所要時間
   - パフォーマンス指標

3. **不具合報告**（あれば）
   - 失敗したテストケース
   - エラーメッセージ
   - 再現手順

---

## 🔗 関連ドキュメント

- [Java結合テスト実施計画書](../../../ref/Java結合テスト実施計画書.md) - 詳細な計画と仕様
- [IT-023実施ガイド](../../../ref/IT-023_Java_EncDec結合テスト実施ガイド.md) - 独立テストガイド
- [Phase0準備チェックリスト](../../../ref/Phase0_準備チェックリスト.md) - 環境準備
- [結合テスト実施計画書](../../../ref/結合テスト実施計画書.md) - 全体計画

---

## 📜 更新履歴

| 日付 | 更新者 | 内容 |
|------|--------|------|
| 2025-11-07 | Claude Code | 初版作成 - IT-J001～J012の実装完了 |

---

**次のアクション**:
1. ✅ 全テストを実行
2. ✅ 必須5項目のPASS確認
3. ✅ テスト実施レポートを作成
4. ✅ Node.js側結合テストと統合
