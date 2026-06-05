/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-domain-to-infrastructure',
      comment: 'Domain layer must not depend on infrastructure',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/infrastructure' },
    },
    {
      name: 'no-application-to-infrastructure',
      comment: 'Application layer must not depend on infrastructure directly',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/infrastructure' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
  },
};
