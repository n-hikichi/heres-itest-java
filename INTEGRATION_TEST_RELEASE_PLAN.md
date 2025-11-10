# 結合テストリリースパッケージ作成プラン

**作成日**: 2025-11-10
**対象**: PostgreSQL + Java 結合テスト
**参考**: ref-lc80/ (単体テスト80%達成時のリリースパッケージ)

---

## 📋 概要

結合テスト（PostgreSQL、Java用）のリリースパッケージを作成します。
ref-lc80/ の構成を参考に、以下を含むパッケージを作成します：

1. **heresme-sv-integration-tests.zip** - 結合テストファイル一式
2. **結合テスト実行手順.md** - インストールとテスト実行の手順書

---

## 📦 a. ZIP圧縮するファイル

### 含めるファイル

#### 1. 結合テストファイル (21個)

**Node.js結合テスト (16個)**:
```
tests/integration/api-auth.integration.test.js
tests/integration/aws-ssm.integration.test.js
tests/integration/config.integration.test.js
tests/integration/db-util.integration.test.js
tests/integration/geolocation-boundary.integration.test.js
tests/integration/geolocation.integration.test.js
tests/integration/hm-util.integration.test.js
tests/integration/logger.integration.test.js
tests/integration/login-auth.integration.test.js
tests/integration/middleware.integration.test.js
tests/integration/setup.js
tests/integration/telework-boundary.integration.test.js
tests/integration/telework-error.integration.test.js
tests/integration/telework.integration.test.js
tests/integration/user-info-boundary.integration.test.js
tests/integration/user-info.integration.test.js
```

**Java結合テスト (5個)**:
```
tests/integration/java/java-basic.test.sh
tests/integration/java/java-encdec.integration.test.js
tests/integration/java/java-performance.test.sh
tests/integration/java/run-all-java-tests.sh
tests/integration/java/README.md
```

#### 2. Java関連ファイル (2個)

```
util/EncDec.java
util/EncDec.class
```

#### 3. 設定ファイル (4個)

```
package.json           # 依存パッケージ定義
jest.config.js         # Jest設定
Makefile              # テスト実行コマンド
.env.example          # 環境変数のサンプル（作成が必要）
```

#### 4. ドキュメント (4個)

```
tests/integration/java/KNOWN_BUGS.md
tests/integration/java/TEST_EXECUTION_REPORT.md
README.md             # プロジェクト全体のREADME（結合テスト部分のみ抜粋）
INTEGRATION_TEST_GUIDE.md  # 結合テスト実行ガイド（新規作成）
```

#### 5. サポートディレクトリ (必要最小限)

```
bin/                  # 必要に応じて
```

### 除外するファイル

以下はGitHubリポジトリからcloneするため、zipに**含めない**：

```
❌ models/          # ソースコード（git cloneで取得）
❌ routes/          # ソースコード（git cloneで取得）
❌ config/          # ソースコード（git cloneで取得）
❌ views/           # ソースコード（git cloneで取得）
❌ public/          # ソースコード（git cloneで取得）
❌ app.js           # ソースコード（git cloneで取得）
❌ util/*.js        # JavaScriptファイル（git cloneで取得）
❌ tests/models/    # 単体テスト（git cloneで取得）
❌ tests/util/      # 単体テスト（git cloneで取得）
❌ tests/config/    # 単体テスト（git cloneで取得）
❌ node_modules/    # npm installで生成
❌ .git/            # Gitリポジトリ
❌ coverage/        # テスト実行結果
```

---

## 📝 b. 実行手順書の構成

### ファイル名
**結合テスト実行手順.md**

### 内容構成

#### 1. 前提条件
- Git
- Node.js v22.14.0以上
- Java 8以上（推奨: Java 11以上）
- PostgreSQL 14.12
- npm
- unzipコマンド

#### 2. 手順1: リポジトリのクローン
```bash
git clone https://github.com/MicrosSoftwareInc/heresme-cli
cd heresme-cli
```

#### 3. 手順2: zipアーカイブの展開
```bash
# zipファイルをリポジトリルートにコピー
cp /path/to/heresme-sv-integration-tests.zip .

# zipファイルを展開
unzip -o heresme-sv-integration-tests.zip

# 展開されたファイルを確認
ls -la tests/integration/
```

#### 4. 手順3: 依存パッケージのインストール
```bash
npm install
# または
make install
```

#### 5. 手順4: PostgreSQL環境設定
- データベース作成
- ユーザー作成
- 接続情報設定（.env ファイル）

#### 6. 手順5: Java環境確認
```bash
java -version
java -classpath util EncDec enc "test"
```

#### 7. 手順6: 結合テスト実行

**Java結合テスト**:
```bash
# 全Java結合テスト
bash tests/integration/java/run-all-java-tests.sh

# 基本テストのみ
bash tests/integration/java/java-basic.test.sh
```

**Node.js結合テスト**:
```bash
# 全Node.js結合テスト
npm run test:integration

# 個別テスト
npx jest tests/integration/db-util.integration.test.js --verbose
```

#### 8. テスト結果の確認
- 期待される結果
- 既知の不具合（KNOWN_BUGS.md参照）

---

## 🔧 実装手順

### ステップ1: .env.exampleファイルの作成

環境変数のサンプルファイルを作成：

```bash
# .env.example
# PostgreSQL設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=heresme_test
DB_USER=postgres
DB_PASSWORD=

# AWS設定（オプション）
AWS_REGION=ap-northeast-1
AWS_SSM_ENABLED=false

# Java設定
JAVA_CLASSPATH=util
```

### ステップ2: INTEGRATION_TEST_GUIDE.md の作成

結合テスト実行ガイドを作成：
- 結合テストの概要
- 対象モジュール
- 実行方法
- トラブルシューティング

### ステップ3: zipアーカイブ作成スクリプトの作成

**create-integration-test-package.sh**:

```bash
#!/bin/bash
# 結合テストパッケージ作成スクリプト

ZIP_NAME="heresme-sv-integration-tests.zip"
TEMP_DIR="temp_package"

# 一時ディレクトリ作成
mkdir -p $TEMP_DIR

# 結合テストファイルをコピー
cp -r tests/integration $TEMP_DIR/tests/

# Java関連ファイルをコピー
mkdir -p $TEMP_DIR/util
cp util/EncDec.java $TEMP_DIR/util/
cp util/EncDec.class $TEMP_DIR/util/

# 設定ファイルをコピー
cp package.json $TEMP_DIR/
cp jest.config.js $TEMP_DIR/
cp Makefile $TEMP_DIR/
cp .env.example $TEMP_DIR/

# ドキュメントをコピー
cp INTEGRATION_TEST_GUIDE.md $TEMP_DIR/

# zip作成
cd $TEMP_DIR
zip -r ../$ZIP_NAME .
cd ..

# クリーンアップ
rm -rf $TEMP_DIR

echo "Created: $ZIP_NAME"
```

### ステップ4: 結合テスト実行手順.md の作成

ref-lc80/単体テスト実行手順.md を参考に、結合テスト用の手順書を作成。

---

## 📊 成果物リスト

作成する成果物：

1. ✅ **heresme-sv-integration-tests.zip** - 結合テストファイル一式
2. ✅ **結合テスト実行手順.md** - インストールとテスト実行の手順書
3. ✅ **.env.example** - 環境変数サンプル
4. ✅ **INTEGRATION_TEST_GUIDE.md** - 結合テスト実行ガイド
5. ✅ **create-integration-test-package.sh** - zip作成スクリプト

これらを格納するディレクトリ：
```
ref-integration/
├── heresme-sv-integration-tests.zip
└── 結合テスト実行手順.md
```

---

## 🎯 実行順序

1. `.env.example` の作成
2. `INTEGRATION_TEST_GUIDE.md` の作成
3. `create-integration-test-package.sh` の作成と実行
4. `結合テスト実行手順.md` の作成
5. `ref-integration/` ディレクトリに格納
6. 動作確認（別環境でzipを展開してテスト実行）

---

## 📝 注意事項

### ソースコードの取得

- ソースコードは **https://github.com/MicrosSoftwareInc/heresme-cli** からclone
- zipにはテストファイルと設定ファイルのみ含める
- これにより、zipサイズを小さく保ち、常に最新のソースコードを使用可能

### PostgreSQL環境

- ローカルPostgreSQLまたはDocker PostgreSQLが必要
- データベース作成とユーザー設定が必要
- 手順書に詳細な設定手順を記載

### Java環境

- Java 8以上が必要
- EncDec.classの動作確認が必要
- 既知の不具合（UTF-8エンコーディング）について明記

---

## 🔗 参考

- **ref-lc80/heresme-sv-tests.zip** - 単体テスト用zipパッケージ
- **ref-lc80/単体テスト実行手順.md** - 単体テスト実行手順
- **tests/integration/java/README.md** - Java結合テスト実行ガイド
- **tests/integration/java/KNOWN_BUGS.md** - 既知の不具合

---

**次のアクション**: このプランに基づいて成果物を作成しますか？
