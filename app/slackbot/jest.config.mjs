export default {
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['./src/**/*.js'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Run test files as native ES modules — no Babel/transform step. Requires
  // `node --experimental-vm-modules` (set via NODE_OPTIONS in the test script).
  transform: {},
};
