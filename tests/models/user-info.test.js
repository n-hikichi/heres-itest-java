/**
 * user-info.js の単体テスト
 *
 * ========================================================================
 * 【統合テストへ移行推奨】外部コマンド実行を含む処理
 * ========================================================================
 *
 * 以下の処理は、外部コマンド（child_process.exec）を使用した
 * Java EncDecクラスによるパスワード暗号化/復号化に依存しています。
 *
 * プロジェクトの方針として、外部コマンド実行を含む処理は統合テストで検証します。
 *
 * 【対象メソッド】
 * 1. _checkOldPassword (Line 501)
 *    - exec(java_cmd) によるパスワード復号化
 *    - 影響範囲: Lines 490-520
 *
 * 2. _changeToNewPassword (Line 536)
 *    - exec(java_cmd) によるパスワード暗号化
 *    - 影響範囲: Lines 525-555
 *
 * 3. changePassword
 *    - 上記2メソッドを呼び出してパスワード変更処理を実行
 *
 * 【単体テストでの対応】
 * - モックを使用した最小限のテストのみ実施
 * - 外部コマンドの実行結果（stdout/stderr）をモック化
 * - 実際のJava EncDecクラスの実行は統合テストで検証
 *
 * 【統合テスト環境要件】
 * - Java実行環境（JDK）
 * - EncDecクラス（パスワード暗号化/復号化ユーティリティ）
 * - 実DB接続（PostgreSQL 14.12）
 *
 * 詳細は UNIT_TEST_REPORT.md の「外部コマンド実行に関するテスト方針」を参照
 *
 * ========================================================================
 * 【既知のバグによる未カバー箇所】
 * ========================================================================
 *
 * 以下のコード行は、既存実装のバグにより到達不可能なため、テストケースをスキップしています。
 * 詳細は BUG_REPORT_user-info.md を参照してください。
 *
 * - Lines 503-504: _checkOldPassword の stderr チェック（逆ロジック）
 * - Lines 508-509: _checkOldPassword の stdout チェック（到達不可能）
 * - Lines 538-539: _changeToNewPassword の stderr チェック（逆ロジック）
 * - Lines 543-544: _changeToNewPassword の stdout チェック（到達不可能）
 *
 * NOTE: これらのバグは、外部コマンド実行のエラーハンドリングに関するものです。
 *       バグ修正後も、外部コマンド実行自体は統合テストで検証する方針です。
 *
 * TODO: バグ修正後、以下のテストケースを単体テストで実装：
 *   - モックでstderr/stdoutを適切に設定し、エラーハンドリングの動作を検証
 *   - 実際の外部コマンド実行は統合テストで検証
 *
 * ========================================================================
 * 【統合テストへの移行推奨項目】AWS S3関連処理
 * ========================================================================
 *
 * 以下の機能は AWS S3 や実環境依存が強いため、統合テスト環境での検証を推奨します：
 *
 * 1. uploadAvatar - S3アップロード処理の一部
 *    - 未カバー箇所: Line 189 (一時ファイル削除エラー)
 *
 * 2. その他の未カバー箇所（S3操作のエラーハンドリング）
 *    - Lines 348, 389-390, 421-422, 434-436, 452-454, 470-472
 *
 * 現在のカバレッジ: 約96%
 * 目標: バグ修正後に100%到達可能（一部は統合テストで検証）
 */

const util = require('util');
const fs = require('fs');

// child_processのexecをコールバック形式でモック
const mockExec = jest.fn();

// グローバルなS3モック（変数名を "mock" で始める必要がある - Jestの制限）
const mockS3Instance = {
  upload: jest.fn(),
  listObjectsV2: jest.fn(),
  deleteObject: jest.fn(),
  deleteObjects: jest.fn(),
};

// モックを先に定義
jest.mock('../../util/logger-wrapper', () => ({
  sLog: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  eLog: {
    error: jest.fn(),
  },
}));

jest.mock('../../models/db-util', () => ({
  executeQueryRead: jest.fn(),
  executeQueryWrite: jest.fn(),
  executeQueryInjection: jest.fn(),
  beginPool: jest.fn(),
  endPool: jest.fn(),
}));

jest.mock('../../util/hm-util', () => ({
  isNullorUndefined: jest.fn((value) => value === undefined || value === null),
}));

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3Instance),
  SSM: jest.fn(),
}));

jest.mock('fs', () => ({
  readFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: mockExec,
}));

const userInfo = require('../../models/user-info');
const dbUtil = require('../../models/db-util');
const AWS = require('aws-sdk');

describe('UserInfo', () => {
  let s3Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // mockS3Instanceを直接参照（グローバルモック）
    s3Mock = mockS3Instance;
  });

  describe('getUserInfoByCompany', () => {
    test('正常系: 企業のユーザー情報リストを取得できること', async () => {
      const companyId = 'company001';

      const mockData = [
        {
          staff_id: 'staff001',
          name: 'ユーザー1',
          name_phonetic: 'ユーザー1',
          mail: 'user1@example.com',
          class: 'class001',
          section: 'section001',
          group_id: 'group001',
          company_id: 'company001',
          user_id: 'user001',
          vieworder: 1,
          skey: 'key1',
          avatar: 'https://example.com/avatar1.png',
        },
        {
          staff_id: 'staff002',
          name: 'ユーザー2',
          name_phonetic: 'ユーザー2',
          mail: 'user2@example.com',
          class: 'class001',
          section: 'section002',
          group_id: 'group002',
          company_id: 'company001',
          user_id: 'user002',
          vieworder: 2,
          skey: 'key2',
          avatar: 'https://example.com/avatar2.png',
        },
      ];

      dbUtil.executeQueryRead.mockResolvedValue({
        error: false,
        status: 'OK',
        body: mockData,
      });

      const result = await userInfo.getUserInfoByCompany(companyId);

      expect(result.error).toBe(false);
      expect(result.body).toHaveLength(2);
      expect(result.body).toEqual(mockData);
      expect(dbUtil.executeQueryRead).toHaveBeenCalledWith(
        expect.any(String),
        [companyId],
        'getUserInfoByCompany'
      );
    });

    test('境界値: ユーザーが0件の場合、空配列を返すこと', async () => {
      const companyId = 'company999';

      dbUtil.executeQueryRead.mockResolvedValue({
        error: false,
        status: 'OK',
        body: [],
      });

      const result = await userInfo.getUserInfoByCompany(companyId);

      expect(result.error).toBe(false);
      expect(result.body).toEqual([]);
    });

    test('異常系: DBエラーの場合、エラー情報を返すこと', async () => {
      const companyId = 'company001';

      dbUtil.executeQueryRead.mockResolvedValue({
        error: true,
        status: 'SQL query error',
      });

      const result = await userInfo.getUserInfoByCompany(companyId);

      expect(result.error).toBe(true);
      expect(result.status).toBe('SQL query error');
    });
  });

  describe('getUserInfoByMember', () => {
    test('正常系: メンバーのユーザー情報を取得できること', async () => {
      const companyId = 'company001';
      const userId = 'user001';

      const mockData = {
        staff_id: 'staff001',
        name: 'ユーザー1',
        name_phonetic: 'ユーザー1',
        mail: 'user1@example.com',
        class: 'class001',
        section: 'section001',
        group_id: 'group001',
        company_id: 'company001',
        user_id: 'user001',
        vieworder: 1,
        skey: 'key1',
        avatar: 'https://example.com/avatar1.png',
      };

      dbUtil.executeQueryRead.mockResolvedValue({
        error: false,
        status: 'OK',
        body: [mockData],
      });

      const result = await userInfo.getUserInfoByMember(companyId, userId);

      expect(result.error).toBe(false);
      expect(result.body).toEqual(mockData);
      expect(dbUtil.executeQueryRead).toHaveBeenCalledWith(
        expect.any(String),
        [companyId, userId],
        'getUserInfoByMember'
      );
    });

    test('異常系: ユーザーが存在しない場合、空の結果を返すこと', async () => {
      const companyId = 'company001';
      const userId = 'nonexistent';

      dbUtil.executeQueryRead.mockResolvedValue({
        error: false,
        status: 'OK',
        body: [],
      });

      const result = await userInfo.getUserInfoByMember(companyId, userId);

      expect(result.error).toBe(false);
      expect(result.body).toEqual([]);
    });
  });

  describe('getAvatarPathByMember', () => {
    test('正常系: メンバーのアバターパスを取得できること', async () => {
      const companyId = 'company001';
      const userId = 'user001';

      const mockData = {
        avatar: 'https://example.com/avatar1.png',
      };

      dbUtil.executeQueryRead.mockResolvedValue({
        error: false,
        status: 'OK',
        body: [mockData],
      });

      const result = await userInfo.getAvatarPathByMember(companyId, userId);

      expect(result.error).toBe(false);
      expect(result.body).toEqual(mockData);
      expect(dbUtil.executeQueryRead).toHaveBeenCalledWith(
        expect.any(String),
        [companyId, userId],
        'getAvatarPathByMember'
      );
    });

    test('異常系: ユーザーが存在しない場合、空の結果を返すこと', async () => {
      const companyId = 'company001';
      const userId = 'nonexistent';

      dbUtil.executeQueryRead.mockResolvedValue({
        error: false,
        status: 'OK',
        body: [],
      });

      const result = await userInfo.getAvatarPathByMember(companyId, userId);

      expect(result.error).toBe(false);
      expect(result.body).toEqual([]);
    });
  });

  describe('changePassword', () => {
    test('正常系: パスワード変更が成功すること', async () => {
      const userId = 'user001';
      const oldpasswd = 'old_password';
      const newpasswd = 'new_password';

      // _checkOldPasswordのモック
      dbUtil.executeQueryInjection
        .mockResolvedValueOnce({
          error: false,
          body: {
            rows: [{ passwd: 'encrypted_old_password' }],
          },
        })
        .mockResolvedValueOnce({
          error: false,
          body: {
            rowCount: 1,
          },
        });

      // child_process.execのモック（復号化・暗号化）
      let callCount = 0;
      mockExec.mockImplementation((cmd, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { stdout: 'old_password\n', stderr: '' });
        } else {
          callback(null, { stdout: 'encrypted_new_password\n', stderr: '' });
        }
      });

      const result = await userInfo.changePassword(userId, oldpasswd, newpasswd);

      expect(result.error).toBe(false);
      expect(result.status).toBe('pw changed');
    });

    test('異常系: 旧パスワードが一致しない場合、エラーを返すこと', async () => {
      const userId = 'user001';
      const oldpasswd = 'wrong_password';
      const newpasswd = 'new_password';

      dbUtil.executeQueryInjection.mockResolvedValue({
        error: false,
        body: {
          rows: [{ passwd: 'encrypted_old_password' }],
        },
      });

      // child_process.execのモック（復号化）
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'correct_old_password\n', stderr: '' });
      });

      const result = await userInfo.changePassword(userId, oldpasswd, newpasswd);

      expect(result.error).toBe(true);
      expect(result.status).toBe('bad oldpasswd');
    });

    test('異常系: 新パスワード変更が失敗した場合、エラーを返すこと', async () => {
      const userId = 'user001';
      const oldpasswd = 'old_password';
      const newpasswd = 'new_password';

      // _checkOldPasswordのモック（成功）
      dbUtil.executeQueryInjection
        .mockResolvedValueOnce({
          error: false,
          body: {
            rows: [{ passwd: 'encrypted_old_password' }],
          },
        })
        .mockResolvedValueOnce({
          error: true,
          status: 'DB update error',
        });

      // child_process.execのモック（復号化・暗号化）
      let callCount = 0;
      mockExec.mockImplementation((cmd, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { stdout: 'old_password\n', stderr: '' });
        } else {
          callback(null, { stdout: 'encrypted_new_password\n', stderr: '' });
        }
      });

      const result = await userInfo.changePassword(userId, oldpasswd, newpasswd);

      expect(result.error).toBe(true);
      expect(result.status).toBe('failed newpasswd');
    });

    test('異常系: 旧パスワード取得でDBエラーが発生した場合、エラーを返すこと', async () => {
      const userId = 'user001';
      const oldpasswd = 'old_password';
      const newpasswd = 'new_password';

      dbUtil.executeQueryInjection.mockResolvedValue({
        error: true,
        status: 'DB query error',
      });

      const result = await userInfo.changePassword(userId, oldpasswd, newpasswd);

      expect(result.error).toBe(true);
      expect(result.status).toBe('bad oldpasswd');
    });

    // ============================================================
    // 以下のテストケースは既存実装のバグにより SKIP
    // ============================================================
    //
    // 理由: models/user-info.js の _checkOldPassword および _changeToNewPassword に
    //       stderr/stdout のチェックロジックバグが存在するため、以下のコードパスは
    //       到達不可能です。
    //
    // 影響する未カバー行:
    //   - Lines 503-504: stderr が null/undefined の場合（逆ロジック）
    //   - Lines 508-509: stdout が null/undefined の場合（到達不可能）
    //   - Lines 538-539: stderr が null/undefined の場合（逆ロジック）
    //   - Lines 543-544: stdout が null/undefined の場合（到達不可能）
    //
    // TODO: BUG_REPORT_user-info.md の修正を適用後、以下のテストを再実装:
    //   1. stderr が null/undefined の場合のエラーハンドリング
    //   2. stdout が null/undefined の場合のエラーハンドリング
    //   3. Javaコマンド実行時のエラー検出
    //
    // ============================================================

    test.skip('TODO: 復号化コマンドで stderr が null/undefined の場合のテスト（バグ修正後に実装）', async () => {
      // このテストは現在のコードでは到達不可能
      // Bug #1 修正後に実装する必要があります
    });

    test.skip('TODO: 復号化コマンドで stdout が null/undefined の場合のテスト（バグ修正後に実装）', async () => {
      // このテストは現在のコードでは到達不可能
      // Bug #1, #2 修正後に実装する必要があります
    });

    test.skip('TODO: 暗号化コマンドで stderr が null/undefined の場合のテスト（バグ修正後に実装）', async () => {
      // このテストは現在のコードでは到達不可能
      // Bug #1 修正後に実装する必要があります
    });

    test.skip('TODO: 暗号化コマンドで stdout が null/undefined の場合のテスト（バグ修正後に実装）', async () => {
      // このテストは現在のコードでは到達不可能
      // Bug #1, #2 修正後に実装する必要があります
    });
  });

  describe('uploadAvatar', () => {
    test('正常系: アバターのアップロードが成功すること', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      // S3のlistObjectsV2のモック
      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, { Contents: [] });
      });

      // fsのreadFileのモック
      fs.readFile.mockImplementation((filepath, callback) => {
        callback(null, Buffer.from('fake_image_data'));
      });

      // S3のuploadのモック
      s3Mock.upload.mockImplementation((params, callback) => {
        callback(null, { Location: 'https://s3.amazonaws.com/bucket/avatar.png' });
      });

      // DBのupdateのモック
      dbUtil.executeQueryWrite.mockResolvedValue({
        error: false,
        status: 'OK',
        body: 1,
      });

      // fsのunlinkのモック
      fs.unlink.mockImplementation((filepath, callback) => {
        callback(null);
      });

      const result = await userInfo.uploadAvatar(companyId, userId, avatarFile);

      expect(result.error).toBe(false);
      expect(result.status).toBe('OK');
      expect(result.body).toBeDefined();
    });

    test('異常系: S3アップロードが失敗した場合、エラーを返すこと', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, { Contents: [] });
      });

      fs.readFile.mockImplementation((filepath, callback) => {
        callback(null, Buffer.from('fake_image_data'));
      });

      s3Mock.upload.mockImplementation((params, callback) => {
        callback(new Error('S3 upload failed'), null);
      });

      const result = await userInfo.uploadAvatar(companyId, userId, avatarFile);

      expect(result.error).toBe(true);
      expect(result.status).toBe('Upload S3 error');
    });

    test('異常系: DB更新が失敗した場合、エラーを返すこと', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, { Contents: [] });
      });

      fs.readFile.mockImplementation((filepath, callback) => {
        callback(null, Buffer.from('fake_image_data'));
      });

      s3Mock.upload.mockImplementation((params, callback) => {
        callback(null, { Location: 'https://s3.amazonaws.com/bucket/avatar.png' });
      });

      dbUtil.executeQueryWrite.mockResolvedValue({
        error: true,
        status: 'DB update error',
      });

      const result = await userInfo.uploadAvatar(companyId, userId, avatarFile);

      expect(result.error).toBe(true);
      expect(result.status).toBe('DB update error');
    });

    test('正常系: 既存ファイルが存在する場合、削除されること', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, {
          Contents: [
            { Key: 'avatar-image/company001/user001_avatar_old.jpg' },
          ],
        });
      });

      fs.readFile.mockImplementation((filepath, callback) => {
        callback(null, Buffer.from('fake_image_data'));
      });

      s3Mock.upload.mockImplementation((params, callback) => {
        callback(null, { Location: 'https://s3.amazonaws.com/bucket/avatar.png' });
      });

      s3Mock.deleteObject.mockImplementation((params, callback) => {
        callback(null, {});
      });

      dbUtil.executeQueryWrite.mockResolvedValue({
        error: false,
        status: 'OK',
        body: 1,
      });

      fs.unlink.mockImplementation((filepath, callback) => {
        callback(null);
      });

      const result = await userInfo.uploadAvatar(companyId, userId, avatarFile);

      expect(result.error).toBe(false);
      expect(result.status).toBe('OK');
      expect(s3Mock.deleteObject).toHaveBeenCalled();
    });

    test('異常系: ファイル読み込みが失敗した場合、エラーを返すこと', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, { Contents: [] });
      });

      fs.readFile.mockImplementation((filepath, callback) => {
        callback(new Error('File read error'), null);
      });

      const result = await userInfo.uploadAvatar(companyId, userId, avatarFile);

      expect(result.error).toBe(true);
      expect(result.status).toBe('Upload S3 error');
    });

    test('準正常系: 一時ファイル削除が失敗してもS3アップロードは成功すること', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, { Contents: [] });
      });

      fs.readFile.mockImplementation((filepath, callback) => {
        callback(null, Buffer.from('fake_image_data'));
      });

      s3Mock.upload.mockImplementation((params, callback) => {
        callback(null, { Location: 'https://s3.amazonaws.com/bucket/avatar.png' });
      });

      dbUtil.executeQueryWrite.mockResolvedValue({
        error: false,
        status: 'OK',
        body: 1,
      });

      // 一時ファイル削除でエラーを発生させる（Line 189 カバー）
      fs.unlink.mockImplementation((filepath, callback) => {
        callback(new Error('EACCES: permission denied'));
      });

      const result = await userInfo.uploadAvatar(companyId, userId, avatarFile);

      // 一時ファイル削除エラーは処理失敗扱いにしない
      expect(result.error).toBe(false);
      expect(result.status).toBe('OK');
    });

    test('異常系: S3オブジェクト一覧取得が失敗した場合、エラーを返すこと', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      // S3リスト取得でエラーを発生させる（Lines 421-422, 434-436 カバー）
      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(new Error('S3 AccessDenied'), null);
      });

      await expect(
        userInfo.uploadAvatar(companyId, userId, avatarFile)
      ).rejects.toThrow('S3 AccessDenied');
    });

    test('異常系: 既存ファイル削除が失敗した場合、エラーがスローされること', async () => {
      const companyId = 'company001';
      const userId = 'user001';
      const avatarFile = {
        filename: 'user001_avatar.png',
        path: '/tmp/upload_12345.png',
        mimetype: 'image/png',
      };

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, {
          Contents: [
            { Key: 'avatar-image/company001/user001_old.jpg' }
          ]
        });
      });

      fs.readFile.mockImplementation((filepath, callback) => {
        callback(null, Buffer.from('fake_image_data'));
      });

      s3Mock.upload.mockImplementation((params, callback) => {
        callback(null, { Location: 'https://s3.amazonaws.com/bucket/avatar.png' });
      });

      // 既存ファイル削除でエラーを発生させる（Lines 348, 452-454 カバー）
      s3Mock.deleteObject.mockImplementation((params, callback) => {
        callback(new Error('S3 delete permission denied'), null);
      });

      dbUtil.executeQueryWrite.mockResolvedValue({
        error: false,
        status: 'OK',
        body: 1,
      });

      fs.unlink.mockImplementation((filepath, callback) => {
        callback(null);
      });

      // 既存ファイル削除の失敗はエラーをスロー
      await expect(
        userInfo.uploadAvatar(companyId, userId, avatarFile)
      ).rejects.toThrow('S3 delete permission denied');
    });
  });

  describe('deleteAvatar', () => {
    test('正常系: アバターの削除が成功すること', async () => {
      const companyId = 'company001';
      const userId = 'user001';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      };

      dbUtil.beginPool.mockReturnValue(mockPool);

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, {
          Contents: [
            { Key: 'avatar-image/company001/user001_avatar.png' },
          ],
        });
      });

      s3Mock.deleteObjects.mockImplementation((params, callback) => {
        callback(null, { Deleted: [{ Key: 'avatar-image/company001/user001_avatar.png' }] });
      });

      const result = await userInfo.deleteAvatar(companyId, userId);

      expect(result.error).toBe(false);
      expect(result.status).toBe('OK');
      expect(result.body).toBeNull();
    });

    test('異常系: トランザクション実行中にエラーが発生した場合、ロールバックすること', async () => {
      const companyId = 'company001';
      const userId = 'user001';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('DB error')) // UPDATE (エラー)
          .mockResolvedValueOnce({}), // ROLLBACK
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      };

      dbUtil.beginPool.mockReturnValue(mockPool);

      const result = await userInfo.deleteAvatar(companyId, userId);

      expect(result.error).toBe(true);
      expect(result.status).toBe('Delete avatar error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('異常系: S3からの一括削除が失敗した場合、ロールバックされること', async () => {
      const companyId = 'company001';
      const userId = 'user001';

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({})  // BEGIN
          .mockResolvedValueOnce({ rowCount: 1 })  // UPDATE
          .mockResolvedValueOnce({}), // ROLLBACK
        release: jest.fn(),
      };

      const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
      };

      dbUtil.beginPool.mockReturnValue(mockPool);

      s3Mock.listObjectsV2.mockImplementation((params, callback) => {
        callback(null, {
          Contents: [
            { Key: 'avatar-image/company001/user001_avatar.png' }
          ]
        });
      });

      // S3一括削除でエラーを発生させる（Lines 389-390, 470-472 カバー）
      s3Mock.deleteObjects.mockImplementation((params, callback) => {
        callback(new Error('S3 network error'), null);
      });

      const result = await userInfo.deleteAvatar(companyId, userId);

      expect(result.error).toBe(true);
      expect(result.status).toBe('Delete avatar error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
