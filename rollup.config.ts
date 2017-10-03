const rollupConfig = require('kcd-scripts/config').getRollupConfig();

import sourceMaps from 'rollup-plugin-sourcemaps';
import camelCase from 'lodash.camelcase';

const libraryName = 'koa-ws-socket';

Object.assign(rollupConfig, {
  sourcemap: true,
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: ['koa', 'ws'],
  watch: {
    include: 'compiled/**',
  },
  plugins: rollupConfig.plugins.concat([
    // Resolve source maps to the original source
    sourceMaps(),
  ]),
});

export default rollupConfig;
