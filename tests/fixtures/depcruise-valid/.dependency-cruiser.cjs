/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-ui-to-data-access',
      comment: 'UI layer must not import data-access directly',
      severity: 'error',
      from: { path: '^src/ui' },
      to: { path: '^src/data-access' },
    },
    {
      name: 'no-services-to-ui',
      comment: 'Services layer must not import UI components',
      severity: 'error',
      from: { path: '^src/services' },
      to: { path: '^src/ui' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
  },
};