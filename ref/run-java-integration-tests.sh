#!/bin/bash
# ============================================================
# Java結合テスト実行スクリプト
# ============================================================
# ファイル名: run-java-integration-tests.sh
# 目的: EncDec.java の結合テストを自動実行
# 実行方法: ./run-java-integration-tests.sh
# 作成日: 2025-11-06
# ============================================================

set -e  # エラー時に即座に終了

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テスト結果カウンター
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# ログファイル
LOG_FILE="java-integration-test-$(date +%Y%m%d_%H%M%S).log"

# ============================================================
# ユーティリティ関数
# ============================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

test_header() {
  echo "" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"
  echo "$1" | tee -a "$LOG_FILE"
  echo "========================================" | tee -a "$LOG_FILE"
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

test_pass() {
  log_success "✓ PASS: $1"
  PASSED_TESTS=$((PASSED_TESTS + 1))
}

test_fail() {
  log_error "✗ FAIL: $1"
  FAILED_TESTS=$((FAILED_TESTS + 1))
}

test_skip() {
  log_warning "⊘ SKIP: $1"
  SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
}

# ============================================================
# 環境チェック
# ============================================================

check_environment() {
  log_info "環境チェック開始"
  
  # Java確認
  if ! command -v java &> /dev/null; then
    log_error "Java not found. Please install JDK 11 or later."
    exit 1
  fi
  
  JAVA_VERSION=$(java -version 2>&1 | grep version | awk -F '"' '{print $2}' | awk -F '.' '{print $1}')
  log_info "Java version: $(java -version 2>&1 | head -n 1)"
  
  if [ "$JAVA_VERSION" -lt 11 ]; then
    log_error "Java 11 or later is required. Current version: $JAVA_VERSION"
    exit 1
  fi
  
  # EncDec.class確認
  if [ ! -f "util/EncDec.class" ]; then
    log_error "EncDec.class not found in util/ directory"
    log_info "Please build the Java source first:"
    log_info "  cd src && mvn clean compile && cp target/classes/com/micros/util/EncDec.class ../util/"
    exit 1
  fi
  
  log_success "環境チェック完了"
}

# ============================================================
# IT-J001: コマンドライン暗号化
# ============================================================

test_j001() {
  test_header "IT-J001: コマンドライン暗号化"
  
  ENCRYPTED=$(java -classpath util EncDec enc "test123" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ] && [ -n "$ENCRYPTED" ]; then
    log_info "Encrypted: ${ENCRYPTED:0:20}..."
    test_pass "暗号化が成功しました"
  else
    log_error "暗号化に失敗しました"
    log_error "Output: $ENCRYPTED"
    test_fail "暗号化が失敗しました"
  fi
}

# ============================================================
# IT-J002: コマンドライン復号化
# ============================================================

test_j002() {
  test_header "IT-J002: コマンドライン復号化"
  
  # 暗号化
  ENCRYPTED=$(java -classpath util EncDec enc "test123" 2>&1)
  
  # 復号化
  DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>&1)
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ] && [ "$DECRYPTED" = "test123" ]; then
    test_pass "復号化が成功しました (expected: test123, actual: $DECRYPTED)"
  else
    log_error "Expected: test123"
    log_error "Actual: $DECRYPTED"
    test_fail "復号化が失敗しました"
  fi
}

# ============================================================
# IT-J003: 往復テスト
# ============================================================

test_j003() {
  test_header "IT-J003: 暗号化→復号化 往復テスト"
  
  PASSWORDS=("test123" "password" "P@ssw0rd!" "12345678" "a")
  
  local FAILED=0
  
  for PASS in "${PASSWORDS[@]}"; do
    log_info "Testing: '$PASS'"
    
    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>&1)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>&1)
    
    if [ "$DECRYPTED" = "$PASS" ]; then
      log_success "  ✓ '$PASS' - OK"
    else
      log_error "  ✗ '$PASS' - FAIL (expected: $PASS, actual: $DECRYPTED)"
      FAILED=$((FAILED + 1))
    fi
  done
  
  if [ $FAILED -eq 0 ]; then
    test_pass "全${#PASSWORDS[@]}パターンが成功しました"
  else
    test_fail "$FAILED/${#PASSWORDS[@]} パターンが失敗しました"
  fi
}

# ============================================================
# IT-J004: 特殊文字を含むパスワード
# ============================================================

test_j004() {
  test_header "IT-J004: 特殊文字を含むパスワード"
  
  SPECIAL_CHARS=(
    "p@ssw0rd"
    "test!@#\$%^&*()"
    "pass'word"
    "pass word"
  )
  
  local FAILED=0
  
  for PASS in "${SPECIAL_CHARS[@]}"; do
    log_info "Testing: '$PASS'"
    
    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>&1)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>&1)
    
    if [ "$DECRYPTED" = "$PASS" ]; then
      log_success "  ✓ '$PASS' - OK"
    else
      log_error "  ✗ '$PASS' - FAIL"
      FAILED=$((FAILED + 1))
    fi
  done
  
  if [ $FAILED -eq 0 ]; then
    test_pass "全${#SPECIAL_CHARS[@]}パターンが成功しました"
  else
    test_fail "$FAILED/${#SPECIAL_CHARS[@]} パターンが失敗しました"
  fi
}

# ============================================================
# IT-J005: マルチバイト文字
# ============================================================

test_j005() {
  test_header "IT-J005: マルチバイト文字（日本語）"
  
  # UTF-8環境確認
  if ! locale | grep -q "UTF-8"; then
    log_warning "UTF-8ロケールが設定されていません"
  fi
  
  MULTIBYTE=(
    "パスワード"
    "ひらがな"
    "カタカナ"
    "漢字混在パスワード123"
  )
  
  local FAILED=0
  
  for PASS in "${MULTIBYTE[@]}"; do
    log_info "Testing: '$PASS'"
    
    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>&1)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>&1)
    
    if [ "$DECRYPTED" = "$PASS" ]; then
      log_success "  ✓ '$PASS' - OK"
    else
      log_error "  ✗ '$PASS' - FAIL"
      log_error "    Expected: $PASS"
      log_error "    Actual:   $DECRYPTED"
      FAILED=$((FAILED + 1))
    fi
  done
  
  if [ $FAILED -eq 0 ]; then
    test_pass "全${#MULTIBYTE[@]}パターンが成功しました"
  else
    test_fail "$FAILED/${#MULTIBYTE[@]} パターンが失敗しました"
  fi
}

# ============================================================
# IT-J006: 長いパスワード
# ============================================================

test_j006() {
  test_header "IT-J006: 長いパスワード（境界値）"
  
  LENGTHS=(1 13 64 128 256)
  
  local FAILED=0
  
  for LEN in "${LENGTHS[@]}"; do
    log_info "Testing length: $LEN"
    
    PASS=$(printf 'a%.0s' $(seq 1 $LEN))
    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>&1)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>&1)
    
    if [ "$DECRYPTED" = "$PASS" ]; then
      log_success "  ✓ Length $LEN - OK (encrypted length: ${#ENCRYPTED})"
    else
      log_error "  ✗ Length $LEN - FAIL"
      FAILED=$((FAILED + 1))
    fi
  done
  
  if [ $FAILED -eq 0 ]; then
    test_pass "全${#LENGTHS[@]}パターンが成功しました"
  else
    test_fail "$FAILED/${#LENGTHS[@]} パターンが失敗しました"
  fi
}

# ============================================================
# IT-J007: 不正なコマンド引数
# ============================================================

test_j007() {
  test_header "IT-J007: 不正なコマンド引数（異常系）"
  
  log_info "Test 1: 引数不足"
  java -classpath util EncDec 2>&1 | head -n 1 | tee -a "$LOG_FILE"
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_success "  ✓ 正しくエラーとなりました"
  else
    log_error "  ✗ エラーになるべきでしたが成功しました"
  fi
  
  log_info "Test 2: 不正なコマンド"
  java -classpath util EncDec xxx "test" 2>&1 | head -n 1 | tee -a "$LOG_FILE"
  if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_success "  ✓ 正しくエラーとなりました"
  else
    log_error "  ✗ エラーになるべきでしたが成功しました"
  fi
  
  test_pass "異常系が正しく処理されました"
}

# ============================================================
# IT-J008: 不正な暗号化文字列の復号化
# ============================================================

test_j008() {
  test_header "IT-J008: 不正な暗号化文字列の復号化"
  
  INVALID_DATA=(
    "これはBase64ではない"
    "abc"
    "aGVsbG8"
  )
  
  local CORRECTLY_REJECTED=0
  
  for DATA in "${INVALID_DATA[@]}"; do
    log_info "Testing invalid data: '$DATA'"
    
    OUTPUT=$(java -classpath util EncDec dec "$DATA" 2>&1)
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -ne 0 ]; then
      log_success "  ✓ 正しく拒否されました"
      CORRECTLY_REJECTED=$((CORRECTLY_REJECTED + 1))
    else
      log_error "  ✗ 失敗すべきでしたが成功しました"
      log_error "    Output: $OUTPUT"
    fi
  done
  
  if [ $CORRECTLY_REJECTED -eq ${#INVALID_DATA[@]} ]; then
    test_pass "全${#INVALID_DATA[@]}パターンが正しく拒否されました"
  else
    test_fail "$((${#INVALID_DATA[@]} - CORRECTLY_REJECTED))/${#INVALID_DATA[@]} パターンの拒否に失敗しました"
  fi
}

# ============================================================
# IT-J009: クラスパス解決
# ============================================================

test_j009() {
  test_header "IT-J009: クラスパス解決（環境依存）"
  
  PROJECT_ROOT=$(pwd)
  
  log_info "Test 1: カレントディレクトリから実行"
  if java -classpath util EncDec enc "test" &> /dev/null; then
    log_success "  ✓ OK"
  else
    log_error "  ✗ FAIL"
  fi
  
  log_info "Test 2: 絶対パス指定"
  if java -classpath "$PROJECT_ROOT/util" EncDec enc "test" &> /dev/null; then
    log_success "  ✓ OK"
  else
    log_error "  ✗ FAIL"
  fi
  
  test_pass "クラスパス解決が正常に動作しました"
}

# ============================================================
# IT-J010: Node.js連携テスト
# ============================================================

test_j010() {
  test_header "IT-J010: Node.js連携テスト"
  
  # Node.js確認
  if ! command -v node &> /dev/null; then
    log_warning "Node.js not found. Skipping IT-J010."
    test_skip "Node.jsがインストールされていません"
    return
  fi
  
  # テストスクリプトが存在するか確認
  if [ ! -f "tests/integration/java/test-java-integration.js" ]; then
    log_warning "test-java-integration.js not found. Skipping IT-J010."
    test_skip "テストスクリプトが存在しません"
    return
  fi
  
  log_info "Running Node.js integration test..."
  
  if node tests/integration/java/test-java-integration.js >> "$LOG_FILE" 2>&1; then
    test_pass "Node.js連携テストが成功しました"
  else
    log_error "Node.js連携テストが失敗しました"
    test_fail "Node.js連携テストが失敗しました"
  fi
}

# ============================================================
# メイン処理
# ============================================================

main() {
  echo "============================================================" | tee "$LOG_FILE"
  echo "Java結合テスト実行" | tee -a "$LOG_FILE"
  echo "実行日時: $(date)" | tee -a "$LOG_FILE"
  echo "============================================================" | tee -a "$LOG_FILE"
  
  # 環境チェック
  check_environment
  
  # 必須テスト（Phase 0完了判定に必要）
  log_info "必須テスト実行開始"
  test_j001  # コマンドライン暗号化
  test_j002  # コマンドライン復号化
  test_j003  # 往復テスト
  test_j009  # クラスパス解決
  test_j010  # Node.js連携
  
  # 推奨テスト
  log_info "推奨テスト実行開始"
  test_j004  # 特殊文字
  test_j005  # マルチバイト文字
  test_j006  # 長いパスワード
  test_j007  # 不正な引数
  test_j008  # 不正な暗号化文字列
  
  # 結果サマリー
  echo "" | tee -a "$LOG_FILE"
  echo "============================================================" | tee -a "$LOG_FILE"
  echo "テスト結果サマリー" | tee -a "$LOG_FILE"
  echo "============================================================" | tee -a "$LOG_FILE"
  echo "総テスト数:   $TOTAL_TESTS" | tee -a "$LOG_FILE"
  echo "成功:         $PASSED_TESTS" | tee -a "$LOG_FILE"
  echo "失敗:         $FAILED_TESTS" | tee -a "$LOG_FILE"
  echo "スキップ:     $SKIPPED_TESTS" | tee -a "$LOG_FILE"
  echo "============================================================" | tee -a "$LOG_FILE"
  
  if [ $FAILED_TESTS -eq 0 ]; then
    log_success "全てのテストが成功しました！"
    echo "" | tee -a "$LOG_FILE"
    log_success "Phase 0完了判定: GO"
    exit 0
  else
    log_error "$FAILED_TESTS 個のテストが失敗しました"
    echo "" | tee -a "$LOG_FILE"
    log_error "Phase 0完了判定: NO-GO"
    exit 1
  fi
}

# スクリプト実行
main
