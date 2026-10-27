// CRA's Jest transform plus class static blocks, which three >= 0.18x ships
// untranspiled (see transformIgnorePatterns in package.json).
const babelJest = require('babel-jest').default;

module.exports = babelJest.createTransformer({
  presets: [[require.resolve('babel-preset-react-app'), { runtime: 'automatic' }]],
  plugins: [require.resolve('@babel/plugin-transform-class-static-block')],
  babelrc: false,
  configFile: false,
});
