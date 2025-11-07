// ============================================================
// Node.js - Java 連携テストスクリプト
// ============================================================
// ファイル名: test-java-integration.js
// 目的: Node.js の child_process から Java EncDec を呼び出す結合テスト
// 実行方法: node test-java-integration.js
// 作成日: 2025-11-06
// ============================================================

const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// テスト結果カウンター
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ============================================================
// ユーティリティ関数
// ============================================================

function logInfo(message) {
  console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function testHeader(testName) {
  console.log('');
  console.log('========================================');
  console.log(testName);
  console.log('========================================');
  totalTests++;
}

function testPass(message) {
  logSuccess(`✓ PASS: ${message}`);
  passedTests++;
}

function testFail(message) {
  logError(`✗ FAIL: ${message}`);
  failedTests++;
}

// ============================================================
// IT-J010: Node.js連携テスト
// ============================================================

async function testJavaIntegration() {
  testHeader('IT-J010: Node.js - Java 連携テスト');
  
  const classPath = path.resolve(__dirname + '/../../../util');
  logInfo(`Class path: ${classPath}`);
  
  // テストケース定義
  const testCases = [
    { 
      password: 'test123', 
      description: '通常のパスワード' 
    },
    { 
      password: 'P@ssw0rd!', 
      description: '特殊文字を含むパスワード' 
    },
    { 
      password: 'パスワード', 
      description: '日本語パスワード' 
    },
    { 
      password: 'a'.repeat(128), 
      description: '長いパスワード（128文字）' 
    },
    {
      password: 'pass word',
      description: 'スペースを含むパスワード'
    },
    {
      password: '',
      description: '空文字列'
    }
  ];
  
  for (const testCase of testCases) {
    console.log('');
    logInfo(`Test: ${testCase.description}`);
    logInfo(`  Input: "${testCase.password.substring(0, 20)}${testCase.password.length > 20 ? '...' : ''}"`);
    
    try {
      // 暗号化
      const encCmd = `java -classpath "${classPath}" EncDec enc "${testCase.password.replace(/"/g, '\\"')}"`;
      logInfo(`  Executing: ${encCmd.substring(0, 80)}...`);
      
      const { stdout: encStdout, stderr: encStderr } = await execPromise(encCmd);
      
      if (encStderr && encStderr.trim() !== '') {
        logError(`  Encryption stderr: ${encStderr}`);
        testFail(`${testCase.description} - 暗号化時にstderrが出力されました`);
        continue;
      }
      
      const encrypted = encStdout.trim();
      logInfo(`  Encrypted: ${encrypted.substring(0, 30)}... (length: ${encrypted.length})`);
      
      // 復号化
      const decCmd = `java -classpath "${classPath}" EncDec dec "${encrypted}"`;
      const { stdout: decStdout, stderr: decStderr } = await execPromise(decCmd);
      
      if (decStderr && decStderr.trim() !== '') {
        logError(`  Decryption stderr: ${decStderr}`);
        testFail(`${testCase.description} - 復号化時にstderrが出力されました`);
        continue;
      }
      
      const decrypted = decStdout.trim();
      logInfo(`  Decrypted: "${decrypted.substring(0, 20)}${decrypted.length > 20 ? '...' : ''}"`);
      
      // 検証
      if (decrypted === testCase.password) {
        testPass(`${testCase.description} - 往復成功`);
      } else {
        logError(`  Expected: "${testCase.password}"`);
        logError(`  Actual:   "${decrypted}"`);
        logError(`  Length - Expected: ${testCase.password.length}, Actual: ${decrypted.length}`);
        testFail(`${testCase.description} - 復号化結果が一致しません`);
      }
      
    } catch (error) {
      logError(`  Exception: ${error.message}`);
      if (error.stderr) {
        logError(`  Stderr: ${error.stderr}`);
      }
      testFail(`${testCase.description} - 例外が発生しました`);
    }
  }
}

// ============================================================
// 改行コードの処理テスト
// ============================================================

async function testNewlineHandling() {
  testHeader('改行コードの処理テスト');
  
  const classPath = path.resolve(__dirname + '/../../../util');
  
  logInfo('stdoutに改行コードが含まれているか確認');
  
  try {
    const testPassword = 'test123';
    const encCmd = `java -classpath "${classPath}" EncDec enc "${testPassword}"`;
    const { stdout: encStdout } = await execPromise(encCmd);
    
    // 改行コードの確認
    const hasNewline = encStdout.includes('\n') || encStdout.includes('\r');
    
    if (hasNewline) {
      logInfo('  改行コードが含まれています（正常）');
      logInfo('  trim()で除去されることを確認');
      
      const encrypted = encStdout.trim();
      const decCmd = `java -classpath "${classPath}" EncDec dec "${encrypted}"`;
      const { stdout: decStdout } = await execPromise(decCmd);
      const decrypted = decStdout.trim();
      
      if (decrypted === testPassword) {
        testPass('改行コードが正しく処理されました');
      } else {
        testFail('改行コード処理後に復号化が失敗しました');
      }
    } else {
      logInfo('  改行コードは含まれていません');
      testPass('改行コードなし（問題なし）');
    }
    
  } catch (error) {
    logError(`  Exception: ${error.message}`);
    testFail('改行コード処理テストで例外が発生しました');
  }
}

// ============================================================
// エラーハンドリングテスト
// ============================================================

async function testErrorHandling() {
  testHeader('エラーハンドリングテスト');
  
  const classPath = path.resolve(__dirname + '/../../../util');
  
  // 不正なコマンド
  logInfo('Test 1: 不正なコマンド引数');
  try {
    await execPromise(`java -classpath "${classPath}" EncDec xxx "test"`);
    testFail('不正なコマンドが成功してしまいました');
  } catch (error) {
    logInfo(`  正しくエラーになりました: ${error.message.substring(0, 50)}...`);
    testPass('不正なコマンドが正しく拒否されました');
  }
  
  // 不正な暗号化文字列
  logInfo('Test 2: 不正な暗号化文字列の復号化');
  try {
    await execPromise(`java -classpath "${classPath}" EncDec dec "invalid_base64"`);
    testFail('不正な暗号化文字列の復号化が成功してしまいました');
  } catch (error) {
    logInfo(`  正しくエラーになりました: ${error.message.substring(0, 50)}...`);
    testPass('不正な暗号化文字列が正しく拒否されました');
  }
}

// ============================================================
// パフォーマンステスト
// ============================================================

async function testPerformance() {
  testHeader('パフォーマンステスト（簡易版）');
  
  const classPath = path.resolve(__dirname + '/../../../util');
  const iterations = 10;
  
  logInfo(`${iterations}回の往復処理を実行`);
  
  const startTime = Date.now();
  
  try {
    for (let i = 0; i < iterations; i++) {
      const testPassword = `password${i}`;
      
      // 暗号化
      const encCmd = `java -classpath "${classPath}" EncDec enc "${testPassword}"`;
      const { stdout: encStdout } = await execPromise(encCmd);
      const encrypted = encStdout.trim();
      
      // 復号化
      const decCmd = `java -classpath "${classPath}" EncDec dec "${encrypted}"`;
      const { stdout: decStdout } = await execPromise(decCmd);
      const decrypted = decStdout.trim();
      
      if (decrypted !== testPassword) {
        testFail(`iteration ${i}: パスワード不一致`);
        return;
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;
    
    logInfo(`  総実行時間: ${duration}ms`);
    logInfo(`  平均時間: ${avgTime.toFixed(2)}ms per operation`);
    
    if (avgTime < 200) {
      testPass(`パフォーマンステスト成功 (平均: ${avgTime.toFixed(2)}ms)`);
    } else {
      logError(`  パフォーマンス目標未達成（目標: < 200ms, 実測: ${avgTime.toFixed(2)}ms）`);
      testFail('パフォーマンステスト失敗');
    }
    
  } catch (error) {
    logError(`  Exception: ${error.message}`);
    testFail('パフォーマンステストで例外が発生しました');
  }
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  console.log('============================================================');
  console.log('Node.js - Java 連携テスト実行');
  console.log(`実行日時: ${new Date().toISOString()}`);
  console.log('============================================================');
  
  // 環境確認
  logInfo(`Node.js version: ${process.version}`);
  logInfo(`Platform: ${process.platform}`);
  logInfo(`Working directory: ${process.cwd()}`);
  
  // EncDec.class 存在確認
  const fs = require('fs');
  const encDecPath = path.resolve(__dirname + '/../../../util/EncDec.class');
  
  if (!fs.existsSync(encDecPath)) {
    logError(`EncDec.class not found at: ${encDecPath}`);
    logError('Please build the Java source first.');
    process.exit(1);
  }
  
  logSuccess(`EncDec.class found at: ${encDecPath}`);
  
  // テスト実行
  try {
    await testJavaIntegration();
    await testNewlineHandling();
    await testErrorHandling();
    await testPerformance();
    
    // 結果サマリー
    console.log('');
    console.log('============================================================');
    console.log('テスト結果サマリー');
    console.log('============================================================');
    console.log(`総テスト数:   ${totalTests}`);
    console.log(`成功:         ${passedTests}`);
    console.log(`失敗:         ${failedTests}`);
    console.log('============================================================');
    
    if (failedTests === 0) {
      logSuccess('全てのテストが成功しました！');
      console.log('');
      logSuccess('Node.js - Java 連携: 正常');
      process.exit(0);
    } else {
      logError(`${failedTests} 個のテストが失敗しました`);
      console.log('');
      logError('Node.js - Java 連携: 異常');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// スクリプト実行
main();
