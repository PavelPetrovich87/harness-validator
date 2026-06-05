/** @type {import('dependency-cruiser').IConfiguration} */
export default {
  forbidden: [
    {
      name: 'no-utils-to-phases',
      comment: 'Utilities must not depend on validation phases (business logic)',
      severity: 'error',
      from: { path: '^src/utils' },
      to: { path: '^src/phases' },
    },
    {
      name: 'no-phases-to-validator',
      comment: 'Phases must not import the orchestrator (circular dependency)',
      severity: 'error',
      from: { path: '^src/phases' },
      to: { path: '^src/validator.ts$' },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
  },
};
