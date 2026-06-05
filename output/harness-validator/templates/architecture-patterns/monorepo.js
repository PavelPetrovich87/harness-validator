/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-package-implementation',
      comment: 'Packages must only import public API (index.ts) of other packages',
      severity: 'error',
      from: { path: '^packages/[^/]+/src' },
      to: {
        path: '^packages/[^/]+/src',
        pathNot: '^packages/[^/]+/src/index\\.ts$',
      },
    },
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies between packages are not allowed',
      severity: 'error',
      from: { path: '^packages/[^/]+' },
      to: { path: '^packages/[^/]+', circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
  },
};
