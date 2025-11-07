# 結合テスト実施計画書 - 成果物一覧

**作成日**: 2025-11-06
**プロジェクト**: Here's Me Server 結合テスト

> **📌 重要**: テスト用語の定義については [テスト用語定義.md](./テスト用語定義.md) を参照してください。
> - Integration Test = **結合テスト**
> - System Test = **総合テスト**
> - 「結合テスト」という用語は使用しません（混乱を避けるため）

---

## 📦 このアーカイブに含まれるファイル

### 📋 計画書・ドキュメント（5ファイル）

| ファイル名 | 内容 | ページ数 |
|-----------|------|---------|
| **結合テスト実施計画書.md** | メイン実施計画（10営業日、13ケース） | 14章構成 |
| **結合テスト実施計画_サマリー.md** | エグゼクティブサマリー | 簡潔版 |
| **Java結合テスト実施計画書.md** | Java側結合テスト（2時間、12ケース） | 13章構成 |
| **Phase0_準備チェックリスト.md** | Phase 0実施タスク詳細 | チェックリスト形式 |
| **結合テストツール戦略書.md** | Jest/Playwright/JUnit選定理由 | ツール比較 |

---

### 🗄️ データベーススクリプト（2ファイル）

| ファイル名 | 用途 | 実行方法 |
|-----------|------|---------|
| **test-data-setup.sql** | テストデータ投入 | `psql heresme_test < test-data-setup.sql` |
| **test-data-cleanup.sql** | テストデータ削除 | `psql heresme_test < test-data-cleanup.sql` |

---

### 🔧 実行スクリプト（1ファイル）

| ファイル名 | 用途 | 実行方法 |
|-----------|------|---------|
| **run-java-integration-tests.sh** | Java結合テスト自動実行 | `chmod +x run-java-integration-tests.sh && ./run-java-integration-tests.sh` |

---

### 🧪 テストコード（4ファイル）

| ファイル名 | 用途 | テストフレームワーク |
|-----------|------|-------------------|
| **test-java-integration.js** | Node.js-Java連携テスト | Node.js (child_process) |
| **EncDecIntegrationTest.java** | Java結合テスト | JUnit 5 |
| **telework.integration.test.js** | サンプル結合テスト（Node.js） | Jest + Supertest |
| **integration-setup.js** | テスト環境セットアップ | Jest Helper |

---

### ⚙️ 設定ファイル（1ファイル）

| ファイル名 | 用途 |
|-----------|------|
| **jest.integration.config.js** | Jest結合テスト設定 |

---

## 📂 ディレクトリ構成（推奨）

```
project-root/
├── docs/
│   ├── 結合テスト実施計画書.md
│   ├── 結合テスト実施計画_サマリー.md
│   ├── Java結合テスト実施計画書.md
│   ├── Phase0_準備チェックリスト.md
│   └── 結合テストツール戦略書.md
│
├── scripts/
│   ├── test-data-setup.sql
│   ├── test-data-cleanup.sql
│   └── run-java-integration-tests.sh
│
├── tests/
│   ├── integration/
│   │   ├── telework.integration.test.js
│   │   ├── integration-setup.js
│   │   └── java/
│   │       └── test-java-integration.js
│   └── jest.integration.config.js
│
└── src/
    └── test/
        └── java/
            └── com/
                └── micros/
                    └── util/
                        └── EncDecIntegrationTest.java
```

---

## 🚀 クイックスタート

### Step 1: アーカイブを展開

```bash
unzip integration-test-plans-latest.zip -d integration-test-plans
cd integration-test-plans
```

### Step 2: ドキュメントを確認

```bash
# メイン計画書を確認
cat 結合テスト実施計画書.md

# サマリーを確認
cat 結合テスト実施計画_サマリー.md
```

### Step 3: 環境セットアップ

```bash
# テストデータベース作成
createdb heresme_test

# スキーマ適用（別途用意が必要）
psql heresme_test < schema/heresme_schema.sql

# テストデータ投入（パスワード暗号化後に実行）
psql heresme_test < test-data-setup.sql
```

### Step 4: Phase 0実施

```bash
# 1. Javaコンパイル
cd src
mvn clean compile
cp target/classes/com/micros/util/EncDec.class ../util/

# 2. Java結合テスト実行
cd ..
chmod +x run-java-integration-tests.sh
./run-java-integration-tests.sh

# 3. Phase 0完了判定
# ログを確認し、全テストPASSならPhase 1へ進む
```

---

## 📋 実施スケジュール概要

```
Phase 0 (1日): 準備
├─ バグ修正
├─ Java結合テスト
└─ 環境構築

Phase 1 (2日): 開発環境結合テスト (4ケース)
Phase 2 (3日): 検証環境結合テスト (6ケース)
Phase 3 (2日): E2Eシナリオテスト (3シナリオ)
Phase 4 (2日): 回帰テスト・報告書作成

合計: 10営業日
```

---

## 🎯 成功基準

- ✅ テストケースPASS率: 100%
- ✅ Critical/High不具合: 0件
- ✅ レスポンスタイム: < 2秒
- ✅ カバレッジ維持: C0 > 94%, C1 > 87%

---

## 📞 問い合わせ

質問や不明点がある場合は、プロジェクトチームにお問い合わせください。

---

## 📄 ライセンス・著作権

本ドキュメントは Here's Me Server プロジェクト用に作成されました。  
作成者: Claude Code  
作成日: 2025-11-06

---

## 🔄 更新履歴

| 版 | 日付 | 更新内容 |
|----|------|---------|
| 1.0 | 2025-11-06 | 初版作成（全13ファイル） |

---

## 📚 関連リソース

- Node.js: https://nodejs.org/
- Jest: https://jestjs.io/
- JUnit 5: https://junit.org/junit5/
- PostgreSQL: https://www.postgresql.org/
- Playwright: https://playwright.dev/

---

**次のステップ**: Phase 0準備チェックリストを確認してください
