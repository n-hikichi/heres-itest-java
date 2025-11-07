#!/bin/bash

#
# テスト環境確認スクリプト
#
# 目的: 結合テスト実行前に環境が整っているかチェック
#

set -e

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# チェック結果カウンター
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# チェック関数
check_command() {
    local cmd=$1
    local name=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name: $(command -v $cmd)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $name: NOT FOUND"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_service() {
    local service=$1
    local name=$2
    local check_cmd=$3
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if eval "$check_cmd" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $name: RUNNING"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $name: NOT RUNNING"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

check_file() {
    local file=$1
    local name=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $name: $file"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $name: NOT FOUND (optional)"
        WARNING_CHECKS=$((WARNING_CHECKS + 1))
        return 1
    fi
}

# ヘッダー
echo ""
echo "========================================="
echo "  結合テスト環境確認"
echo "========================================="
echo ""

# 1. 必須コマンドのチェック
echo -e "${BLUE}[1] 必須コマンド${NC}"
check_command "node" "Node.js"
check_command "npm" "npm"
check_command "java" "Java"
check_command "psql" "PostgreSQL Client"
echo ""

# 2. サービスのチェック
echo -e "${BLUE}[2] サービス${NC}"
check_service "PostgreSQL" "PostgreSQL Server" "pg_isready -h localhost -p 5432"
echo ""

# 3. 必須ファイルのチェック
echo -e "${BLUE}[3] 必須ファイル${NC}"
check_file "util/EncDec.class" "Java EncDec.class"
check_file "ref/test-data-setup.sql" "テストデータSQL"
check_file "ref/jest.integration.config.js" "Jest設定"
check_file "ref/run-all-integration-tests.sh" "全テスト実行スクリプト"
echo ""

# 4. 環境変数のチェック
echo -e "${BLUE}[4] 環境変数${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -n "$NODE_ENV" ]; then
    echo -e "${GREEN}✓${NC} NODE_ENV: $NODE_ENV"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠${NC} NODE_ENV: NOT SET (will use default)"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
fi

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -n "$environmentType" ]; then
    echo -e "${GREEN}✓${NC} environmentType: $environmentType"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠${NC} environmentType: NOT SET (will use 0=localhost)"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
fi
echo ""

# 5. Node.jsパッケージのチェック
echo -e "${BLUE}[5] Node.jsパッケージ${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules: INSTALLED"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗${NC} node_modules: NOT FOUND (run 'npm install')"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# 6. データベース接続テスト
echo -e "${BLUE}[6] データベース接続${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if psql -h localhost -U imhereadmin -d imhere -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Database 'imhere': ACCESSIBLE"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${RED}✗${NC} Database 'imhere': NOT ACCESSIBLE"
    echo -e "   ${YELLOW}→${NC} Create database: createdb -U imhereadmin imhere"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
echo ""

# 7. Javaバージョン確認
echo -e "${BLUE}[7] バージョン情報${NC}"
echo "Node.js: $(node --version 2>/dev/null || echo 'N/A')"
echo "npm: $(npm --version 2>/dev/null || echo 'N/A')"
echo "Java: $(java -version 2>&1 | head -1 || echo 'N/A')"
echo "PostgreSQL: $(psql --version 2>/dev/null || echo 'N/A')"
echo ""

# 結果サマリー
echo "========================================="
echo "  チェック結果"
echo "========================================="
echo -e "${GREEN}✓ PASSED${NC}:  $PASSED_CHECKS"
echo -e "${YELLOW}⚠ WARNING${NC}: $WARNING_CHECKS"
echo -e "${RED}✗ FAILED${NC}:  $FAILED_CHECKS"
echo "-----------------------------------------"
echo "TOTAL:    $TOTAL_CHECKS"
echo "========================================="
echo ""

# 総合判定
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✓ 環境は正常です。テストを実行できます。${NC}"
    echo ""
    echo "次のステップ:"
    echo "  1. テストデータ投入: psql -U imhereadmin -d imhere < ref/test-data-setup.sql"
    echo "  2. テスト実行: ./ref/run-all-integration-tests.sh"
    exit 0
else
    echo -e "${RED}✗ 環境に問題があります。以下を確認してください:${NC}"
    echo ""

    # 修正方法の提示
    if ! command -v psql &> /dev/null; then
        echo "  • PostgreSQLをインストール:"
        echo "    - Ubuntu/Debian: sudo apt-get install postgresql postgresql-client"
        echo "    - macOS: brew install postgresql"
        echo ""
    fi

    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        echo "  • PostgreSQLを起動:"
        echo "    - systemctl start postgresql"
        echo "    - または: pg_ctl -D /usr/local/var/postgres start"
        echo ""
    fi

    if [ ! -d "node_modules" ]; then
        echo "  • Node.jsパッケージをインストール:"
        echo "    - npm install"
        echo ""
    fi

    if [ ! -f "util/EncDec.class" ]; then
        echo "  • Java EncDec.classを配置:"
        echo "    - util/EncDec.class が必要です"
        echo ""
    fi

    exit 1
fi
