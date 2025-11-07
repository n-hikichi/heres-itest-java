#!/bin/bash

#
# 結合テスト全実行スクリプト
#
# 目的: Phase 1, Phase 2, Javaテストを順次実行し、結果を集計
#
# 使用方法:
#   ./ref/run-all-integration-tests.sh
#
# 環境変数:
#   environmentType: 0=localhost(default), 1=AWS環境
#   NODE_ENV: test(default)
#

set -e  # エラーが発生したら即座に終了

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログファイル
LOG_DIR="$PROJECT_ROOT/test-logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/integration_test_${TIMESTAMP}.log"

# ロギング関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# ヘッダー表示
print_header() {
    echo ""
    echo "========================================" | tee -a "$LOG_FILE"
    echo "$1" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
}

# 結果サマリー変数
PHASE1_RESULT=""
PHASE2_RESULT=""
JAVA_RESULT=""
PHASE1_EXIT=0
PHASE2_EXIT=0
JAVA_EXIT=0

# ==========================================
# メイン処理開始
# ==========================================

print_header "結合テスト実行開始"
log_info "実行日時: $(date)"
log_info "プロジェクトルート: $PROJECT_ROOT"
log_info "ログファイル: $LOG_FILE"
log_info "環境タイプ: ${environmentType:-0 (localhost)}"
log_info "NODE_ENV: ${NODE_ENV:-test}"

# プロジェクトルートに移動
cd "$PROJECT_ROOT"

# ==========================================
# Phase 1: 開発環境結合テスト
# ==========================================

print_header "[Phase 1] 開発環境結合テスト実行"

log_info "Phase 1テストファイル:"
log_info "  - telework.integration.test.js (IT-001, IT-002)"
log_info "  - db-util.integration.test.js (IT-009)"
log_info "  - login-auth.integration.test.js (IT-010)"
log_info "  - geolocation.integration.test.js (IT-003 Expected FAIL)"
log_info "  - user-info.integration.test.js (IT-007, IT-008 Expected FAIL)"

# Phase 1テスト実行
npm test -- --config=ref/jest.integration.config.js \
    ref/telework.integration.test.js \
    ref/db-util.integration.test.js \
    ref/login-auth.integration.test.js \
    ref/geolocation.integration.test.js \
    ref/user-info.integration.test.js \
    2>&1 | tee -a "$LOG_FILE"

PHASE1_EXIT=${PIPESTATUS[0]}

if [ $PHASE1_EXIT -eq 0 ]; then
    log_success "Phase 1テスト: 成功"
    PHASE1_RESULT="✅ PASS"
else
    log_error "Phase 1テスト: 失敗 (Exit Code: $PHASE1_EXIT)"
    PHASE1_RESULT="❌ FAIL"
fi

# ==========================================
# Java統合テスト
# ==========================================

print_header "[Java] Java統合テスト実行"

log_info "Javaテスト実行スクリプト: run-java-integration-tests.sh"

if [ -f "$SCRIPT_DIR/run-java-integration-tests.sh" ]; then
    bash "$SCRIPT_DIR/run-java-integration-tests.sh" 2>&1 | tee -a "$LOG_FILE"
    JAVA_EXIT=${PIPESTATUS[0]}

    if [ $JAVA_EXIT -eq 0 ]; then
        log_success "Javaテスト: 成功"
        JAVA_RESULT="✅ PASS"
    else
        log_error "Javaテスト: 失敗 (Exit Code: $JAVA_EXIT)"
        JAVA_RESULT="❌ FAIL"
    fi
else
    log_warning "Javaテストスクリプトが見つかりません: $SCRIPT_DIR/run-java-integration-tests.sh"
    log_warning "Javaテストをスキップします"
    JAVA_RESULT="⏭️ SKIP"
    JAVA_EXIT=0
fi

# ==========================================
# Phase 2: 検証環境結合テスト（AWS環境の場合のみ）
# ==========================================

print_header "[Phase 2] 検証環境結合テスト実行"

if [ "${environmentType}" = "1" ]; then
    log_info "AWS環境が検出されました。Phase 2テストを実行します"
    log_info "Phase 2テストファイル:"
    log_info "  - aws-ssm.integration.test.js (IT-004-006)"

    # Phase 2テスト実行
    npm test -- ref/aws-ssm.integration.test.js 2>&1 | tee -a "$LOG_FILE"
    PHASE2_EXIT=${PIPESTATUS[0]}

    if [ $PHASE2_EXIT -eq 0 ]; then
        log_success "Phase 2テスト: 成功"
        PHASE2_RESULT="✅ PASS"
    else
        log_error "Phase 2テスト: 失敗 (Exit Code: $PHASE2_EXIT)"
        PHASE2_RESULT="❌ FAIL"
    fi
else
    log_info "localhost環境のため、Phase 2テストをスキップします"
    log_info "AWS環境で実行するには: environmentType=1 を設定"
    PHASE2_RESULT="⏭️ SKIP (localhost)"
    PHASE2_EXIT=0
fi

# ==========================================
# 結果サマリー
# ==========================================

print_header "結合テスト実行完了"

echo "" | tee -a "$LOG_FILE"
echo "【テスト結果サマリー】" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "Phase 1 (開発環境)   : $PHASE1_RESULT (Exit Code: $PHASE1_EXIT)" | tee -a "$LOG_FILE"
echo "Java統合テスト       : $JAVA_RESULT (Exit Code: $JAVA_EXIT)" | tee -a "$LOG_FILE"
echo "Phase 2 (検証環境)   : $PHASE2_RESULT (Exit Code: $PHASE2_EXIT)" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

# 総合判定
if [ $PHASE1_EXIT -ne 0 ] || [ $JAVA_EXIT -ne 0 ] || [ $PHASE2_EXIT -ne 0 ]; then
    echo "" | tee -a "$LOG_FILE"
    log_error "【総合判定】 ❌ FAIL"
    log_error "一部のテストが失敗しました"
    echo "" | tee -a "$LOG_FILE"
    log_info "詳細ログ: $LOG_FILE"
    exit 1
else
    echo "" | tee -a "$LOG_FILE"
    log_success "【総合判定】 ✅ PASS"
    log_success "全てのテストが成功しました"
    echo "" | tee -a "$LOG_FILE"
    log_info "詳細ログ: $LOG_FILE"
    exit 0
fi

# ==========================================
# 使用例
# ==========================================

# 【例1】localhost環境で実行
#   ./ref/run-all-integration-tests.sh
#
# 【例2】AWS環境で実行
#   environmentType=1 ./ref/run-all-integration-tests.sh
#
# 【例3】ログを確認
#   tail -f test-logs/integration_test_*.log
#
# 【例4】Phase 1のみ実行
#   npm test -- --config=ref/jest.integration.config.js ref/telework.integration.test.js
#
# 【例5】Phase 2のみ実行（AWS環境）
#   environmentType=1 npm test -- ref/aws-ssm.integration.test.js

# ==========================================
# トラブルシューティング
# ==========================================

# 【問題1】Permission denied
#   対処: chmod +x ref/run-all-integration-tests.sh
#
# 【問題2】npm command not found
#   対処: Node.jsとnpmをインストール
#
# 【問題3】テストが失敗する
#   対処: ログファイルを確認: cat test-logs/integration_test_*.log
#
# 【問題4】PostgreSQLに接続できない
#   対処: PostgreSQLが起動していることを確認: pg_isready -h localhost -p 5432

# ==========================================
# CI/CD環境での使用例
# ==========================================

# 【GitHub Actions例】
# - name: Run Integration Tests
#   run: |
#     npm install
#     chmod +x ref/run-all-integration-tests.sh
#     ./ref/run-all-integration-tests.sh
#   env:
#     NODE_ENV: test
#     environmentType: 0

# 【Jenkins例】
# sh '''
#   npm install
#   chmod +x ref/run-all-integration-tests.sh
#   ./ref/run-all-integration-tests.sh
# '''

# 【GitLab CI例】
# integration_test:
#   stage: test
#   script:
#     - npm install
#     - chmod +x ref/run-all-integration-tests.sh
#     - ./ref/run-all-integration-tests.sh
