-- ============================================================
-- テストデータクリーンアップスクリプト
-- ============================================================
-- ファイル名: test-data-cleanup.sql
-- 目的: 結合テスト用のトランザクションデータを削除
-- 実行環境: heresme_test データベース
-- 実行方法: psql heresme_test < scripts/test-data-cleanup.sql
-- 作成日: 2025-11-06
-- ============================================================

-- トランザクション開始
BEGIN;

-- ============================================================
-- 注意事項
-- ============================================================
-- このスクリプトはトランザクションデータのみを削除します
-- マスタデータは次回のテストで再利用するため残します
-- 
-- 完全にクリーンアップしたい場合は、
-- test-data-full-cleanup.sql を使用してください
-- ============================================================

-- 削除前の件数確認
DO $$
DECLARE
  telework_before INT;
  geolocation_history_before INT;
  whereabouts_before INT;
BEGIN
  SELECT COUNT(*) INTO telework_before FROM telework_log WHERE user_id LIKE 'user%';
  SELECT COUNT(*) INTO geolocation_history_before FROM geolocation_history WHERE user_id LIKE 'user%';
  SELECT COUNT(*) INTO whereabouts_before FROM whereabouts WHERE user_id LIKE 'user%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '削除前のデータ件数';
  RAISE NOTICE '========================================';
  RAISE NOTICE '勤務ログ: % 件', telework_before;
  RAISE NOTICE '位置情報履歴: % 件', geolocation_history_before;
  RAISE NOTICE '所在情報: % 件', whereabouts_before;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================
-- 1. トランザクションデータ削除
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 勤務ログデータ削除 (telework_log)
-- ------------------------------------------------------------
DELETE FROM telework_log
WHERE user_id IN (
  SELECT user_id FROM users
  WHERE user_id LIKE 'user%' OR user_id LIKE 'admin%'
);

-- ------------------------------------------------------------
-- 1.2 位置情報履歴削除 (geolocation_history)
-- ------------------------------------------------------------
DELETE FROM geolocation_history
WHERE user_id IN (
  SELECT user_id FROM users
  WHERE user_id LIKE 'user%' OR user_id LIKE 'admin%'
);

-- ------------------------------------------------------------
-- 1.3 所在情報削除 (whereabouts)
-- ------------------------------------------------------------
DELETE FROM whereabouts
WHERE user_id IN (
  SELECT user_id FROM users
  WHERE user_id LIKE 'user%' OR user_id LIKE 'admin%'
);

-- ------------------------------------------------------------
-- 1.4 認証トークン削除（セッション情報）
-- ------------------------------------------------------------
-- テーブル存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_tokens') THEN
    DELETE FROM auth_tokens
    WHERE user_id IN (
      SELECT user_id FROM users
      WHERE user_id LIKE 'user%' OR user_id LIKE 'admin%'
    );
  END IF;
END $$;

-- ============================================================
-- 2. シーケンスリセット（オプション）
-- ============================================================
-- 
-- 注意: シーケンスをリセットすると、次回のデータ投入時に
-- ID が 1 から始まります。既存のマスタデータと ID が
-- 重複する可能性がある場合はコメントアウトしてください
-- 
-- SELECT setval('telework_log_id_seq', 1, false);
-- SELECT setval('geolocation_history_id_seq', 1, false);
-- SELECT setval('whereabouts_id_seq', 1, false);

-- ============================================================
-- 3. データ確認
-- ============================================================

-- 削除後の件数確認
DO $$
DECLARE
  telework_after INT;
  geolocation_history_after INT;
  whereabouts_after INT;
  users_remain INT;
BEGIN
  SELECT COUNT(*) INTO telework_after FROM telework_log WHERE user_id LIKE 'user%';
  SELECT COUNT(*) INTO geolocation_history_after FROM geolocation_history WHERE user_id LIKE 'user%';
  SELECT COUNT(*) INTO whereabouts_after FROM whereabouts WHERE user_id LIKE 'user%';
  SELECT COUNT(*) INTO users_remain FROM users WHERE user_id LIKE 'user%' OR user_id LIKE 'admin%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'クリーンアップ完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE '勤務ログ: % 件（削除済み）', telework_after;
  RAISE NOTICE '位置情報履歴: % 件（削除済み）', geolocation_history_after;
  RAISE NOTICE '所在情報: % 件（削除済み）', whereabouts_after;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'マスタデータ（残存）';
  RAISE NOTICE 'ユーザマスタ: % 件', users_remain;
  RAISE NOTICE '========================================';
  
  -- 検証: トランザクションデータが全て削除されたか確認
  IF telework_after = 0 AND geolocation_history_after = 0 AND whereabouts_after = 0 THEN
    RAISE NOTICE '✓ トランザクションデータの削除に成功しました';
  ELSE
    RAISE WARNING '⚠ 一部のトランザクションデータが残っています';
  END IF;
END $$;

-- コミット
COMMIT;

-- ============================================================
-- 使用方法
-- ============================================================
-- 
-- 【各テストケース実行後】
-- $ psql heresme_test < scripts/test-data-cleanup.sql
--
-- 【マスタデータも含めて完全削除したい場合】
-- $ psql heresme_test < scripts/test-data-full-cleanup.sql
--
-- 【削除確認】
-- $ psql heresme_test -c "SELECT COUNT(*) FROM telework_log WHERE user_id LIKE 'user%';"
--
-- ============================================================

-- ============================================================
-- トラブルシューティング
-- ============================================================
-- 
-- Q: "foreign key constraint" エラーが出る
-- A: 削除順序を確認。子テーブルから先に削除する必要がある
--
-- Q: マスタデータまで削除されてしまった
-- A: このスクリプトはトランザクションデータのみ削除
--    マスタデータは test-data-full-cleanup.sql で削除
--
-- Q: 削除後もデータが残っている
-- A: user_id の命名規則（user%, admin%）を確認
--
-- ============================================================
