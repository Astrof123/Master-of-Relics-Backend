module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
    collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/entities/**',
    '!**/constants/**',
    '!**/types/**',
    '!**/exceptions/**',
    '!**/migrations/**',
    '!main.ts',
    '!app.controller.ts',
    '!app.service.ts',
    '!config/**',
    '!database/**',
    '!auth/strategies/**',
    '!auth/middlewares/**',
    '!collection/cards.service.ts',
    '!common/http-metrics.interceptor.ts',
    '!spell/spell.helper.ts', // можно исключить, если не хотите тестировать
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@nestjs|socket.io|engine.io)/)',
  ],
};