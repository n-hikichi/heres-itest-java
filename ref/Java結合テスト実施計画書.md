# Java結合テスト実施計画書

**プロジェクト名**: Here's Me Server - Java EncDec モジュール  
**対象コンポーネント**: EncDec.java (パスワード暗号化/復号化ユーティリティ)  
**作成日**: 2025-11-06  
**バージョン**: 1.0  
**単体テストカバレッジ**: 100% (C0/C1)

---

## 1. 目的

EncDec.java の単体テスト完了後、以下を目的とした結合テストを実施する：

1. **実環境動作確認**: コマンドライン実行での動作検証
2. **Node.js連携の前提条件確認**: `child_process.exec` から呼び出される際の動作保証
3. **環境依存性の検証**: 異なるOS・JDK環境での動作確認
4. **エラーハンドリング**: 標準出力/標準エラー出力の適切な処理
5. **パフォーマンス**: 大量データ・同時実行時の性能確認

---

## 2. テストスコープ

### 2.1 対象コンポーネント

```
EncDec.java
├─ main() メソッド
│  ├─ 引数解析 (enc/dec)
│  ├─ encrypt() 呼び出し
│  └─ decrypt() 呼び出し
│
├─ encrypt(String plainText) メソッド
│  └─ AES暗号化 + Base64エンコード
│
└─ decrypt(String encryptedText) メソッド
   └─ Base64デコード + AES復号化
```

### 2.2 テスト対象外

- AES暗号化アルゴリズム自体の検証（Java標準ライブラリの責任範囲）
- 暗号化キーの生成・管理（設定ファイルで管理）
- GUI・Webインターフェース（コマンドラインユーティリティのため存在しない）

### 2.3 実行環境

| 環境 | 目的 | 構成 |
|------|------|------|
| **開発環境** | 基本動作確認 | ローカルマシン、JDK 11 |
| **検証環境** | 本番相当動作確認 | AWS環境、JDK 11 |
| **CI環境** | 自動テスト | GitHub Actions、JDK 11/17 |

---

## 3. テストケース一覧

### 3.1 全体サマリー

| ID | 優先度 | カテゴリ | テスト内容 | 所要時間 |
|----|--------|---------|-----------|---------|
| IT-J001 | 🔴 高 | 正常系 | コマンドライン暗号化 | 5分 |
| IT-J002 | 🔴 高 | 正常系 | コマンドライン復号化 | 5分 |
| IT-J003 | 🔴 高 | 往復テスト | 暗号化→復号化の一致 | 10分 |
| IT-J004 | 🟡 中 | 境界値 | 特殊文字を含むパスワード | 10分 |
| IT-J005 | 🟡 中 | 境界値 | マルチバイト文字 | 10分 |
| IT-J006 | 🟡 中 | 境界値 | 長いパスワード（128文字以上） | 10分 |
| IT-J007 | 🟡 中 | 異常系 | 不正なコマンド引数 | 5分 |
| IT-J008 | 🟡 中 | 異常系 | 不正な暗号化文字列の復号化 | 5分 |
| IT-J009 | 🟡 中 | 環境依存 | クラスパス解決 | 10分 |
| IT-J010 | 🟡 中 | Node.js連携 | child_process.exec 経由実行 | 15分 |
| IT-J011 | ⚪ 低 | パフォーマンス | 大量データ処理 | 15分 |
| IT-J012 | ⚪ 低 | パフォーマンス | 同時実行 | 15分 |

**合計**: 12ケース（高: 3, 中: 7, 低: 2）  
**所要時間**: 約2時間

---

## 4. テストケース詳細

### IT-J001: コマンドライン暗号化（正常系）

**目的**: java コマンド経由で暗号化が正常に動作することを確認

**前提条件**:
- JDK 11以上がインストール済み
- EncDec.class が util/ ディレクトリに配置済み
- 環境変数 JAVA_HOME 設定済み

**実行手順**:
```bash
# 1. ディレクトリ確認
ls -la util/EncDec.class

# 2. 暗号化実行
java -classpath util EncDec enc "test123"

# 3. 出力結果を変数に保存
ENCRYPTED=$(java -classpath util EncDec enc "test123")
echo "暗号化結果: $ENCRYPTED"
```

**期待結果**:
- ✅ リターンコード: 0
- ✅ 標準出力: Base64エンコードされた文字列（例: `aGVsbG8...`）
- ✅ 標準エラー出力: 空（エラーなし）
- ✅ 文字列の長さ: 20文字以上（暗号化されている）
- ✅ 毎回異なる結果（IVがランダムのため）

**検証コマンド**:
```bash
# リターンコード確認
java -classpath util EncDec enc "test123"
echo "Exit code: $?"

# 標準出力のみ取得
OUTPUT=$(java -classpath util EncDec enc "test123" 2>/dev/null)
echo "Length: ${#OUTPUT}"

# エラー出力確認
java -classpath util EncDec enc "test123" 2>&1 >/dev/null | wc -l
```

**優先度**: 🔴 高  
**所要時間**: 5分

---

### IT-J002: コマンドライン復号化（正常系）

**目的**: java コマンド経由で復号化が正常に動作することを確認

**前提条件**:
- IT-J001 完了済み
- 事前に暗号化されたパスワードを準備

**実行手順**:
```bash
# 1. 暗号化実行
ENCRYPTED=$(java -classpath util EncDec enc "test123")
echo "暗号化: $ENCRYPTED"

# 2. 復号化実行
DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED")
echo "復号化: $DECRYPTED"
```

**期待結果**:
- ✅ リターンコード: 0
- ✅ 標準出力: `test123`（元のパスワード）
- ✅ 標準エラー出力: 空
- ✅ 改行コードが含まれていないこと

**検証コマンド**:
```bash
# 改行コード確認
DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED")
echo -n "$DECRYPTED" | od -c

# 文字列比較
if [ "$DECRYPTED" = "test123" ]; then
  echo "✓ 復号化成功"
else
  echo "✗ 復号化失敗: expected='test123', actual='$DECRYPTED'"
fi
```

**優先度**: 🔴 高  
**所要時間**: 5分

---

### IT-J003: 暗号化→復号化 往復テスト

**目的**: 暗号化と復号化の往復で元のデータが復元されることを確認

**前提条件**:
- IT-J001, IT-J002 完了済み

**テストデータ**:
```bash
# テストパターン
PASSWORDS=(
  "test123"
  "password"
  "P@ssw0rd!"
  "12345678"
  ""
  "a"
  "あいうえお"
  "Test 123 With Space"
)
```

**実行手順**:
```bash
#!/bin/bash
# 往復テストスクリプト

PASSWORDS=("test123" "password" "P@ssw0rd!" "12345678" "a")
FAILED=0

for PASS in "${PASSWORDS[@]}"; do
  echo "Testing: '$PASS'"
  
  # 暗号化
  ENCRYPTED=$(java -classpath util EncDec enc "$PASS")
  
  # 復号化
  DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED")
  
  # 比較
  if [ "$DECRYPTED" = "$PASS" ]; then
    echo "  ✓ PASS"
  else
    echo "  ✗ FAIL: expected='$PASS', actual='$DECRYPTED'"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Result: $((${#PASSWORDS[@]} - FAILED))/${#PASSWORDS[@]} passed"
exit $FAILED
```

**期待結果**:
- ✅ 全てのテストパターンで往復が成功
- ✅ リターンコード: 0
- ✅ 失敗数: 0

**優先度**: 🔴 高  
**所要時間**: 10分

---

### IT-J004: 特殊文字を含むパスワード

**目的**: 特殊文字が正しく処理されることを確認

**テストデータ**:
```bash
SPECIAL_CHARS=(
  "p@ssw0rd"
  "test!@#$%^&*()"
  "pass\"word"
  "pass'word"
  "pass\$word"
  "pass\`word"
  "pass|word"
  "pass;word"
  "pass word"    # スペース
  "pass	word"   # タブ
)
```

**実行手順**:
```bash
#!/bin/bash
# 特殊文字テストスクリプト

for PASS in "${SPECIAL_CHARS[@]}"; do
  echo "Testing: '$PASS'"
  
  ENCRYPTED=$(java -classpath util EncDec enc "$PASS")
  DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED")
  
  if [ "$DECRYPTED" = "$PASS" ]; then
    echo "  ✓ PASS"
  else
    echo "  ✗ FAIL"
  fi
done
```

**期待結果**:
- ✅ 全ての特殊文字で往復成功
- ✅ エスケープ処理が正しく動作
- ✅ シェルのメタ文字が誤解釈されない

**優先度**: 🟡 中  
**所要時間**: 10分

---

### IT-J005: マルチバイト文字（日本語）

**目的**: 日本語・多言語文字が正しく処理されることを確認

**テストデータ**:
```bash
MULTIBYTE=(
  "パスワード"
  "ひらがな"
  "カタカナ"
  "漢字混在パスワード123"
  "絵文字😀🎉"
  "中文密码"
  "한국어비밀번호"
  "Тест"       # キリル文字
  "اختبار"     # アラビア文字
)
```

**実行手順**:
```bash
#!/bin/bash
# UTF-8環境の確認
locale | grep UTF-8

# マルチバイトテスト
for PASS in "${MULTIBYTE[@]}"; do
  echo "Testing: '$PASS'"
  
  ENCRYPTED=$(java -classpath util EncDec enc "$PASS")
  DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED")
  
  if [ "$DECRYPTED" = "$PASS" ]; then
    echo "  ✓ PASS"
  else
    echo "  ✗ FAIL"
    echo "    Expected: $PASS"
    echo "    Actual:   $DECRYPTED"
  fi
done
```

**期待結果**:
- ✅ 全てのマルチバイト文字で往復成功
- ✅ 文字化けなし
- ✅ UTF-8エンコーディングが正しく処理される

**優先度**: 🟡 中  
**所要時間**: 10分

---

### IT-J006: 長いパスワード（境界値）

**目的**: 長いパスワードが正しく処理されることを確認

**テストデータ**:
```bash
# 様々な長さのパスワード
SHORT="a"                                    # 1文字
NORMAL="test123456789"                       # 13文字
LONG_64=$(printf 'a%.0s' {1..64})           # 64文字
LONG_128=$(printf 'a%.0s' {1..128})         # 128文字
LONG_256=$(printf 'a%.0s' {1..256})         # 256文字
LONG_512=$(printf 'a%.0s' {1..512})         # 512文字
LONG_1024=$(printf 'a%.0s' {1..1024})       # 1024文字
```

**実行手順**:
```bash
#!/bin/bash
# 長さテストスクリプト

LENGTHS=(1 13 64 128 256 512 1024)

for LEN in "${LENGTHS[@]}"; do
  PASS=$(printf 'a%.0s' $(seq 1 $LEN))
  echo "Testing length: $LEN"
  
  ENCRYPTED=$(java -classpath util EncDec enc "$PASS")
  DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED")
  
  if [ "$DECRYPTED" = "$PASS" ]; then
    echo "  ✓ PASS (encrypted length: ${#ENCRYPTED})"
  else
    echo "  ✗ FAIL"
  fi
done
```

**期待結果**:
- ✅ 1文字から1024文字まで正常に処理
- ✅ 暗号化文字列の長さは元の長さに比例
- ✅ メモリエラーなし

**優先度**: 🟡 中  
**所要時間**: 10分

---

### IT-J007: 不正なコマンド引数（異常系）

**目的**: 不正な引数でのエラーハンドリングを確認

**テストパターン**:
```bash
# 1. 引数不足
java -classpath util EncDec

# 2. 不正なコマンド
java -classpath util EncDec xxx "test"

# 3. 引数過多
java -classpath util EncDec enc "test" "extra"

# 4. 空の暗号化対象
java -classpath util EncDec enc ""

# 5. null相当
java -classpath util EncDec enc
```

**実行手順**:
```bash
#!/bin/bash
# 異常系テストスクリプト

echo "Test 1: 引数不足"
java -classpath util EncDec 2>&1
echo "Exit code: $?"
echo ""

echo "Test 2: 不正なコマンド"
java -classpath util EncDec xxx "test" 2>&1
echo "Exit code: $?"
echo ""

echo "Test 3: 引数過多"
java -classpath util EncDec enc "test" "extra" 2>&1
echo "Exit code: $?"
echo ""

echo "Test 4: 空文字列"
java -classpath util EncDec enc "" 2>&1
echo "Exit code: $?"
```

**期待結果**:
- ✅ リターンコード: 非0（エラー）
- ✅ 標準エラー出力: 適切なエラーメッセージ
- ✅ 標準出力: 空（データ出力なし）
- ✅ アプリケーションクラッシュなし

**検証項目**:
```
期待されるエラーメッセージ例:
- "Usage: EncDec enc|dec <text>"
- "Invalid command: xxx"
- "Text is required"
```

**優先度**: 🟡 中  
**所要時間**: 5分

---

### IT-J008: 不正な暗号化文字列の復号化（異常系）

**目的**: 不正なデータの復号化時のエラーハンドリングを確認

**テストパターン**:
```bash
# 1. Base64ではない文字列
INVALID_BASE64="これはBase64ではない"

# 2. 短すぎるデータ
INVALID_SHORT="abc"

# 3. 不正なBase64（パディングエラー）
INVALID_PADDING="aGVsbG8"

# 4. 正しいBase64だが暗号化データではない
INVALID_CRYPTO=$(echo "hello" | base64)

# 5. 改竄された暗号化データ
TAMPERED="aGVsbG8gd29ybGQgdGhpcyBpcyB0YW1wZXJlZA=="
```

**実行手順**:
```bash
#!/bin/bash
# 不正データテスト

INVALID_DATA=(
  "これはBase64ではない"
  "abc"
  "aGVsbG8"
  $(echo "hello" | base64)
  "aGVsbG8gd29ybGQgdGhpcyBpcyB0YW1wZXJlZA=="
)

for DATA in "${INVALID_DATA[@]}"; do
  echo "Testing invalid data: '$DATA'"
  
  OUTPUT=$(java -classpath util EncDec dec "$DATA" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -ne 0 ]; then
    echo "  ✓ PASS (correctly rejected)"
  else
    echo "  ✗ FAIL (should have failed but succeeded)"
    echo "    Output: $OUTPUT"
  fi
done
```

**期待結果**:
- ✅ 全ての不正データで復号化失敗
- ✅ リターンコード: 非0
- ✅ 適切なエラーメッセージ
- ✅ 例外スタックトレースが標準エラー出力に出力される（デバッグ用）

**優先度**: 🟡 中  
**所要時間**: 5分

---

### IT-J009: クラスパス解決（環境依存）

**目的**: 異なる実行環境でクラスパスが正しく解決されることを確認

**テストパターン**:
```bash
# 1. カレントディレクトリからの実行
cd /path/to/project
java -classpath util EncDec enc "test"

# 2. 絶対パス指定
java -classpath /path/to/project/util EncDec enc "test"

# 3. 相対パス指定（異なる階層から）
cd /path/to/project/tests
java -classpath ../util EncDec enc "test"

# 4. CLASSPATH環境変数使用
export CLASSPATH=/path/to/project/util
java EncDec enc "test"

# 5. JAR化された場合（将来対応）
java -jar EncDec.jar enc "test"
```

**実行手順**:
```bash
#!/bin/bash
# クラスパステスト

PROJECT_ROOT=$(pwd)

echo "Test 1: カレントディレクトリから"
java -classpath util EncDec enc "test" && echo "✓ PASS" || echo "✗ FAIL"

echo "Test 2: 絶対パス"
java -classpath $PROJECT_ROOT/util EncDec enc "test" && echo "✓ PASS" || echo "✗ FAIL"

echo "Test 3: 相対パス（上位ディレクトリから）"
cd tests
java -classpath ../util EncDec enc "test" && echo "✓ PASS" || echo "✗ FAIL"
cd ..

echo "Test 4: CLASSPATH環境変数"
export CLASSPATH=$PROJECT_ROOT/util
java EncDec enc "test" && echo "✓ PASS" || echo "✗ FAIL"
unset CLASSPATH
```

**期待結果**:
- ✅ 全てのクラスパス指定方法で実行成功
- ✅ 開発環境と本番環境で同じ動作
- ✅ エラー「Could not find or load main class」が出ない

**優先度**: 🟡 中  
**所要時間**: 10分

---

### IT-J010: Node.js連携テスト（child_process.exec）

**目的**: Node.jsから呼び出された際の動作を確認

**前提条件**:
- Node.js v22.14.0+ インストール済み

**テストスクリプト**:
```javascript
// test-java-integration.js
const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);

async function testJavaIntegration() {
  console.log('Testing Java EncDec integration with Node.js');
  
  // テストケース
  const testCases = [
    { password: 'test123', description: '通常のパスワード' },
    { password: 'P@ssw0rd!', description: '特殊文字' },
    { password: 'パスワード', description: '日本語' },
    { password: 'a'.repeat(128), description: '長いパスワード' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`\nTest: ${testCase.description}`);
      
      // 暗号化
      const classPath = path.resolve(__dirname + '/util');
      const encCmd = `java -classpath ${classPath} EncDec enc "${testCase.password}"`;
      const { stdout: encStdout, stderr: encStderr } = await execPromise(encCmd);
      
      if (encStderr) {
        console.log(`  ✗ FAIL: Encryption error: ${encStderr}`);
        failed++;
        continue;
      }
      
      const encrypted = encStdout.trim();
      console.log(`  Encrypted: ${encrypted.substring(0, 20)}...`);
      
      // 復号化
      const decCmd = `java -classpath ${classPath} EncDec dec "${encrypted}"`;
      const { stdout: decStdout, stderr: decStderr } = await execPromise(decCmd);
      
      if (decStderr) {
        console.log(`  ✗ FAIL: Decryption error: ${decStderr}`);
        failed++;
        continue;
      }
      
      const decrypted = decStdout.trim();
      
      // 検証
      if (decrypted === testCase.password) {
        console.log(`  ✓ PASS: Decrypted correctly`);
        passed++;
      } else {
        console.log(`  ✗ FAIL: Decrypted incorrectly`);
        console.log(`    Expected: ${testCase.password}`);
        console.log(`    Actual:   ${decrypted}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`  ✗ FAIL: Exception: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Results: ${passed}/${passed + failed} passed`);
  console.log(`========================================`);
  
  process.exit(failed > 0 ? 1 : 0);
}

testJavaIntegration();
```

**実行手順**:
```bash
# テストスクリプト実行
node test-java-integration.js

# 期待される出力
# Testing Java EncDec integration with Node.js
# 
# Test: 通常のパスワード
#   Encrypted: aGVsbG8...
#   ✓ PASS: Decrypted correctly
# 
# Test: 特殊文字
#   Encrypted: bXljc3...
#   ✓ PASS: Decrypted correctly
# ...
# Results: 4/4 passed
```

**期待結果**:
- ✅ 全テストケースがPASS
- ✅ Node.jsのstdout/stderrが正しく処理される
- ✅ 改行コードが適切に処理される
- ✅ 文字エンコーディングが正しい（UTF-8）

**優先度**: 🟡 中（Node.js結合テストの前提条件）  
**所要時間**: 15分

---

### IT-J011: パフォーマンステスト（大量データ）

**目的**: 大量のパスワード処理時の性能を確認

**テストシナリオ**:
```bash
#!/bin/bash
# パフォーマンステスト

NUM_ITERATIONS=1000

echo "Performance test: $NUM_ITERATIONS iterations"
START=$(date +%s)

for i in $(seq 1 $NUM_ITERATIONS); do
  PASS="password$i"
  ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
  DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)
  
  if [ "$DECRYPTED" != "$PASS" ]; then
    echo "✗ FAIL at iteration $i"
    exit 1
  fi
  
  # 進捗表示
  if [ $((i % 100)) -eq 0 ]; then
    echo "  Progress: $i/$NUM_ITERATIONS"
  fi
done

END=$(date +%s)
DURATION=$((END - START))

echo ""
echo "========================================"
echo "✓ All $NUM_ITERATIONS iterations passed"
echo "Duration: ${DURATION}s"
echo "Average: $((DURATION * 1000 / NUM_ITERATIONS))ms per operation"
echo "========================================"
```

**期待結果**:
- ✅ 1000回の往復処理が全て成功
- ✅ 平均処理時間: < 100ms/operation（目安）
- ✅ メモリリークなし
- ✅ エラー発生なし

**性能目標**:
| 指標 | 目標値 |
|------|--------|
| 1回の暗号化 | < 50ms |
| 1回の復号化 | < 50ms |
| 1000回の往復処理 | < 100秒 |
| メモリ使用量 | < 256MB |

**優先度**: ⚪ 低  
**所要時間**: 15分

---

### IT-J012: 同時実行テスト

**目的**: 複数プロセスからの同時実行時の安定性を確認

**テストシナリオ**:
```bash
#!/bin/bash
# 同時実行テスト

NUM_PARALLEL=10
NUM_ITERATIONS=100

echo "Concurrent test: $NUM_PARALLEL parallel processes, $NUM_ITERATIONS iterations each"

# 並列実行関数
run_test() {
  local PROCESS_ID=$1
  local FAILED=0
  
  for i in $(seq 1 $NUM_ITERATIONS); do
    PASS="password_p${PROCESS_ID}_i${i}"
    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)
    
    if [ "$DECRYPTED" != "$PASS" ]; then
      FAILED=$((FAILED + 1))
    fi
  done
  
  echo "Process $PROCESS_ID: $((NUM_ITERATIONS - FAILED))/$NUM_ITERATIONS passed"
  return $FAILED
}

# 並列実行
START=$(date +%s)

for p in $(seq 1 $NUM_PARALLEL); do
  run_test $p &
done

# 全プロセス完了待ち
wait

END=$(date +%s)
DURATION=$((END - START))

echo ""
echo "========================================"
echo "Total duration: ${DURATION}s"
echo "Total operations: $((NUM_PARALLEL * NUM_ITERATIONS * 2))"
echo "Average: $((DURATION * 1000 / (NUM_PARALLEL * NUM_ITERATIONS * 2)))ms per operation"
echo "========================================"
```

**期待結果**:
- ✅ 全プロセスで全ての処理が成功
- ✅ 競合状態（race condition）なし
- ✅ デッドロックなし
- ✅ 処理時間が直列実行の約1/10（並列効果あり）

**優先度**: ⚪ 低  
**所要時間**: 15分

---

## 5. テスト実施スケジュール

### 5.1 実施タイミング

**Node.js結合テスト（Phase 0）の一部として実施**

```
Phase 0: 準備フェーズ（1日）
├─ バグ修正作業（午前）
├─ Java結合テスト実施（午後前半） ← ここで実施
│  ├─ IT-J001-003: 正常系・往復テスト（30分）
│  ├─ IT-J004-006: 境界値テスト（30分）
│  ├─ IT-J007-008: 異常系テスト（15分）
│  └─ IT-J009-010: 環境・連携テスト（25分）
└─ Node.js環境構築・テストデータ準備（午後後半）

Phase 1以降: Node.js側結合テストで連携動作を検証
```

### 5.2 実施順序

```
【必須: Phase 0で実施】
1. IT-J001: コマンドライン暗号化 (5分)
2. IT-J002: コマンドライン復号化 (5分)
3. IT-J003: 往復テスト (10分)
4. IT-J009: クラスパス解決 (10分)
5. IT-J010: Node.js連携テスト (15分)
   ↓
   合計: 45分（Phase 0完了判定の前提条件）

【推奨: Phase 0で実施】
6. IT-J004: 特殊文字 (10分)
7. IT-J005: マルチバイト文字 (10分)
8. IT-J006: 長いパスワード (10分)
9. IT-J007: 不正な引数 (5分)
10. IT-J008: 不正な暗号化文字列 (5分)
    ↓
    合計: 40分

【オプション: 時間があれば実施】
11. IT-J011: パフォーマンステスト (15分)
12. IT-J012: 同時実行テスト (15分)
    ↓
    合計: 30分

全体所要時間: 約2時間（オプション含む）
```

---

## 6. テスト環境

### 6.1 環境要件

```bash
# 必須コンポーネント
JDK: 11以上
Maven: 3.6以上（ビルド用）
Node.js: v22.14.0以上（連携テスト用）

# ディレクトリ構成
project/
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── micros/
│                   └── util/
│                       └── EncDec.java
├── util/
│   └── EncDec.class  ← ビルド後のクラスファイル
└── tests/
    └── integration/
        └── java/
            ├── test-java-integration.js
            ├── run-all-tests.sh
            └── performance-test.sh
```

### 6.2 環境構築手順

```bash
# 1. JDK確認
java -version
# 出力例: openjdk version "11.0.20"

# 2. JAVA_HOME設定
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# 3. Javaソースのビルド
cd src
mvn clean compile

# 4. クラスファイルのコピー
cp target/classes/com/micros/util/EncDec.class ../util/

# 5. 動作確認
java -classpath util EncDec enc "test"
```

---

## 7. 成果物

### 7.1 Phase 0完了時

- [ ] Java結合テスト実施報告書（簡易版）
- [ ] テストエビデンス（ログ、スクリーンショット）
- [ ] 不具合がある場合は不具合報告書

### 7.2 全テスト完了時

- [ ] Java結合テスト結果サマリー
- [ ] パフォーマンステスト結果レポート
- [ ] 環境別動作確認結果
- [ ] Node.js連携テスト結果

---

## 8. 成功基準

### 8.1 必須基準（Phase 0完了判定）

| 指標 | 目標値 |
|------|--------|
| **必須テストケースPASS率** | 100% (IT-J001-003, J009-010) |
| **Critical不具合** | 0件 |
| **Node.js連携テスト** | 全パターンPASS |
| **クラスパス解決** | 全環境で動作 |

### 8.2 推奨基準

| 指標 | 目標値 |
|------|--------|
| **全テストケースPASS率** | 100% (IT-J001-010) |
| **境界値テスト** | 全パターンPASS |
| **異常系テスト** | 適切なエラーハンドリング |

### 8.3 オプション基準

| 指標 | 目標値 |
|------|--------|
| **パフォーマンス** | < 100ms/operation |
| **同時実行** | 10並列で安定動作 |

---

## 9. リスク管理

### 9.1 想定リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|---------|------|
| **Java環境の違い** | 高 | 中 | JDK 11/17で事前検証 |
| **クラスパス解決失敗** | 高 | 低 | 絶対パス・相対パス両方テスト |
| **文字エンコーディング問題** | 中 | 中 | UTF-8を明示的に指定 |
| **Node.js連携エラー** | 高 | 低 | child_process動作を事前確認 |
| **パフォーマンス不足** | 低 | 低 | 最適化は必要に応じて検討 |

---

## 10. Phase 0 チェックリスト（Java部分）

### 10.1 環境確認

- [ ] JDK 11以上インストール確認
- [ ] JAVA_HOME設定確認
- [ ] Maven動作確認
- [ ] EncDec.class配置確認

### 10.2 必須テスト実施

- [ ] IT-J001: コマンドライン暗号化（PASS/FAIL: ___）
- [ ] IT-J002: コマンドライン復号化（PASS/FAIL: ___）
- [ ] IT-J003: 往復テスト（PASS/FAIL: ___）
- [ ] IT-J009: クラスパス解決（PASS/FAIL: ___）
- [ ] IT-J010: Node.js連携テスト（PASS/FAIL: ___）

### 10.3 推奨テスト実施

- [ ] IT-J004: 特殊文字（PASS/FAIL: ___）
- [ ] IT-J005: マルチバイト文字（PASS/FAIL: ___）
- [ ] IT-J006: 長いパスワード（PASS/FAIL: ___）
- [ ] IT-J007: 不正な引数（PASS/FAIL: ___）
- [ ] IT-J008: 不正な暗号化文字列（PASS/FAIL: ___）

### 10.4 完了判定

- [ ] 必須テスト5項目が全てPASS
- [ ] 不具合が0件
- [ ] テスト実施報告書作成完了
- [ ] Phase 1開始GO判定

**担当者**: _____________  
**判定日**: _____________  
**判定結果**: ⬜ GO / ⬜ NO-GO

---

## 11. トラブルシューティング

### 11.1 よくある問題

**Q1: "Could not find or load main class EncDec"**
```bash
# 原因: クラスパスが間違っている
# 対策: 
ls -la util/EncDec.class  # ファイル存在確認
java -classpath util EncDec enc "test"  # クラスパス修正
```

**Q2: 文字化けが発生する**
```bash
# 原因: 文字エンコーディングの問題
# 対策:
export LANG=ja_JP.UTF-8
java -Dfile.encoding=UTF-8 -classpath util EncDec enc "パスワード"
```

**Q3: Node.jsから呼び出すと失敗する**
```javascript
// 原因: パスの解決やエスケープの問題
// 対策:
const classPath = path.resolve(__dirname + '/util');
const password = testCase.password.replace(/"/g, '\\"'); // エスケープ
```

**Q4: パフォーマンスが悪い**
```bash
# 原因: JVM起動オーバーヘッド
# 対策: 
# - 本番環境では事前にJVMをウォームアップ
# - または、長時間稼働のJavaプロセスとして起動し、
#   ソケット通信で連携する方式を検討
```

---

## 12. 参考資料

### 12.1 関連ドキュメント

- [結合テスト実施計画書.md](./結合テスト実施計画書.md) - Node.js側結合テスト
- [Phase0_準備チェックリスト.md](./Phase0_準備チェックリスト.md) - Phase 0全体タスク
- [integration-test-notes-java.md](../integration-test-notes-java.md) - 単体テスト申し送り
- Java単体テストレポート: TEST_REPORT.md

### 12.2 Java EncDec 仕様

- **暗号化アルゴリズム**: AES-256
- **暗号化モード**: CBC
- **パディング**: PKCS5Padding
- **エンコーディング**: Base64
- **文字コード**: UTF-8

---

## 13. 承認

| 役割 | 氏名 | 承認日 | 署名 |
|------|------|--------|------|
| テストリーダー | | | |
| 開発リーダー | | | |

---

**改訂履歴**

| 版 | 日付 | 改訂者 | 改訂内容 |
|----|------|--------|---------|
| 1.0 | 2025-11-06 | Claude Code | 初版作成 |

---

**次のアクション**:
1. ✅ Phase 0開始時にこのテスト計画を実施
2. ✅ 必須5項目のPASS確認
3. ✅ Node.js結合テスト（IT-010）の結果をPhase 1の前提条件とする
