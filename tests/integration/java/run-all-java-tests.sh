#!/bin/bash
# ============================================================
# Java EncDec 全結合テスト実行スクリプト
# ============================================================
# 作成日: 2025-11-07
# 対象: IT-J001 ~ IT-J012
# 実行方法: bash tests/integration/java/run-all-java-tests.sh
# ============================================================

set -e

# 色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# テスト結果
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

echo ""
echo "============================================================"
echo "  Java EncDec 全結合テスト実行"
echo "============================================================"
echo ""
echo "  実行日時: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  対象: IT-J001 ~ IT-J012"
echo ""
echo "============================================================"
echo ""

# プロジェクトルートに移動
cd "$(dirname "$0")/../../.."

# ============================================================
# 前提条件確認
# ============================================================

echo -e "${CYAN}■ 前提条件確認${NC}"
echo ""

# Java確認
if ! command -v java &> /dev/null; then
    echo -e "${RED}ERROR: Java not found${NC}"
    echo "  Java 8以上が必要です"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1)
echo "  ✓ Java: $JAVA_VERSION"

# Node.js確認
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js not found${NC}"
    echo "  Node.js v22.14.0以上が必要です"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "  ✓ Node.js: $NODE_VERSION"

# EncDec.class確認
if [ ! -f "util/EncDec.class" ]; then
    echo -e "${RED}ERROR: util/EncDec.class not found${NC}"
    echo "  util/EncDec.classが必要です"
    echo ""
    echo "  ビルド方法:"
    echo "    cd util"
    echo "    javac EncDec.java"
    exit 1
fi

echo "  ✓ EncDec.class: OK"
echo ""

# ============================================================
# テストスイート1: 基本テスト (IT-J001 ~ IT-J009)
# ============================================================

TOTAL_SUITES=$((TOTAL_SUITES + 1))

echo "============================================================"
echo -e "${CYAN}■ Test Suite 1: 基本テスト (IT-J001 ~ IT-J009)${NC}"
echo "============================================================"
echo ""

if bash tests/integration/java/java-basic.test.sh; then
    echo ""
    echo -e "${GREEN}✓ Test Suite 1: 成功${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    echo ""
    echo -e "${RED}✗ Test Suite 1: 失敗${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""
echo ""

# ============================================================
# テストスイート2: Node.js連携テスト (IT-J010)
# ============================================================

TOTAL_SUITES=$((TOTAL_SUITES + 1))

echo "============================================================"
echo -e "${CYAN}■ Test Suite 2: Node.js連携テスト (IT-J010)${NC}"
echo "============================================================"
echo ""

# Jestで実行
if npx jest tests/integration/java/java-encdec.integration.test.js --verbose; then
    echo ""
    echo -e "${GREEN}✓ Test Suite 2: 成功${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    echo ""
    echo -e "${RED}✗ Test Suite 2: 失敗${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""
echo ""

# ============================================================
# テストスイート3: パフォーマンステスト (IT-J011 ~ IT-J012)
# ============================================================

TOTAL_SUITES=$((TOTAL_SUITES + 1))

echo "============================================================"
echo -e "${CYAN}■ Test Suite 3: パフォーマンステスト (IT-J011 ~ IT-J012)${NC}"
echo "============================================================"
echo ""
echo -e "${YELLOW}注意: このテストは数分かかります${NC}"
echo ""

if bash tests/integration/java/java-performance.test.sh; then
    echo ""
    echo -e "${GREEN}✓ Test Suite 3: 成功${NC}"
    PASSED_SUITES=$((PASSED_SUITES + 1))
else
    echo ""
    echo -e "${RED}✗ Test Suite 3: 失敗${NC}"
    FAILED_SUITES=$((FAILED_SUITES + 1))
fi

echo ""
echo ""

# ============================================================
# 総合結果
# ============================================================

echo "============================================================"
echo "  総合結果"
echo "============================================================"
echo ""
echo "  総テストスイート数: $TOTAL_SUITES"
echo -e "  ${GREEN}成功: $PASSED_SUITES${NC}"
echo -e "  ${RED}失敗: $FAILED_SUITES${NC}"
echo ""

if [ $FAILED_SUITES -eq 0 ]; then
    echo "============================================================"
    echo -e "  ${GREEN}✓✓✓ 全テストスイート成功！ ✓✓✓${NC}"
    echo "============================================================"
    echo ""
    echo "  次のステップ:"
    echo "    - テスト結果レポートを ref/ に保存"
    echo "    - ドキュメントを更新"
    echo ""
    exit 0
else
    echo "============================================================"
    echo -e "  ${RED}✗✗✗ いくつかのテストスイートが失敗しました ✗✗✗${NC}"
    echo "============================================================"
    echo ""
    echo "  トラブルシューティング:"
    echo "    - ログを確認してください"
    echo "    - 個別のテストスクリプトを直接実行してください"
    echo "    - ref/Java結合テスト実施計画書.md を参照してください"
    echo ""
    exit 1
fi
