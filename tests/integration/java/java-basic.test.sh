#!/bin/bash
# ============================================================
# Java EncDec 基本結合テスト (IT-J001 ~ IT-J009)
# ============================================================
# 作成日: 2025-11-07
# 対象: util/EncDec.class
# 実行方法: bash tests/integration/java/java-basic.test.sh
# ============================================================

set -e  # エラー時に終了

# 色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# カウンター
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# テスト結果表示
pass() {
    echo -e "  ${GREEN}✓ PASS${NC}: $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

fail() {
    echo -e "  ${RED}✗ FAIL${NC}: $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

info() {
    echo -e "${YELLOW}$1${NC}"
}

# テストヘッダー
test_header() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo "=========================================="
    echo "Test $TOTAL_TESTS: $1"
    echo "=========================================="
}

# ============================================================
# 前提条件確認
# ============================================================

echo "========================================"
echo "Java EncDec 基本結合テスト"
echo "========================================"
echo ""

# Java確認
info "前提条件確認中..."
if ! command -v java &> /dev/null; then
    echo -e "${RED}ERROR: Java not found${NC}"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1)
echo "  Java: $JAVA_VERSION"

# EncDec.class確認
if [ ! -f "util/EncDec.class" ]; then
    echo -e "${RED}ERROR: util/EncDec.class not found${NC}"
    exit 1
fi
echo "  EncDec.class: OK"
echo ""

# ============================================================
# IT-J001: コマンドライン暗号化（正常系）
# ============================================================

test_header "IT-J001: コマンドライン暗号化（正常系）"

ENCRYPTED=$(java -classpath util EncDec enc "test123" 2>/dev/null)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    pass "暗号化コマンドが正常終了"
else
    fail "暗号化コマンドが失敗 (exit code: $EXIT_CODE)"
fi

if [ -n "$ENCRYPTED" ]; then
    pass "暗号化結果が出力された"
    echo "    暗号化結果: ${ENCRYPTED:0:20}..."
else
    fail "暗号化結果が空"
fi

if [ ${#ENCRYPTED} -gt 7 ]; then
    pass "暗号化結果の長さが適切 (${#ENCRYPTED}文字)"
else
    fail "暗号化結果が短すぎる (${#ENCRYPTED}文字)"
fi

# ============================================================
# IT-J002: コマンドライン復号化（正常系）
# ============================================================

test_header "IT-J002: コマンドライン復号化（正常系）"

PLAIN_TEXT="test123"
ENCRYPTED=$(java -classpath util EncDec enc "$PLAIN_TEXT" 2>/dev/null)
DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    pass "復号化コマンドが正常終了"
else
    fail "復号化コマンドが失敗 (exit code: $EXIT_CODE)"
fi

if [ "$DECRYPTED" = "$PLAIN_TEXT" ]; then
    pass "復号化結果が一致: '$DECRYPTED'"
else
    fail "復号化結果が不一致: expected='$PLAIN_TEXT', actual='$DECRYPTED'"
fi

# ============================================================
# IT-J003: 暗号化→復号化 往復テスト
# ============================================================

test_header "IT-J003: 暗号化→復号化 往復テスト"

PASSWORDS=(
    "test123"
    "password"
    "P@ssw0rd!"
    "12345678"
    "a"
    "pass word"
)

ROUND_TRIP_FAILED=0

for PASS in "${PASSWORDS[@]}"; do
    echo "  Testing: '$PASS'"

    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)

    if [ "$DECRYPTED" = "$PASS" ]; then
        pass "往復テスト成功"
    else
        fail "往復テスト失敗: expected='$PASS', actual='$DECRYPTED'"
        ROUND_TRIP_FAILED=$((ROUND_TRIP_FAILED + 1))
    fi
done

if [ $ROUND_TRIP_FAILED -eq 0 ]; then
    echo "  ${GREEN}✓ 全${#PASSWORDS[@]}パターン成功${NC}"
else
    echo "  ${RED}✗ ${ROUND_TRIP_FAILED}/${#PASSWORDS[@]}パターン失敗${NC}"
fi

# ============================================================
# IT-J004: 特殊文字を含むパスワード
# ============================================================

test_header "IT-J004: 特殊文字を含むパスワード"

SPECIAL_CHARS=(
    "p@ssw0rd"
    "test!@#\$%"
    "pass'word"
    "pass word"
)

SPECIAL_FAILED=0

for PASS in "${SPECIAL_CHARS[@]}"; do
    echo "  Testing: '$PASS'"

    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)

    if [ "$DECRYPTED" = "$PASS" ]; then
        pass "特殊文字テスト成功"
    else
        fail "特殊文字テスト失敗"
        SPECIAL_FAILED=$((SPECIAL_FAILED + 1))
    fi
done

if [ $SPECIAL_FAILED -eq 0 ]; then
    echo "  ${GREEN}✓ 全${#SPECIAL_CHARS[@]}パターン成功${NC}"
fi

# ============================================================
# IT-J005: マルチバイト文字（日本語）
# ============================================================

test_header "IT-J005: マルチバイト文字（日本語）"

# UTF-8環境確認
LOCALE_UTF8=$(locale | grep -i utf-8 | wc -l)
if [ $LOCALE_UTF8 -gt 0 ]; then
    info "  ✓ UTF-8環境確認"
else
    info "  ⚠ UTF-8環境ではない可能性があります"
fi

MULTIBYTE=(
    "パスワード"
    "ひらがな"
    "カタカナ"
    "漢字混在パスワード123"
)

MULTIBYTE_FAILED=0

for PASS in "${MULTIBYTE[@]}"; do
    echo "  Testing: '$PASS'"

    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)

    if [ "$DECRYPTED" = "$PASS" ]; then
        pass "マルチバイトテスト成功"
    else
        fail "マルチバイトテスト失敗"
        MULTIBYTE_FAILED=$((MULTIBYTE_FAILED + 1))
    fi
done

if [ $MULTIBYTE_FAILED -eq 0 ]; then
    echo "  ${GREEN}✓ 全${#MULTIBYTE[@]}パターン成功${NC}"
fi

# ============================================================
# IT-J006: 長いパスワード（境界値）
# ============================================================

test_header "IT-J006: 長いパスワード（境界値）"

LENGTHS=(1 13 64 128 256)

LENGTH_FAILED=0

for LEN in "${LENGTHS[@]}"; do
    echo "  Testing length: $LEN"

    # 指定長の文字列生成
    PASS=$(printf 'a%.0s' $(seq 1 $LEN))

    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)

    if [ "$DECRYPTED" = "$PASS" ]; then
        pass "長さ${LEN}文字テスト成功 (暗号化後: ${#ENCRYPTED}文字)"
    else
        fail "長さ${LEN}文字テスト失敗"
        LENGTH_FAILED=$((LENGTH_FAILED + 1))
    fi
done

if [ $LENGTH_FAILED -eq 0 ]; then
    echo "  ${GREEN}✓ 全${#LENGTHS[@]}パターン成功${NC}"
fi

# ============================================================
# IT-J007: 不正なコマンド引数（異常系）
# ============================================================

test_header "IT-J007: 不正なコマンド引数（異常系）"

echo "  Test 1: 不正なコマンド"
OUTPUT=$(java -classpath util EncDec xxx "test" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    pass "不正なコマンドが正しくエラーになった"
else
    fail "不正なコマンドがエラーにならなかった"
fi

echo "  Test 2: 引数不足"
OUTPUT=$(java -classpath util EncDec 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ] || echo "$OUTPUT" | grep -q "Error"; then
    pass "引数不足が正しくエラーになった"
else
    fail "引数不足がエラーにならなかった"
fi

# ============================================================
# IT-J008: 不正な暗号化文字列の復号化（異常系）
# ============================================================

test_header "IT-J008: 不正な暗号化文字列の復号化（異常系）"

INVALID_DATA=(
    "これはBase64ではない"
    "abc"
    "aGVsbG8"
)

INVALID_FAILED=0

for DATA in "${INVALID_DATA[@]}"; do
    echo "  Testing invalid data: '$DATA'"

    OUTPUT=$(java -classpath util EncDec dec "$DATA" 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ] || echo "$OUTPUT" | grep -qE "(Exception|Error)"; then
        pass "不正データが正しく拒否された"
    else
        fail "不正データが復号化できてしまった"
        INVALID_FAILED=$((INVALID_FAILED + 1))
    fi
done

if [ $INVALID_FAILED -eq 0 ]; then
    echo "  ${GREEN}✓ 全${#INVALID_DATA[@]}パターン成功${NC}"
fi

# ============================================================
# IT-J009: クラスパス解決（環境依存）
# ============================================================

test_header "IT-J009: クラスパス解決（環境依存）"

PROJECT_ROOT=$(pwd)

# Test 1: カレントディレクトリから
echo "  Test 1: カレントディレクトリから"
RESULT=$(java -classpath util EncDec enc "test" 2>/dev/null)
if [ $? -eq 0 ]; then
    pass "カレントディレクトリから実行成功"
else
    fail "カレントディレクトリから実行失敗"
fi

# Test 2: 絶対パス
echo "  Test 2: 絶対パス指定"
RESULT=$(java -classpath "$PROJECT_ROOT/util" EncDec enc "test" 2>/dev/null)
if [ $? -eq 0 ]; then
    pass "絶対パス指定で実行成功"
else
    fail "絶対パス指定で実行失敗"
fi

# Test 3: 相対パス（testディレクトリから）
echo "  Test 3: 相対パス（testsディレクトリから）"
(cd tests && java -classpath ../util EncDec enc "test" 2>/dev/null)
if [ $? -eq 0 ]; then
    pass "相対パス指定で実行成功"
else
    fail "相対パス指定で実行失敗"
fi

# ============================================================
# テスト結果サマリー
# ============================================================

echo ""
echo "=========================================="
echo "テスト結果サマリー"
echo "=========================================="
echo "総テスト数: $TOTAL_TESTS"
echo -e "${GREEN}成功: $PASSED_TESTS${NC}"
echo -e "${RED}失敗: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 全テスト成功！${NC}"
    exit 0
else
    echo -e "${RED}✗ いくつかのテストが失敗しました${NC}"
    exit 1
fi
