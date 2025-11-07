-- ============================================================
-- テストデータ投入スクリプト
-- ============================================================
-- ファイル名: test-data-setup.sql
-- 目的: 結合テスト用のマスタ・トランザクションデータを投入
-- 実行環境: heresme_test データベース
-- 実行方法: psql heresme_test < scripts/test-data-setup.sql
-- 作成日: 2025-11-06
-- ============================================================

-- トランザクション開始
BEGIN;

-- ============================================================
-- 1. マスタデータ投入
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 企業マスタ (companies)
-- ------------------------------------------------------------
INSERT INTO companies (company_id, name, created_at, updated_at) VALUES
  ('company001', 'テスト株式会社', NOW(), NOW()),
  ('company002', 'サンプル株式会社', NOW(), NOW())
ON CONFLICT (company_id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 1.2 部署マスタ (sections)
-- ------------------------------------------------------------
INSERT INTO sections (section_id, company_id, name, created_at, updated_at) VALUES
  ('section001', 'company001', '開発部', NOW(), NOW()),
  ('section002', 'company001', '営業部', NOW(), NOW()),
  ('section003', 'company001', '総務部', NOW(), NOW())
ON CONFLICT (section_id, company_id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 1.3 グループマスタ (groups)
-- ------------------------------------------------------------
INSERT INTO groups (group_id, company_id, section_id, name, created_at, updated_at) VALUES
  ('group001', 'company001', 'section001', '開発1グループ', NOW(), NOW()),
  ('group002', 'company001', 'section001', '開発2グループ', NOW(), NOW()),
  ('group003', 'company001', 'section002', '営業1グループ', NOW(), NOW())
ON CONFLICT (group_id, company_id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 1.4 ユーザマスタ (users)
-- 
-- 注意: パスワードは事前に暗号化すること
-- 例: java -classpath util EncDec enc test123
-- 
-- 現在のパスワード: test123 (暗号化前)
-- 暗号化後の値は実際の EncDec 出力に置き換えること
-- ------------------------------------------------------------
INSERT INTO users (user_id, company_id, section_id, group_id, name, email, passwd, role, created_at, updated_at) VALUES
  ('user001', 'company001', 'section001', 'group001', 'テストユーザー1', 'user001@example.com', 'ENCRYPTED_PASSWORD_HERE_001', 'user', NOW(), NOW()),
  ('user002', 'company001', 'section001', 'group001', 'テストユーザー2', 'user002@example.com', 'ENCRYPTED_PASSWORD_HERE_002', 'user', NOW(), NOW()),
  ('user003', 'company001', 'section002', 'group003', 'テストユーザー3', 'user003@example.com', 'ENCRYPTED_PASSWORD_HERE_003', 'user', NOW(), NOW()),
  ('admin001', 'company001', 'section003', NULL, '管理者ユーザー', 'admin001@example.com', 'ENCRYPTED_PASSWORD_HERE_ADMIN', 'admin', NOW(), NOW())
ON CONFLICT (user_id, company_id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  passwd = EXCLUDED.passwd,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 1.5 位置情報マスタ (geolocation)
-- 
-- 座標: 東京駅周辺のサンプル座標
-- 半径: メートル単位
-- ------------------------------------------------------------
INSERT INTO geolocation (id, company_id, section_id, group_id, name, latitude, longitude, radius, created_at, updated_at) VALUES
  (1, 'company001', NULL, 'group001', '本社オフィス', 35.6812, 139.7671, 100, NOW(), NOW()),
  (2, 'company001', NULL, 'group001', '支社オフィス', 35.6895, 139.6917, 50, NOW(), NOW()),
  (3, 'company001', 'section002', NULL, '営業拠点', 35.6586, 139.7454, 80, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius = EXCLUDED.radius,
  updated_at = NOW();

-- ============================================================
-- 2. トランザクションデータ投入
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 勤務ログデータ (telework_log)
-- 
-- IT-001, IT-002 テストケース用
-- 前日の勤務データを投入（日またぎテスト用）
-- ------------------------------------------------------------

-- 前日の勤務開始データ（23:00）
INSERT INTO telework_log (
  id,
  user_id,
  company_id,
  log_date,
  log_time,
  category,
  latitude,
  longitude,
  linked_date,
  updated,
  created_at
) VALUES
  (1, 'user001', 'company001', CURRENT_DATE - INTERVAL '1 day', '23:00:00', 1, 35.6812, 139.7671, CURRENT_DATE - INTERVAL '1 day', 0, NOW()),
  (2, 'user002', 'company001', CURRENT_DATE - INTERVAL '1 day', '09:00:00', 1, 35.6812, 139.7671, CURRENT_DATE - INTERVAL '1 day', 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- category の定義:
-- 1: 勤務開始 (TELEWORK_CATEGORY_START)
-- 2: 離席 (TELEWORK_CATEGORY_LEAVE)
-- 3: 復席 (TELEWORK_CATEGORY_RETURN)
-- 4: 勤務終了 (TELEWORK_CATEGORY_END)

-- updated の定義:
-- 0: TELEWORK_DATA_INITIAL (初期状態)
-- 1: TELEWORK_DATA_UPDATED (更新済み)

-- ------------------------------------------------------------
-- 2.2 位置情報履歴データ (geolocation_history)
-- 
-- IT-010, E2E-001 テストケース用
-- ------------------------------------------------------------
INSERT INTO geolocation_history (
  id,
  user_id,
  company_id,
  latitude,
  longitude,
  recorded_at,
  created_at
) VALUES
  (1, 'user001', 'company001', 35.6812, 139.7671, NOW() - INTERVAL '1 hour', NOW()),
  (2, 'user002', 'company001', 35.6895, 139.6917, NOW() - INTERVAL '30 minutes', NOW())
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 2.3 所在情報データ (whereabouts)
-- 
-- E2E-002 テストケース用
-- ------------------------------------------------------------
INSERT INTO whereabouts (
  id,
  user_id,
  company_id,
  status,
  location_id,
  last_updated,
  created_at
) VALUES
  (1, 'user001', 'company001', 'office', 1, NOW(), NOW()),
  (2, 'user002', 'company001', 'office', 2, NOW(), NOW()),
  (3, 'user003', 'company001', 'remote', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- status の定義:
-- 'office': オフィス出勤
-- 'remote': リモートワーク
-- 'leave': 離席中
-- 'absent': 不在

-- ============================================================
-- 3. シーケンス調整
-- ============================================================

-- ID 自動採番のシーケンスを最大値+1に設定
SELECT setval('telework_log_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM telework_log), false);
SELECT setval('geolocation_history_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM geolocation_history), false);
SELECT setval('whereabouts_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM whereabouts), false);

-- ============================================================
-- 4. データ確認
-- ============================================================

-- 投入データ件数確認
DO $$
DECLARE
  company_count INT;
  user_count INT;
  geolocation_count INT;
  telework_count INT;
BEGIN
  SELECT COUNT(*) INTO company_count FROM companies WHERE company_id LIKE 'company%';
  SELECT COUNT(*) INTO user_count FROM users WHERE user_id LIKE 'user%' OR user_id LIKE 'admin%';
  SELECT COUNT(*) INTO geolocation_count FROM geolocation WHERE company_id = 'company001';
  SELECT COUNT(*) INTO telework_count FROM telework_log WHERE user_id LIKE 'user%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'テストデータ投入完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '企業マスタ: % 件', company_count;
  RAISE NOTICE 'ユーザマスタ: % 件', user_count;
  RAISE NOTICE '位置情報マスタ: % 件', geolocation_count;
  RAISE NOTICE '勤務ログ: % 件', telework_count;
  RAISE NOTICE '========================================';
END $$;

-- コミット
COMMIT;

-- ============================================================
-- 使用方法
-- ============================================================
-- 
-- 1. パスワード暗号化
-- $ java -classpath util EncDec enc test123
-- [暗号化結果をコピー]
--
-- 2. 暗号化パスワードをスクリプトに反映
-- ENCRYPTED_PASSWORD_HERE_001 を実際の暗号化結果に置き換え
--
-- 3. スクリプト実行
-- $ psql heresme_test < scripts/test-data-setup.sql
--
-- 4. データ確認
-- $ psql heresme_test -c "SELECT user_id, name FROM users WHERE user_id LIKE 'user%';"
--
-- ============================================================

-- ============================================================
-- トラブルシューティング
-- ============================================================
-- 
-- Q: "relation does not exist" エラーが出る
-- A: スキーマが適用されているか確認
--    $ psql heresme_test < schema/heresme_schema.sql
--
-- Q: "duplicate key value" エラーが出る
-- A: ON CONFLICT 句で対応済み。既存データは更新される
--
-- Q: パスワードで認証できない
-- A: 暗号化パスワードが正しいか確認
--    $ java -classpath util EncDec dec [暗号化パスワード]
--
-- ============================================================
