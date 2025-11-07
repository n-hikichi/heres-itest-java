// ============================================================
// Jest 結合テストサンプル: IT-001
// ============================================================
// ファイル名: tests/integration/telework.integration.test.js
// 対象: IT-001 旧クライアント（ver2.0以前）からの勤務開始登録
// ============================================================

const path = require('path');

// モジュールのモックを無効化（実際のDB・Java連携を使用）
jest.unmock('../../models/telework');
jest.unmock('../../models/db-util');
jest.unmock('child_process');

describe('IT-001: 旧クライアント勤務開始登録', () => {
  let telework;
  
  beforeAll(() => {
    // テスト対象モジュールを読み込み
    telework = require('../../models/telework');
  });
  
  beforeEach(async () => {
    // 各テストケース前に前日データを投入
    await global.testDb.query(`
      INSERT INTO telework_log (user_id, company_id, log_date, category, linked_date, updated)
      VALUES ($1, $2, $3, 1, $3, 0)
      ON CONFLICT (user_id, company_id, log_date, category) 
      DO UPDATE SET updated = 0
    `, ['user001', 'company001', global.testTime.yesterday()]);
  });
  
  afterEach(async () => {
    // 各テストケース後にテストデータ削除
    await global.testDb.query(`
      DELETE FROM telework_log 
      WHERE user_id = $1 AND log_date = $2
    `, ['user001', global.testTime.today()]);
  });
  
  test('updated未指定で初期値0が設定される', async () => {
    // Arrange: 旧クライアントのペイロード（updated未指定）
    const payload = {
      userId: 'user001',
      companyId: 'company001',
      category: 1, // 勤務開始
      logDate: global.testTime.today(),
      latitude: 35.6812,
      longitude: 139.7671
      // updated: undefined ← 旧クライアントは未指定
    };
    
    // Act: 勤務ログ登録
    const result = await telework.insertTeleworkLogByMember(payload);
    
    // Assert: 登録成功
    expect(result.success).toBe(true);
    
    // Assert: DB確認
    const saved = await global.testDb.query(`
      SELECT * FROM telework_log
      WHERE user_id = $1 
        AND company_id = $2
        AND log_date = $3
        AND category = 1
    `, ['user001', 'company001', global.testTime.today()]);
    
    expect(saved.length).toBe(1);
    expect(saved[0].updated).toBe(0); // TELEWORK_DATA_INITIAL
    expect(saved[0].linked_date).toBe(global.testTime.today());
    expect(saved[0].latitude).toBeCloseTo(35.6812, 4);
    expect(saved[0].longitude).toBeCloseTo(139.7671, 4);
  });
  
  test('linked_date未指定でlog_dateが設定される', async () => {
    // Arrange
    const payload = {
      userId: 'user001',
      companyId: 'company001',
      category: 1,
      logDate: global.testTime.today(),
      latitude: 35.6812,
      longitude: 139.7671
      // linked_date: undefined ← 旧クライアントは未指定
    };
    
    // Act
    const result = await telework.insertTeleworkLogByMember(payload);
    
    // Assert
    expect(result.success).toBe(true);
    
    const saved = await global.testDb.query(`
      SELECT linked_date FROM telework_log
      WHERE user_id = $1 AND log_date = $2
    `, ['user001', global.testTime.today()]);
    
    // linked_dateがlog_dateと同じ値になっている
    expect(saved[0].linked_date).toBe(global.testTime.today());
  });
  
  test('緯度・経度が正しく記録される', async () => {
    // Arrange: 東京駅の座標
    const payload = {
      userId: 'user001',
      companyId: 'company001',
      category: 1,
      logDate: global.testTime.today(),
      latitude: 35.681236,
      longitude: 139.767125
    };
    
    // Act
    await telework.insertTeleworkLogByMember(payload);
    
    // Assert
    const saved = await global.testDb.query(`
      SELECT latitude, longitude FROM telework_log
      WHERE user_id = $1 AND log_date = $2
    `, ['user001', global.testTime.today()]);
    
    expect(saved[0].latitude).toBeCloseTo(35.681236, 5);
    expect(saved[0].longitude).toBeCloseTo(139.767125, 5);
  });
  
  test('カスタムマッチャー: DB存在確認', async () => {
    // Arrange & Act
    const payload = {
      userId: 'user001',
      companyId: 'company001',
      category: 1,
      logDate: global.testTime.today(),
      latitude: 35.6812,
      longitude: 139.7671
    };
    
    await telework.insertTeleworkLogByMember(payload);
    
    // Assert: カスタムマッチャーを使用
    await expect('telework_log').toExistInDatabase({
      user_id: 'user001',
      log_date: global.testTime.today(),
      category: 1
    });
  });
});

describe('IT-002: 旧クライアントからの日またぎ勤務登録', () => {
  let telework;
  
  beforeAll(() => {
    telework = require('../../models/telework');
  });
  
  beforeEach(async () => {
    // 前日23:00の勤務開始データを投入
    await global.testDb.query(`
      INSERT INTO telework_log (user_id, company_id, log_date, log_time, category, linked_date, updated)
      VALUES ($1, $2, $3, '23:00:00', 1, $3, 0)
      ON CONFLICT (user_id, company_id, log_date, category) 
      DO UPDATE SET log_time = '23:00:00'
    `, ['user001', 'company001', global.testTime.yesterday()]);
  });
  
  afterEach(async () => {
    // テストデータ削除
    await global.testDb.query(`
      DELETE FROM telework_log 
      WHERE user_id = $1 
        AND (log_date = $2 OR log_date = $3)
    `, ['user001', global.testTime.yesterday(), global.testTime.today()]);
  });
  
  test('日またぎ勤務でlinked_dateが前日になる', async () => {
    // Arrange: 翌日02:00の離席（日またぎ）
    const payload = {
      userId: 'user001',
      companyId: 'company001',
      category: 2, // 離席
      logDate: global.testTime.today(),
      logTime: '02:00:00',
      latitude: 35.6812,
      longitude: 139.7671
      // linked_date未指定
    };
    
    // Act
    const result = await telework.insertTeleworkLogByMember(payload);
    
    // Assert
    expect(result.success).toBe(true);
    
    const saved = await global.testDb.query(`
      SELECT linked_date FROM telework_log
      WHERE user_id = $1 
        AND log_date = $2
        AND category = 2
    `, ['user001', global.testTime.today()]);
    
    // linked_dateが前日の日付になっている
    expect(saved[0].linked_date).toBe(global.testTime.yesterday());
  });
});
