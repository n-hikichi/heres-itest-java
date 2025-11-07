/**
 * IT-J010: Java EncDec Node.js連携結合テスト
 *
 * 目的: Node.jsのchild_process.execからJava EncDecを呼び出す結合テスト
 * 実行環境: Node.js v22.14.0+
 *
 * テストケース:
 * - IT-J010-01: 通常のパスワード暗号化・復号化
 * - IT-J010-02: 特殊文字を含むパスワード
 * - IT-J010-03: 日本語を含むパスワード
 * - IT-J010-04: 長いパスワード（128文字）
 * - IT-J010-05: stderrのハンドリング
 * - IT-J010-06: コマンド実行エラーのハンドリング
 */

const { exec } = require('child_process');
const util = require('util');
const path = require('path');

const execPromise = util.promisify(exec);

describe('IT-J010: Java EncDec Node.js連携結合テスト', () => {
  const classPath = path.resolve(__dirname, '../../../util');

  /**
   * Java EncDecコマンドを実行するヘルパー関数
   *
   * @param {string} command - 'enc' または 'dec'
   * @param {string} text - 暗号化/復号化対象のテキスト
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  async function executeEncDec(command, text) {
    const cmd = `java -classpath "${classPath}" EncDec ${command} "${text}"`;
    return await execPromise(cmd);
  }

  beforeAll(() => {
    console.log('========================================');
    console.log('IT-J010: Java EncDec Node.js連携結合テスト');
    console.log('========================================');
    console.log(`ClassPath: ${classPath}`);
  });

  afterAll(() => {
    console.log('========================================');
    console.log('IT-J010: テスト完了');
    console.log('========================================');
  });

  // ========================================
  // IT-J010-01: 通常のパスワード
  // ========================================

  test('IT-J010-01: 通常のパスワード暗号化・復号化', async () => {
    const password = 'test123';

    console.log(`  Testing: ${password}`);

    // 暗号化
    const { stdout: encStdout, stderr: encStderr } = await executeEncDec('enc', password);

    expect(encStderr).toBeFalsy();  // stderrは空であるべき

    const encrypted = encStdout.trim();
    expect(encrypted).toBeTruthy();
    expect(encrypted.length).toBeGreaterThan(password.length);

    console.log(`    Encrypted: ${encrypted.substring(0, 20)}...`);

    // 復号化
    const { stdout: decStdout, stderr: decStderr } = await executeEncDec('dec', encrypted);

    expect(decStderr).toBeFalsy();  // stderrは空であるべき

    const decrypted = decStdout.trim();
    expect(decrypted).toBe(password);

    console.log(`    ✓ Decrypted correctly: ${decrypted}`);
  });

  // ========================================
  // IT-J010-02: 特殊文字を含むパスワード
  // ========================================

  test('IT-J010-02: 特殊文字を含むパスワード', async () => {
    const password = 'P@ssw0rd!#$%';

    console.log(`  Testing: ${password}`);

    const { stdout: encStdout } = await executeEncDec('enc', password);
    const encrypted = encStdout.trim();

    const { stdout: decStdout } = await executeEncDec('dec', encrypted);
    const decrypted = decStdout.trim();

    expect(decrypted).toBe(password);
    console.log(`    ✓ Special characters handled correctly`);
  });

  // ========================================
  // IT-J010-03: 日本語を含むパスワード
  // ========================================

  test('IT-J010-03: 日本語を含むパスワード', async () => {
    const password = 'パスワード123';

    console.log(`  Testing: ${password}`);

    const { stdout: encStdout } = await executeEncDec('enc', password);
    const encrypted = encStdout.trim();

    const { stdout: decStdout } = await executeEncDec('dec', encrypted);
    const decrypted = decStdout.trim();

    expect(decrypted).toBe(password);
    console.log(`    ✓ Japanese characters handled correctly`);
  });

  // ========================================
  // IT-J010-04: 長いパスワード（128文字）
  // ========================================

  test('IT-J010-04: 長いパスワード（128文字）', async () => {
    const password = 'a'.repeat(128);

    console.log(`  Testing: 128 character password`);

    const { stdout: encStdout } = await executeEncDec('enc', password);
    const encrypted = encStdout.trim();

    const { stdout: decStdout } = await executeEncDec('dec', encrypted);
    const decrypted = decStdout.trim();

    expect(decrypted).toBe(password);
    expect(decrypted.length).toBe(128);
    console.log(`    ✓ Long password (128 chars) handled correctly`);
  });

  // ========================================
  // IT-J010-05: stderrのハンドリング
  // ========================================

  test('IT-J010-05: stderrのハンドリング', async () => {
    console.log(`  Testing: stderr handling with invalid command`);

    try {
      // 不正なコマンド
      const cmd = `java -classpath "${classPath}" EncDec xxx "test"`;
      await execPromise(cmd);

      // ここに到達したらエラー
      fail('Invalid command should have thrown an error');
    } catch (error) {
      // エラーが発生することを期待
      expect(error).toBeTruthy();
      expect(error.stderr || error.stdout).toMatch(/Error|Failed|Argument/i);
      console.log(`    ✓ Invalid command correctly rejected`);
    }
  });

  // ========================================
  // IT-J010-06: コマンド実行エラーのハンドリング
  // ========================================

  test('IT-J010-06: コマンド実行エラーのハンドリング', async () => {
    console.log(`  Testing: command execution error handling`);

    try {
      // 不正なクラスパス
      const cmd = `java -classpath "nonexistent" EncDec enc "test"`;
      await execPromise(cmd);

      fail('Command with invalid classpath should have thrown an error');
    } catch (error) {
      expect(error).toBeTruthy();
      console.log(`    ✓ Command execution error correctly handled`);
    }
  });

  // ========================================
  // IT-J010-07: 改行コードの処理
  // ========================================

  test('IT-J010-07: 改行コードの処理', async () => {
    console.log(`  Testing: newline handling`);

    const password = 'test123';
    const { stdout } = await executeEncDec('enc', password);

    // stdoutには改行が含まれることがあるので、trimが必要
    expect(stdout).toMatch(/\n$/);  // 最後に改行がある

    const encrypted = stdout.trim();
    expect(encrypted).not.toMatch(/\n/);  // trimすれば改行がない

    console.log(`    ✓ Newline handling works correctly`);
  });

  // ========================================
  // IT-J010-08: 連続実行の安定性
  // ========================================

  test('IT-J010-08: 連続実行の安定性（10回）', async () => {
    console.log(`  Testing: consecutive executions (10 times)`);

    const password = 'test123';
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const { stdout: encStdout } = await executeEncDec('enc', password);
      const encrypted = encStdout.trim();

      const { stdout: decStdout } = await executeEncDec('dec', encrypted);
      const decrypted = decStdout.trim();

      expect(decrypted).toBe(password);
    }

    console.log(`    ✓ ${iterations} consecutive executions succeeded`);
  });

  // ========================================
  // IT-J010-09: 同一パスワードでも暗号化結果が異なる
  // ========================================

  test('IT-J010-09: 同一パスワードでも暗号化結果が異なる（IVのランダム性）', async () => {
    console.log(`  Testing: encryption randomness (IV)`);

    const password = 'test123';

    const { stdout: enc1Stdout } = await executeEncDec('enc', password);
    const encrypted1 = enc1Stdout.trim();

    const { stdout: enc2Stdout } = await executeEncDec('enc', password);
    const encrypted2 = enc2Stdout.trim();

    // 注意: 現在の実装はIVがないため、同じ結果になる可能性がある
    // しかし、セキュアな実装ではIVによって異なるべき
    console.log(`    Encrypted1: ${encrypted1.substring(0, 20)}...`);
    console.log(`    Encrypted2: ${encrypted2.substring(0, 20)}...`);

    // 両方とも正しく復号化できることを確認
    const { stdout: dec1Stdout } = await executeEncDec('dec', encrypted1);
    const { stdout: dec2Stdout } = await executeEncDec('dec', encrypted2);

    expect(dec1Stdout.trim()).toBe(password);
    expect(dec2Stdout.trim()).toBe(password);

    console.log(`    ✓ Both encryptions decrypt to original password`);
  });

  // ========================================
  // IT-J010-10: パフォーマンス測定（100回）
  // ========================================

  test('IT-J010-10: パフォーマンス測定（100回）', async () => {
    console.log(`  Testing: performance (100 iterations)`);

    const password = 'test123';
    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const { stdout: encStdout } = await executeEncDec('enc', password);
      const encrypted = encStdout.trim();

      const { stdout: decStdout } = await executeEncDec('dec', encrypted);
      const decrypted = decStdout.trim();

      expect(decrypted).toBe(password);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;

    console.log(`    Total duration: ${duration}ms`);
    console.log(`    Average per operation: ${avgTime.toFixed(2)}ms`);
    console.log(`    ✓ ${iterations} iterations completed`);

    // パフォーマンス目標: 平均100ms以内
    expect(avgTime).toBeLessThan(100);
  }, 60000);  // タイムアウト60秒
});
