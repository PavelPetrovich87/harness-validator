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
      name: 'no-circular',
      comment: 'No circular dependencies allowed',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
};
