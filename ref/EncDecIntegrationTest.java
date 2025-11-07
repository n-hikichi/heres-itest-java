// ============================================================
// JUnit 5 統合テストサンプル
// ============================================================
// ファイル名: src/test/java/com/micros/util/EncDecIntegrationTest.java
// 対象: IT-J001～IT-J009（Java結合テスト）
// ============================================================

package com.micros.util;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import static org.junit.jupiter.api.Assertions.*;

/**
 * EncDec 統合テスト
 * 
 * コマンドライン経由でEncDecを実行する統合テスト
 * 単体テストとは異なり、実際のJavaコマンド実行を検証
 */
@Tag("integration")
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EncDecIntegrationTest {
    
    private static final String CLASS_PATH = "util";
    
    @BeforeAll
    static void setUp() {
        System.out.println("========================================");
        System.out.println("Java統合テスト開始");
        System.out.println("========================================");
        
        // EncDec.class 存在確認
        String encDecPath = CLASS_PATH + "/EncDec.class";
        java.io.File file = new java.io.File(encDecPath);
        if (!file.exists()) {
            fail("EncDec.class not found at: " + encDecPath);
        }
        System.out.println("✓ EncDec.class確認: " + encDecPath);
    }
    
    // ========================================
    // IT-J001: コマンドライン暗号化
    // ========================================
    
    @Test
    @Order(1)
    @DisplayName("IT-J001: コマンドライン暗号化（正常系）")
    void testCommandLineEncryption() throws Exception {
        String plainText = "test123";
        
        String encrypted = executeJavaCommand("enc", plainText);
        
        assertNotNull(encrypted, "暗号化結果がnullです");
        assertFalse(encrypted.isEmpty(), "暗号化結果が空です");
        assertTrue(encrypted.length() > plainText.length(), 
            "暗号化結果が元のテキストより短いです");
        
        System.out.println("  ✓ 暗号化成功: " + encrypted.substring(0, 20) + "...");
    }
    
    // ========================================
    // IT-J002: コマンドライン復号化
    // ========================================
    
    @Test
    @Order(2)
    @DisplayName("IT-J002: コマンドライン復号化（正常系）")
    void testCommandLineDecryption() throws Exception {
        String plainText = "test123";
        
        // 暗号化
        String encrypted = executeJavaCommand("enc", plainText);
        
        // 復号化
        String decrypted = executeJavaCommand("dec", encrypted);
        
        assertEquals(plainText, decrypted, "復号化結果が一致しません");
        
        System.out.println("  ✓ 復号化成功: " + decrypted);
    }
    
    // ========================================
    // IT-J003: 往復テスト
    // ========================================
    
    @ParameterizedTest
    @Order(3)
    @DisplayName("IT-J003: 暗号化→復号化 往復テスト")
    @ValueSource(strings = {
        "test123",
        "password",
        "P@ssw0rd!",
        "12345678",
        "a",
        "pass word"
    })
    void testEncryptDecryptRoundTrip(String password) throws Exception {
        System.out.println("  Testing: " + password);
        
        String encrypted = executeJavaCommand("enc", password);
        String decrypted = executeJavaCommand("dec", encrypted);
        
        assertEquals(password, decrypted, 
            "往復テスト失敗: expected=" + password + ", actual=" + decrypted);
        
        System.out.println("    ✓ OK");
    }
    
    // ========================================
    // IT-J004: 特殊文字を含むパスワード
    // ========================================
    
    @ParameterizedTest
    @Order(4)
    @DisplayName("IT-J004: 特殊文字を含むパスワード")
    @ValueSource(strings = {
        "p@ssw0rd",
        "test!@#$%",
        "pass'word",
        "pass word"
    })
    void testSpecialCharacters(String password) throws Exception {
        System.out.println("  Testing special chars: " + password);
        
        String encrypted = executeJavaCommand("enc", password);
        String decrypted = executeJavaCommand("dec", encrypted);
        
        assertEquals(password, decrypted);
        System.out.println("    ✓ OK");
    }
    
    // ========================================
    // IT-J005: マルチバイト文字
    // ========================================
    
    @ParameterizedTest
    @Order(5)
    @DisplayName("IT-J005: マルチバイト文字（日本語）")
    @ValueSource(strings = {
        "パスワード",
        "ひらがな",
        "カタカナ",
        "漢字混在パスワード123"
    })
    void testMultibyteCharacters(String password) throws Exception {
        System.out.println("  Testing multibyte: " + password);
        
        String encrypted = executeJavaCommand("enc", password);
        String decrypted = executeJavaCommand("dec", encrypted);
        
        assertEquals(password, decrypted);
        System.out.println("    ✓ OK");
    }
    
    // ========================================
    // IT-J006: 長いパスワード
    // ========================================
    
    @ParameterizedTest
    @Order(6)
    @DisplayName("IT-J006: 長いパスワード（境界値）")
    @CsvSource({
        "1",
        "13",
        "64",
        "128",
        "256"
    })
    void testLongPasswords(int length) throws Exception {
        System.out.println("  Testing length: " + length);
        
        String password = "a".repeat(length);
        
        String encrypted = executeJavaCommand("enc", password);
        String decrypted = executeJavaCommand("dec", encrypted);
        
        assertEquals(password, decrypted);
        System.out.println("    ✓ OK (encrypted length: " + encrypted.length() + ")");
    }
    
    // ========================================
    // IT-J007: 不正なコマンド引数
    // ========================================
    
    @Test
    @Order(7)
    @DisplayName("IT-J007: 不正なコマンド引数（異常系）")
    void testInvalidCommandArguments() {
        System.out.println("  Test 1: 不正なコマンド");
        
        // 不正なコマンド
        assertThrows(Exception.class, () -> {
            executeJavaCommand("xxx", "test");
        }, "不正なコマンドがエラーにならない");
        
        System.out.println("    ✓ 正しくエラーになりました");
    }
    
    // ========================================
    // IT-J008: 不正な暗号化文字列の復号化
    // ========================================
    
    @ParameterizedTest
    @Order(8)
    @DisplayName("IT-J008: 不正な暗号化文字列の復号化")
    @ValueSource(strings = {
        "これはBase64ではない",
        "abc",
        "aGVsbG8"
    })
    void testInvalidEncryptedString(String invalidData) {
        System.out.println("  Testing invalid data: " + invalidData);
        
        assertThrows(Exception.class, () -> {
            executeJavaCommand("dec", invalidData);
        }, "不正なデータが復号化できてしまいました");
        
        System.out.println("    ✓ 正しく拒否されました");
    }
    
    // ========================================
    // ヘルパーメソッド
    // ========================================
    
    /**
     * Javaコマンドを実行して結果を取得
     * 
     * @param command "enc" または "dec"
     * @param text 暗号化/復号化対象のテキスト
     * @return 実行結果（標準出力）
     * @throws Exception 実行エラー
     */
    private String executeJavaCommand(String command, String text) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            "java",
            "-classpath",
            CLASS_PATH,
            "EncDec",
            command,
            text
        );
        
        Process process = pb.start();
        
        // 標準出力を読み取り
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line);
            }
        }
        
        // 標準エラー出力を読み取り
        StringBuilder error = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getErrorStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                error.append(line).append("\n");
            }
        }
        
        int exitCode = process.waitFor();
        
        if (exitCode != 0) {
            throw new Exception("Java command failed with exit code " + exitCode + 
                "\nStderr: " + error.toString());
        }
        
        if (error.length() > 0 && !error.toString().trim().isEmpty()) {
            System.err.println("Warning - stderr output: " + error.toString());
        }
        
        return output.toString().trim();
    }
    
    @AfterAll
    static void tearDown() {
        System.out.println("========================================");
        System.out.println("Java統合テスト完了");
        System.out.println("========================================");
    }
}
