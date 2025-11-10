#!/bin/bash
# ===========================================
# Here's Me Server - Integration Test Package Creator
# ===========================================
# 作成日: 2025-11-10
# 用途: 結合テストのリリースパッケージを作成
# ===========================================

set -e

# 色設定
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ZIP_NAME="heresme-sv-integration-tests.zip"
TEMP_DIR="temp_integration_package"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Integration Test Package Creator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 一時ディレクトリが既に存在する場合は削除
if [ -d "$TEMP_DIR" ]; then
    echo -e "${YELLOW}Cleaning up existing temp directory...${NC}"
    rm -rf $TEMP_DIR
fi

# 一時ディレクトリ作成
echo -e "${GREEN}Creating temporary directory...${NC}"
mkdir -p $TEMP_DIR

# ========================================
# 結合テストファイルをコピー
# ========================================
echo -e "${GREEN}Copying integration test files...${NC}"

# tests/integration/ ディレクトリ全体をコピー
mkdir -p $TEMP_DIR/tests
cp -r tests/integration $TEMP_DIR/tests/

# ファイル数確認
INTEGRATION_FILES=$(find $TEMP_DIR/tests/integration -type f | wc -l)
echo "  - Integration test files: $INTEGRATION_FILES"

# ========================================
# Java関連ファイルをコピー
# ========================================
echo -e "${GREEN}Copying Java files...${NC}"

mkdir -p $TEMP_DIR/util
cp util/EncDec.java $TEMP_DIR/util/
cp util/EncDec.class $TEMP_DIR/util/
echo "  - util/EncDec.java"
echo "  - util/EncDec.class"

# ========================================
# 設定ファイルをコピー
# ========================================
echo -e "${GREEN}Copying configuration files...${NC}"

cp package.json $TEMP_DIR/
echo "  - package.json"

cp jest.config.js $TEMP_DIR/
echo "  - jest.config.js"

if [ -f "Makefile" ]; then
    cp Makefile $TEMP_DIR/
    echo "  - Makefile"
fi

cp .env.example $TEMP_DIR/
echo "  - .env.example"

# ========================================
# ドキュメントをコピー
# ========================================
echo -e "${GREEN}Copying documentation...${NC}"

cp INTEGRATION_TEST_GUIDE.md $TEMP_DIR/
echo "  - INTEGRATION_TEST_GUIDE.md"

# README.mdから結合テスト部分のみを抜粋
if [ -f "README.md" ]; then
    # 簡易版READMEを作成（結合テスト部分のみ）
    cat > $TEMP_DIR/README.md << 'EOF'
# Here's Me Server - Integration Tests

このパッケージには、Here's Me Serverの結合テストが含まれています。

## クイックスタート

1. リポジトリをクローン
2. このパッケージを展開
3. 依存パッケージをインストール
4. 結合テストを実行

詳細は **INTEGRATION_TEST_GUIDE.md** を参照してください。

## 実行手順

詳細な手順は別紙 **結合テスト実行手順.md** を参照してください。

## ドキュメント

- `INTEGRATION_TEST_GUIDE.md` - 結合テスト実行ガイド
- `tests/integration/java/README.md` - Java結合テスト詳細
- `tests/integration/java/KNOWN_BUGS.md` - 既知の不具合
- `tests/integration/java/TEST_EXECUTION_REPORT.md` - テスト実行レポート
EOF
    echo "  - README.md (generated)"
fi

# ========================================
# 不要なファイルを削除
# ========================================
echo -e "${GREEN}Cleaning up unnecessary files...${NC}"

# node_modules があれば削除
if [ -d "$TEMP_DIR/node_modules" ]; then
    rm -rf $TEMP_DIR/node_modules
    echo "  - Removed node_modules/"
fi

# .git ディレクトリがあれば削除
if [ -d "$TEMP_DIR/.git" ]; then
    rm -rf $TEMP_DIR/.git
    echo "  - Removed .git/"
fi

# ========================================
# ZIPファイル作成
# ========================================
echo ""
echo -e "${GREEN}Creating ZIP archive...${NC}"

cd $TEMP_DIR
zip -r ../$ZIP_NAME . -q
cd ..

ZIP_SIZE=$(du -h $ZIP_NAME | cut -f1)
echo -e "${GREEN}✓ Created: $ZIP_NAME ($ZIP_SIZE)${NC}"

# ========================================
# クリーンアップ
# ========================================
echo -e "${GREEN}Cleaning up temporary directory...${NC}"
rm -rf $TEMP_DIR

# ========================================
# 完了メッセージ
# ========================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Package created successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "File: $ZIP_NAME"
echo "Size: $ZIP_SIZE"
echo ""
echo "Next steps:"
echo "1. Create '結合テスト実行手順.md' document"
echo "2. Move both files to ref-integration/ directory"
echo "3. Test the package in a clean environment"
echo ""
