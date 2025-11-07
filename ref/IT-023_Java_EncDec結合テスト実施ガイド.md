# IT-023: Java EncDec独立結合テスト 実施ガイド

**作成日**: 2025-11-06
**対象セッション**: 次回セッション（別セッション実施予定）
**ステータス**: 準備完了 / 未実装

> **📌 用語について**: このドキュメントでは Integration Test を「**結合テスト**」と呼びます。詳細は [テスト用語定義.md](./テスト用語定義.md) を参照してください。

---

## 概要

IT-023は、PostgreSQL不要で実行可能なJava EncDec暗号化/復号化の独立結合テストです。
既存のテスト（IT-010等）にもJava連携は含まれていますが、EncDecの動作を独立してテストすることで、
パスワード暗号化機能の信頼性を高めます。

**目的**:
- Java EncDec.classの暗号化/復号化機能を独立して検証
- 各種エッジケース（長文、特殊文字、Unicode等）の動作確認
- パフォーマンステスト（100回の暗号化/復号化）

**実行環境**:
- PostgreSQL: 不要
- Java: 必須（Java 8以上）
- util/EncDec.class: 必須

---

## テストケース一覧（10件）

| IT番号 | テストケース | 観点 | 期待結果 |
|:------|:-----------|:-----|:---------|
| IT-023-01 | 短いパスワードの暗号化・復号化 | 基本動作 | 元のパスワードに復号化される |
| IT-023-02 | 長いパスワード（100文字）の暗号化・復号化 | 長文 | 元のパスワードに復号化される |
| IT-023-03 | 特殊文字を含むパスワード | 特殊文字 | 元のパスワードに復号化される |
| IT-023-04 | 日本語を含むパスワード | Unicode | 元のパスワードに復号化される |
| IT-023-05 | 空白を含むパスワード | 空白文字 | 元のパスワードに復号化される |
| IT-023-06 | 同じパスワードでも暗号化結果が異なる | ランダム性 | 暗号化結果が毎回異なる |
| IT-023-07 | 暗号化したパスワードを復号化して元に戻る | 可逆性 | 完全に元のパスワードに戻る |
| IT-023-08 | Javaコマンド失敗時のエラーハンドリング | 異常系 | 適切なエラーが返る |
| IT-023-09 | 不正なクラスパスでのエラー処理 | 環境エラー | エラーハンドリングが動作 |
| IT-023-10 | パフォーマンス: 100回の暗号化・復号化 | 性能 | 10秒以内に完了 |

---

## 前提条件

### 1. Java環境

```bash
# Javaバージョン確認
java -version

# 期待される出力例:
# openjdk version "11.0.x" (or higher)
# Java(TM) SE Runtime Environment
```

**要件**: Java 8以上

### 2. EncDec.classの配置

```bash
# EncDec.classの存在確認
ls -l util/EncDec.class

# 期待される出力:
# -rw-r--r-- 1 user user XXXX Nov  6 XX:XX util/EncDec.class
```

**配置場所**: `util/EncDec.class`

### 3. Node.js環境

```bash
# Node.jsバージョン確認
node --version

# npmパッケージ確認
npm list --depth=0 | grep jest
```

---

## テストファイルテンプレート

### ファイル名

```
ref/java-encdec.integration.test.js
tests/integration/java-encdec.integration.test.js
```

### テストコード全文

```javascript
/**
 * IT-023: Java EncDec独立結合テスト
 *
 * 目的: util/EncDec.classの暗号化/復号化機能の独立結合テスト
 *
 * 前提条件:
 * - PostgreSQL不要
 * - Java実行環境が必要
 * - util/EncDec.class が配置されている
 *
 * カテゴリ: PostgreSQL不要結合テスト（Phase B）
 */

const util = require('util')
const exec = util.promisify(require('child_process').exec)
const path = require('path')

describe('IT-023: Java EncDec独立結合テスト', () => {
  const classPath = path.resolve(__dirname + '/../../util')

  //
  // IT-023-01: 短いパスワードの暗号化・復号化
  //
  test('IT-023-01: 短いパスワードの暗号化・復号化', async () => {
    // Given: 短いパスワード
    const password = 'test123'

    // When: 暗号化
    const encCmd = `java -classpath ${classPath} EncDec enc ${password}`
    const encResult = await exec(encCmd)
    const encrypted = encResult.stdout.trim()

    // Then: 暗号化成功
    expect(encrypted).toBeDefined()
    expect(encrypted).not.toBe('')
    expect(encrypted).not.toBe(password)

    // When: 復号化
    const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
    const decResult = await exec(decCmd)
    const decrypted = decResult.stdout.replace(/\r?\n/g, '')

    // Then: 元のパスワードに戻る
    expect(decrypted).toBe(password)
  })

  //
  // IT-023-02: 長いパスワード（100文字）の暗号化・復号化
  //
  test('IT-023-02: 長いパスワード（100文字）の暗号化・復号化', async () => {
    // Given: 100文字のパスワード
    const password = 'a'.repeat(100)

    // When: 暗号化・復号化
    const encCmd = `java -classpath ${classPath} EncDec enc ${password}`
    const encResult = await exec(encCmd)
    const encrypted = encResult.stdout.trim()

    const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
    const decResult = await exec(decCmd)
    const decrypted = decResult.stdout.replace(/\r?\n/g, '')

    // Then: 元のパスワードに戻る
    expect(decrypted).toBe(password)
  })

  //
  // IT-023-03: 特殊文字を含むパスワード
  //
  test('IT-023-03: 特殊文字を含むパスワード', async () => {
    // Given: 特殊文字を含むパスワード
    const password = 'P@ssw0rd!#$%^&*()'

    // When: 暗号化・復号化
    const encCmd = `java -classpath ${classPath} EncDec enc "${password}"`
    const encResult = await exec(encCmd)
    const encrypted = encResult.stdout.trim()

    const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
    const decResult = await exec(decCmd)
    const decrypted = decResult.stdout.replace(/\r?\n/g, '')

    // Then: 元のパスワードに戻る
    expect(decrypted).toBe(password)
  })

  //
  // IT-023-04: 日本語を含むパスワード
  //
  test('IT-023-04: 日本語を含むパスワード', async () => {
    // Given: 日本語を含むパスワード
    const password = 'パスワード123'

    // When: 暗号化・復号化
    const encCmd = `java -classpath ${classPath} EncDec enc "${password}"`
    const encResult = await exec(encCmd)
    const encrypted = encResult.stdout.trim()

    const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
    const decResult = await exec(decCmd)
    const decrypted = decResult.stdout.replace(/\r?\n/g, '')

    // Then: 元のパスワードに戻る
    expect(decrypted).toBe(password)
  })

  //
  // IT-023-05: 空白を含むパスワード
  //
  test('IT-023-05: 空白を含むパスワード', async () => {
    // Given: 空白を含むパスワード
    const password = 'my secret password'

    // When: 暗号化・復号化
    const encCmd = `java -classpath ${classPath} EncDec enc "${password}"`
    const encResult = await exec(encCmd)
    const encrypted = encResult.stdout.trim()

    const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
    const decResult = await exec(decCmd)
    const decrypted = decResult.stdout.replace(/\r?\n/g, '')

    // Then: 元のパスワードに戻る
    expect(decrypted).toBe(password)
  })

  //
  // IT-023-06: 同じパスワードでも暗号化結果が異なる
  //
  test('IT-023-06: 同じパスワードでも暗号化結果が異なる', async () => {
    // Given: 同じパスワード
    const password = 'test123'

    // When: 1回目の暗号化
    const encCmd1 = `java -classpath ${classPath} EncDec enc ${password}`
    const encResult1 = await exec(encCmd1)
    const encrypted1 = encResult1.stdout.trim()

    // When: 2回目の暗号化
    const encCmd2 = `java -classpath ${classPath} EncDec enc ${password}`
    const encResult2 = await exec(encCmd2)
    const encrypted2 = encResult2.stdout.trim()

    // Then: 暗号化結果は異なる（ソルト使用のため）
    expect(encrypted1).not.toBe(encrypted2)

    // Then: 両方とも正しく復号化できる
    const decCmd1 = `java -classpath ${classPath} EncDec dec ${encrypted1}`
    const decResult1 = await exec(decCmd1)
    expect(decResult1.stdout.replace(/\r?\n/g, '')).toBe(password)

    const decCmd2 = `java -classpath ${classPath} EncDec dec ${encrypted2}`
    const decResult2 = await exec(decCmd2)
    expect(decResult2.stdout.replace(/\r?\n/g, '')).toBe(password)
  })

  //
  // IT-023-07: 暗号化したパスワードを復号化して元に戻る（可逆性）
  //
  test('IT-023-07: 暗号化したパスワードを復号化して元に戻る（可逆性）', async () => {
    // Given: 複数のテストパスワード
    const passwords = [
      'simple',
      'UPPERCASE',
      '1234567890',
      'MixedCase123',
      'with-hyphen',
      'with_underscore'
    ]

    // When: 各パスワードを暗号化・復号化
    for (const password of passwords) {
      const encCmd = `java -classpath ${classPath} EncDec enc ${password}`
      const encResult = await exec(encCmd)
      const encrypted = encResult.stdout.trim()

      const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
      const decResult = await exec(decCmd)
      const decrypted = decResult.stdout.replace(/\r?\n/g, '')

      // Then: すべて元のパスワードに戻る
      expect(decrypted).toBe(password)
    }
  })

  //
  // IT-023-08: Javaコマンド失敗時のエラーハンドリング
  //
  test('IT-023-08: Javaコマンド失敗時のエラーハンドリング', async () => {
    // Given: 不正な引数（encでもdecでもない）
    const invalidCmd = `java -classpath ${classPath} EncDec invalid test123`

    // When: Javaコマンド実行
    try {
      await exec(invalidCmd)
      // Then: エラーが期待されるため、ここに到達したら失敗
      expect(true).toBe(false)
    } catch (error) {
      // Then: エラーがキャッチされる
      expect(error).toBeDefined()
      console.log('✅ 不正な引数でエラーが発生しました')
    }
  })

  //
  // IT-023-09: 不正なクラスパスでのエラー処理
  //
  test('IT-023-09: 不正なクラスパスでのエラー処理', async () => {
    // Given: 不正なクラスパス
    const invalidClassPath = '/invalid/path/to/java/classes'
    const invalidCmd = `java -classpath ${invalidClassPath} EncDec enc test123`

    // When: Javaコマンド実行
    try {
      await exec(invalidCmd)
      // Then: エラーが期待されるため、ここに到達したら失敗
      expect(true).toBe(false)
    } catch (error) {
      // Then: エラーがキャッチされる
      expect(error).toBeDefined()
      console.log('✅ 不正なクラスパスでエラーが発生しました')
    }
  })

  //
  // IT-023-10: パフォーマンス: 100回の暗号化・復号化
  //
  test('IT-023-10: パフォーマンス: 100回の暗号化・復号化', async () => {
    const startTime = Date.now()

    // Given: 100回の暗号化・復号化
    for (let i = 0; i < 100; i++) {
      const password = `perf_test_${i}`

      // When: 暗号化
      const encCmd = `java -classpath ${classPath} EncDec enc ${password}`
      const encResult = await exec(encCmd)
      const encrypted = encResult.stdout.trim()

      // When: 復号化
      const decCmd = `java -classpath ${classPath} EncDec dec ${encrypted}`
      const decResult = await exec(decCmd)
      const decrypted = decResult.stdout.replace(/\r?\n/g, '')

      // Then: 正しく復号化される
      expect(decrypted).toBe(password)
    }

    const endTime = Date.now()
    const elapsedMs = endTime - startTime

    console.log(`✅ 100回の暗号化・復号化: ${elapsedMs}ms`)
    expect(elapsedMs).toBeLessThan(10000) // 10秒以内
  }, 15000) // タイムアウト15秒
})
```

---

## 実施手順

### Step 1: 環境確認

```bash
# 1. Javaバージョン確認
java -version

# 2. EncDec.classの存在確認
ls -l util/EncDec.class

# 3. 手動でEncDec動作確認
java -classpath util/ EncDec enc test123
# → 暗号化された文字列が出力される

# 4. 復号化確認
java -classpath util/ EncDec dec <上記の暗号化文字列>
# → "test123"が出力される
```

### Step 2: テストファイル作成

```bash
# 1. テストファイル作成
touch ref/java-encdec.integration.test.js

# 2. 上記のテストコードをコピー＆ペースト

# 3. tests/integration/にもコピー
cp ref/java-encdec.integration.test.js tests/integration/
```

### Step 3: テスト実行

```bash
# 個別実行
npm test -- tests/integration/java-encdec.integration.test.js

# 実行時間目安: 10-20秒（パフォーマンステスト含む）
```

### Step 4: 結果確認

期待される出力:
```
PASS tests/integration/java-encdec.integration.test.js
  IT-023: Java EncDec独立結合テスト
    ✓ IT-023-01: 短いパスワードの暗号化・復号化 (XXX ms)
    ✓ IT-023-02: 長いパスワード（100文字）の暗号化・復号化 (XXX ms)
    ✓ IT-023-03: 特殊文字を含むパスワード (XXX ms)
    ✓ IT-023-04: 日本語を含むパスワード (XXX ms)
    ✓ IT-023-05: 空白を含むパスワード (XXX ms)
    ✓ IT-023-06: 同じパスワードでも暗号化結果が異なる (XXX ms)
    ✓ IT-023-07: 暗号化したパスワードを復号化して元に戻る (XXX ms)
    ✓ IT-023-08: Javaコマンド失敗時のエラーハンドリング (XXX ms)
    ✓ IT-023-09: 不正なクラスパスでのエラー処理 (XXX ms)
    ✓ IT-023-10: パフォーマンス: 100回の暗号化・復号化 (XXXX ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

### Step 5: コミット・プッシュ

```bash
# 1. ファイル追加
git add ref/java-encdec.integration.test.js tests/integration/java-encdec.integration.test.js

# 2. コミット
git commit --no-gpg-sign -m "IT-023: Java EncDec独立結合テスト実装 (10 cases)"

# 3. プッシュ
git push -u origin <branch-name>
```

---

## トラブルシューティング

### 問題1: EncDec.classが見つからない

**エラー**:
```
Error: Could not find or load main class EncDec
```

**対処法**:
```bash
# EncDec.classの存在確認
ls -l util/EncDec.class

# 存在しない場合、Javaソースからコンパイル
cd util
javac EncDec.java
cd ..
```

### 問題2: Javaがインストールされていない

**エラー**:
```
java: command not found
```

**対処法**:
```bash
# Ubuntu/Debian
sudo apt install openjdk-11-jdk

# macOS
brew install openjdk@11

# バージョン確認
java -version
```

### 問題3: 特殊文字が正しく処理されない

**症状**: IT-023-03、IT-023-04が失敗

**対処法**:
- コマンドライン引数をダブルクォートで囲む
- シェルのエスケープ処理を確認
- UTF-8エンコーディングを確認

```javascript
// ✅ 正しい
const encCmd = `java -classpath ${classPath} EncDec enc "${password}"`

// ❌ 間違い（特殊文字が解釈される）
const encCmd = `java -classpath ${classPath} EncDec enc ${password}`
```

### 問題4: パフォーマンステストがタイムアウト

**エラー**:
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**対処法**:
- テストのタイムアウトを延長（15秒に設定済み）
- Java起動オーバーヘッドを考慮
- 必要に応じて回数を減らす（100回 → 50回）

### 問題5: 暗号化結果が常に同じ（IT-023-06失敗）

**症状**: 同じパスワードで同じ暗号化結果になる

**原因**: EncDec.javaがソルトを使用していない

**対処法**:
- EncDec.javaの実装を確認
- 仕様として受け入れる場合はテストを修正

---

## 期待される結果サマリ

| 項目 | 期待値 |
|:-----|:------|
| テスト件数 | 10件 |
| 合格数 | 10/10 (100%) |
| 実行時間 | 10-20秒 |
| Expected FAIL | 0件 |
| Skip | 0件 |

---

## カバレッジへの貢献

| カテゴリ | 実装前 | 実装後 | 向上率 |
|:---------|-------:|-------:|-------:|
| PostgreSQL依存 | 78 | 78 | - |
| PostgreSQL不要 | 27 | 37 | +37% |
| **合計** | **105** | **115** | **+10%** |

---

## チェックリスト

実施前に以下を確認してください:

- [ ] Java 8以上がインストールされている
- [ ] `util/EncDec.class`が存在する
- [ ] EncDecコマンドが手動で動作する（enc/dec両方）
- [ ] npm依存パッケージがインストールされている
- [ ] Jestが正常に動作する
- [ ] テストファイルを作成した（ref/ と tests/integration/）
- [ ] パスが正しい（`../../util`）
- [ ] 特殊文字のエスケープが正しい

実施後:

- [ ] 10/10テストがPASS
- [ ] パフォーマンステストが10秒以内
- [ ] エラーハンドリングが正しく動作
- [ ] コミット・プッシュ完了
- [ ] `結合テスト実行状況レポート.md`を更新

---

## 関連ドキュメント

- **`ref/PostgreSQL不要テストケース提案.md`** - IT-023の詳細提案
- **`ref/結合テスト実行状況レポート.md`** - 全体の実行状況
- **`ref/PostgreSQL結合テスト実行ガイド.md`** - PostgreSQL依存テストのガイド

---

## 次のセッションでの作業フロー

1. 本ドキュメントを読む
2. 環境確認（Step 1）を実行
3. テストファイル作成（Step 2）
4. テスト実行（Step 3）
5. 結果確認（Step 4）
6. コミット・プッシュ（Step 5）
7. `結合テスト実行状況レポート.md`を更新

**所要時間**: 約30分～1時間

---

**最終更新日**: 2025-11-06
**作成者**: Claude (結合テスト作成プロジェクト)
**ステータス**: 準備完了 / 次セッション実施予定
