// ============================================================
// Jest 統合テスト設定ファイル
// ============================================================
// ファイル名: jest.integration.config.js
// 目的: 統合テスト用のJest設定
// 使用方法: npm test -- --config=jest.integration.config.js
// ============================================================

module.exports = {
  // テストファイルのパターン
  testMatch: [
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.integration.test.js'
  ],
  
  // カバレッジ対象外（統合テストではカバレッジ測定しない）
  collectCoverage: false,
  
  // テスト環境
  testEnvironment: 'node',
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  
  // タイムアウト（統合テストは時間がかかる）
  testTimeout: 30000, // 30秒
  
  // モックを使用しない
  automock: false,
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  
  // 並列実行の制限（DBアクセスがあるため）
  maxWorkers: 1, // シリアル実行
  
  // エラー時の詳細表示
  verbose: true,
  
  // テスト実行順序
  testSequencer: '<rootDir>/tests/integration/test-sequencer.js',
  
  // グローバル変数
  globals: {
    'TEST_DATABASE_URL': 'postgresql://localhost/heresme_test',
    'NODE_ENV': 'test',
    'JAVA_CLASSPATH': '<rootDir>/util'
  },
  
  // Transform（ES6モジュール対応）
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // カバレッジディレクトリ（参考用）
  coverageDirectory: '<rootDir>/coverage/integration',
  
  // レポーター
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: '統合テスト結果',
        outputPath: 'test-results/integration-test-report.html',
        includeFailureMsg: true,
        includeConsoleLog: true
      }
    ]
  ]
};
