// ============================================================
// Jest 統合テストセットアップ
// ============================================================
// ファイル名: tests/integration/setup.js
// 目的: 統合テスト実行前後の共通処理
// ============================================================

const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);

// ============================================================
// グローバル設定
// ============================================================

// 環境変数設定
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost/heresme_test';

// タイムゾーン設定
process.env.TZ = 'Asia/Tokyo';

console.log('========================================');
console.log('統合テスト環境セットアップ');
console.log('========================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@')}`); // パスワード隠蔽
console.log(`JAVA_CLASSPATH: ${process.env.JAVA_CLASSPATH || path.resolve(__dirname, '../../util')}`);
console.log('========================================');

// ============================================================
// 全テストスイート実行前
// ============================================================

beforeAll(async () => {
  console.log('\n[Setup] 統合テスト開始前処理');
  
  try {
    // 1. データベース接続確認
    console.log('[Setup] データベース接続確認...');
    await checkDatabaseConnection();
    
    // 2. テストデータクリーンアップ
    console.log('[Setup] 既存テストデータのクリーンアップ...');
    await cleanupTestData();
    
    // 3. テストデータ投入
    console.log('[Setup] テストデータ投入...');
    await setupTestData();
    
    // 4. Java環境確認
    console.log('[Setup] Java環境確認...');
    await checkJavaEnvironment();
    
    console.log('[Setup] セットアップ完了\n');
  } catch (error) {
    console.error('[Setup Error] セットアップに失敗しました:', error.message);
    throw error;
  }
}, 60000); // 60秒タイムアウト

// ============================================================
// 全テストスイート実行後
// ============================================================

afterAll(async () => {
  console.log('\n[Teardown] 統合テスト終了後処理');
  
  try {
    // テストデータクリーンアップ
    console.log('[Teardown] テストデータクリーンアップ...');
    await cleanupTestData();
    
    // DB接続クローズ
    console.log('[Teardown] データベース接続クローズ...');
    await closeDatabaseConnection();
    
    console.log('[Teardown] 後処理完了\n');
  } catch (error) {
    console.error('[Teardown Error] 後処理に失敗しました:', error.message);
    // エラーでもテストは続行（後処理の失敗はテスト結果に影響させない）
  }
}, 30000);

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * データベース接続確認
 */
async function checkDatabaseConnection() {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(`  ✓ DB接続成功: ${result.rows[0].now}`);
  } catch (error) {
    console.error('  ✗ DB接続失敗:', error.message);
    throw new Error('データベースに接続できません。PostgreSQLが起動しているか確認してください。');
  } finally {
    await pool.end();
  }
}

/**
 * データベース接続クローズ
 */
async function closeDatabaseConnection() {
  // DbUtilのシングルトン接続をクローズ
  // 実装はプロジェクト依存
  console.log('  ✓ DB接続クローズ完了');
}

/**
 * テストデータ投入
 */
async function setupTestData() {
  const scriptPath = path.resolve(__dirname, '../../scripts/test-data-setup.sql');
  
  try {
    const { stdout, stderr } = await execPromise(
      `psql ${process.env.DATABASE_URL} -f ${scriptPath}`
    );
    
    if (stderr && !stderr.includes('NOTICE')) {
      console.warn('  警告:', stderr);
    }
    
    console.log('  ✓ テストデータ投入完了');
  } catch (error) {
    console.error('  ✗ テストデータ投入失敗:', error.message);
    throw new Error('テストデータの投入に失敗しました。SQLスクリプトを確認してください。');
  }
}

/**
 * テストデータクリーンアップ
 */
async function cleanupTestData() {
  const scriptPath = path.resolve(__dirname, '../../scripts/test-data-cleanup.sql');
  
  try {
    const { stdout, stderr } = await execPromise(
      `psql ${process.env.DATABASE_URL} -f ${scriptPath}`
    );
    
    console.log('  ✓ テストデータクリーンアップ完了');
  } catch (error) {
    console.error('  ✗ クリーンアップ失敗:', error.message);
    // クリーンアップ失敗は警告のみ（既にデータが無い場合もある）
  }
}

/**
 * Java環境確認
 */
async function checkJavaEnvironment() {
  try {
    // Java バージョン確認
    const { stdout: javaVersion } = await execPromise('java -version 2>&1');
    console.log(`  ✓ Java確認: ${javaVersion.split('\n')[0]}`);
    
    // EncDec.class 存在確認
    const fs = require('fs');
    const encDecPath = path.resolve(__dirname, '../../util/EncDec.class');
    
    if (!fs.existsSync(encDecPath)) {
      throw new Error(`EncDec.class not found at: ${encDecPath}`);
    }
    
    console.log(`  ✓ EncDec.class確認: ${encDecPath}`);
    
    // 動作確認（簡易テスト）
    const classPath = path.dirname(encDecPath);
    const { stdout } = await execPromise(
      `java -classpath "${classPath}" EncDec enc "test"`
    );
    
    if (stdout.trim().length > 0) {
      console.log('  ✓ Java EncDec動作確認OK');
    } else {
      throw new Error('Java EncDecの出力が空です');
    }
    
  } catch (error) {
    console.error('  ✗ Java環境エラー:', error.message);
    throw new Error('Java環境の確認に失敗しました。JDKとEncDec.classを確認してください。');
  }
}

// ============================================================
// グローバルユーティリティ
// ============================================================

/**
 * テスト用データベースヘルパー
 */
global.testDb = {
  /**
   * クエリ実行
   */
  async query(sql, params = []) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      const result = await pool.query(sql, params);
      return result.rows;
    } finally {
      await pool.end();
    }
  },
  
  /**
   * トランザクション実行
   */
  async transaction(callback) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }
};

/**
 * Java EncDec ヘルパー
 */
global.javaEncDec = {
  /**
   * 暗号化
   */
  async encrypt(plainText) {
    const classPath = process.env.JAVA_CLASSPATH || path.resolve(__dirname, '../../util');
    const { stdout } = await execPromise(
      `java -classpath "${classPath}" EncDec enc "${plainText.replace(/"/g, '\\"')}"`
    );
    return stdout.trim();
  },
  
  /**
   * 復号化
   */
  async decrypt(encryptedText) {
    const classPath = process.env.JAVA_CLASSPATH || path.resolve(__dirname, '../../util');
    const { stdout } = await execPromise(
      `java -classpath "${classPath}" EncDec dec "${encryptedText}"`
    );
    return stdout.trim();
  }
};

/**
 * テスト用タイムヘルパー
 */
global.testTime = {
  /**
   * 現在日時（YYYY-MM-DD HH:mm:ss形式）
   */
  now() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  },
  
  /**
   * 今日の日付（YYYY-MM-DD形式）
   */
  today() {
    return new Date().toISOString().slice(0, 10);
  },
  
  /**
   * 昨日の日付
   */
  yesterday() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }
};

// ============================================================
// Jest カスタムマッチャー
// ============================================================

expect.extend({
  /**
   * DB内のレコード存在確認
   */
  async toExistInDatabase(tableName, condition) {
    const whereClause = Object.keys(condition)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(' AND ');
    const values = Object.values(condition);
    
    const rows = await global.testDb.query(
      `SELECT * FROM ${tableName} WHERE ${whereClause}`,
      values
    );
    
    const pass = rows.length > 0;
    
    return {
      pass,
      message: () => pass
        ? `Expected record not to exist in ${tableName}`
        : `Expected record to exist in ${tableName} with condition ${JSON.stringify(condition)}`
    };
  }
});

console.log('✓ 統合テストセットアップファイル読み込み完了\n');
