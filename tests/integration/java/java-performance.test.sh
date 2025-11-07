#!/bin/bash
# ============================================================
# Java EncDec パフォーマンス結合テスト (IT-J011 ~ IT-J012)
# ============================================================
# 作成日: 2025-11-07
# 対象: util/EncDec.class
# 実行方法: bash tests/integration/java/java-performance.test.sh
# ============================================================

set -e

# 色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# テスト結果
PASSED=0
FAILED=0

pass() {
    echo -e "  ${GREEN}✓ PASS${NC}: $1"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "  ${RED}✗ FAIL${NC}: $1"
    FAILED=$((FAILED + 1))
}

info() {
    echo -e "${BLUE}$1${NC}"
}

echo "========================================"
echo "Java EncDec パフォーマンス結合テスト"
echo "========================================"
echo ""

# 前提条件確認
if ! command -v java &> /dev/null; then
    echo -e "${RED}ERROR: Java not found${NC}"
    exit 1
fi

if [ ! -f "util/EncDec.class" ]; then
    echo -e "${RED}ERROR: util/EncDec.class not found${NC}"
    exit 1
fi

info "前提条件: OK"
echo ""

# ============================================================
# IT-J011: パフォーマンステスト（大量データ）
# ============================================================

echo "=========================================="
echo "IT-J011: パフォーマンステスト（1000回）"
echo "=========================================="
echo ""

NUM_ITERATIONS=1000

info "実行回数: $NUM_ITERATIONS 回"
info "開始時刻: $(date +%H:%M:%S)"

START=$(date +%s%3N)  # ミリ秒単位

for i in $(seq 1 $NUM_ITERATIONS); do
    PASS="password$i"
    ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
    DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)

    if [ "$DECRYPTED" != "$PASS" ]; then
        fail "Iteration $i failed: expected='$PASS', actual='$DECRYPTED'"
        exit 1
    fi

    # 進捗表示（100回ごと）
    if [ $((i % 100)) -eq 0 ]; then
        echo "  Progress: $i/$NUM_ITERATIONS"
    fi
done

END=$(date +%s%3N)
DURATION=$((END - START))
DURATION_SEC=$((DURATION / 1000))

# 1回あたりの平均時間（ミリ秒）
AVG_MS=$((DURATION / NUM_ITERATIONS))

echo ""
info "終了時刻: $(date +%H:%M:%S)"
echo "========================================"
echo -e "${GREEN}✓ 全 $NUM_ITERATIONS 回のテスト成功${NC}"
echo "========================================"
echo "  総実行時間: ${DURATION}ms (${DURATION_SEC}s)"
echo "  1回あたりの平均: ${AVG_MS}ms"
echo ""

# パフォーマンス目標チェック: 平均100ms以内
if [ $AVG_MS -lt 100 ]; then
    pass "パフォーマンス目標達成 (< 100ms/operation)"
else
    fail "パフォーマンス目標未達成 (${AVG_MS}ms > 100ms)"
fi

echo ""

# ============================================================
# IT-J012: 同時実行テスト
# ============================================================

echo "=========================================="
echo "IT-J012: 同時実行テスト"
echo "=========================================="
echo ""

NUM_PARALLEL=10
NUM_ITERATIONS_PARALLEL=100

info "並列プロセス数: $NUM_PARALLEL"
info "各プロセスの実行回数: $NUM_ITERATIONS_PARALLEL"
info "総実行回数: $((NUM_PARALLEL * NUM_ITERATIONS_PARALLEL))"
echo ""

# 並列実行関数
run_parallel_test() {
    local PROCESS_ID=$1
    local FAILED_LOCAL=0

    for i in $(seq 1 $NUM_ITERATIONS_PARALLEL); do
        PASS="password_p${PROCESS_ID}_i${i}"
        ENCRYPTED=$(java -classpath util EncDec enc "$PASS" 2>/dev/null)
        DECRYPTED=$(java -classpath util EncDec dec "$ENCRYPTED" 2>/dev/null)

        if [ "$DECRYPTED" != "$PASS" ]; then
            FAILED_LOCAL=$((FAILED_LOCAL + 1))
        fi
    done

    echo "  Process $PROCESS_ID: $((NUM_ITERATIONS_PARALLEL - FAILED_LOCAL))/$NUM_ITERATIONS_PARALLEL passed"
    return $FAILED_LOCAL
}

info "同時実行開始..."
START_PARALLEL=$(date +%s%3N)

# 並列実行
PIDS=()
for p in $(seq 1 $NUM_PARALLEL); do
    run_parallel_test $p &
    PIDS+=($!)
done

# 全プロセス完了待ち
PARALLEL_FAILED=0
for pid in "${PIDS[@]}"; do
    wait $pid
    EXIT_CODE=$?
    if [ $EXIT_CODE -ne 0 ]; then
        PARALLEL_FAILED=$((PARALLEL_FAILED + EXIT_CODE))
    fi
done

END_PARALLEL=$(date +%s%3N)
DURATION_PARALLEL=$((END_PARALLEL - START_PARALLEL))
DURATION_PARALLEL_SEC=$((DURATION_PARALLEL / 1000))

echo ""
echo "========================================"
if [ $PARALLEL_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 全プロセスで全テスト成功${NC}"
    pass "同時実行テスト成功"
else
    echo -e "${RED}✗ $PARALLEL_FAILED 件の失敗${NC}"
    fail "同時実行テストで失敗あり"
fi
echo "========================================"
echo "  総実行時間: ${DURATION_PARALLEL}ms (${DURATION_PARALLEL_SEC}s)"
echo "  総実行回数: $((NUM_PARALLEL * NUM_ITERATIONS_PARALLEL))"

# 並列効果の計算
TOTAL_OPS=$((NUM_PARALLEL * NUM_ITERATIONS_PARALLEL))
AVG_MS_PARALLEL=$((DURATION_PARALLEL / TOTAL_OPS))
echo "  1回あたりの平均: ${AVG_MS_PARALLEL}ms"

# 並列実行の効果確認
if [ $DURATION_PARALLEL_SEC -lt $((DURATION_SEC / 5)) ]; then
    pass "並列実行の効果あり（直列実行の1/5以下の時間）"
else
    info "  参考: 直列実行時間 ${DURATION_SEC}s vs 並列実行時間 ${DURATION_PARALLEL_SEC}s"
fi

echo ""

# ============================================================
# 総合結果
# ============================================================

echo "=========================================="
echo "総合結果"
echo "=========================================="
echo -e "${GREEN}成功: $PASSED${NC}"
echo -e "${RED}失敗: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ 全パフォーマンステスト成功！${NC}"
    exit 0
else
    echo -e "${RED}✗ いくつかのテストが失敗しました${NC}"
    exit 1
fi
