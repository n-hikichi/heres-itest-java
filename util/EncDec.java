import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

import javax.crypto.BadPaddingException;
import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import javax.crypto.spec.SecretKeySpec;


/**
 * タイトル: 暗号化復号化クラス
 * 著作権:   Copyright (c) 2017
 * 会社名:   (株)ミクロスソフトウェア
 * @author   神 洋子
 * @version  1.0
 */
public class EncDec {

	public static void main(String argv[]) {
		EncDec encdec = new EncDec();

		if (argv.length != 2) {
			System.out.println("Crypt Failed - [Argument Number Error]");
			return;
		}

		try {
			if (argv[0].equals("enc")) {
				String enc = encdec.encrypt(argv[1]);
				System.out.println(enc);
			}
			else if (argv[0].equals("dec")) {
				String dec = encdec.decrypt(argv[1]);
				System.out.println(dec);
			}
			else {
				System.out.println("Crypt Failed - [Argument Error " + argv[0] + "]");
				return;
			}
		}
		catch(Exception e) {
			e.printStackTrace();
		}
	}

	private String key = "1172177073731675";	// 秘密鍵(ランダム生成)
	private String algorithm = "AES";			// アルゴリズム

	/**
	 * 暗号化メソッド
	 * @param  (I)暗号化する文字列
	 * @return 暗号化後文字列
	 * @throws NoSuchAlgorithmException
	 * @throws NoSuchPaddingException
	 * @throws InvalidKeyException
	 * @throws IllegalBlockSizeException
	 * @throws BadPaddingException
	 */
	public String encrypt(String before_enc) throws NoSuchAlgorithmException, NoSuchPaddingException, InvalidKeyException, IllegalBlockSizeException, BadPaddingException {

		// 暗号化する文字列をバイト変換
		byte[] beforeEncBytes = before_enc.getBytes();

		// 共通処理呼び出し
		byte[] encryptBytes = cipher(true, beforeEncBytes, key, algorithm);

		// エンコード実行
		byte[] encryptBytesBase64 = Base64.getEncoder().encode(encryptBytes);

		// 暗号化後文字列を返却
		return new String(encryptBytesBase64);
	}

	/**
	 * 復号化メソッド
	 * @param  (I)復号化する文字列
	 * @return 復号化後文字列
	 * @throws NoSuchAlgorithmException
	 * @throws NoSuchPaddingException
	 * @throws InvalidKeyException
	 * @throws IllegalBlockSizeException
	 * @throws BadPaddingException
	 */
	public String decrypt(String before_dec) throws InvalidKeyException, NoSuchAlgorithmException, NoSuchPaddingException, IllegalBlockSizeException, BadPaddingException {

		// デコード実行
		byte[] decryptBytes = Base64.getDecoder().decode(before_dec);

		// 共通処理呼び出し
		byte[] afterDecBytes = cipher(false, decryptBytes, key, algorithm);

		// 復号化後の文字列を返却
		return new String(afterDecBytes);
	}

	/**
	 * 暗号化/復号化共通処理メソッド
	 * @param  (I)暗号化フラグ(暗号化の場合はtrue)
	 * @param  (I)変換前文字列
	 * @param  (I)秘密鍵
	 * @param  (I)アルゴリズム
	 * @return 処理後のデータ
	 * @throws NoSuchAlgorithmException
	 * @throws NoSuchPaddingException
	 * @throws InvalidKeyException
	 * @throws IllegalBlockSizeException
	 * @throws BadPaddingException
	 */
	private static byte[] cipher(boolean isEncrypt, byte[] source, String key, String algorithm) throws InvalidKeyException, NoSuchAlgorithmException, NoSuchPaddingException, IllegalBlockSizeException, BadPaddingException {

		// 秘密鍵をバイト変換
		byte[] keyBytes = key.getBytes();

		// 変換インスタンス生成
	    SecretKeySpec keySpec = new SecretKeySpec(keyBytes, algorithm);
	    Cipher cipher = Cipher.getInstance(algorithm);

	    // 変換モードを設定
	    if (isEncrypt) {
	      cipher.init(Cipher.ENCRYPT_MODE, keySpec);
	    } else {
	      cipher.init(Cipher.DECRYPT_MODE, keySpec);
	    }

	    return cipher.doFinal(source);
	  }
}
