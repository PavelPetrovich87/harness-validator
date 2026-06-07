# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-07

### Added

- Build step (`npm run build`) producing compiled `dist/` output with declarations and source maps.
- CLI binaries: `harness-setup`, `harness-validate`, `harness-diagnose`, `harness-dogfood`.
- `files` array in `package.json` so published package includes only required runtime assets.
- Root `README.md` with install instructions and project overview.
- Diagnostics, scoring, diff, and research workflow commands.

### Changed

- Restructured skill layout (moved from `output/` to clean root per Agent Skills guidelines).

### Fixed

- Merge conflict resolution with remote branch during repository hygiene phase.

## [0.1.0] - 2025-06-07

### Added

- Initial 5-phase AST-based harness validator.
- Dogfooding support and sub-skills.
- Project scaffolding via `harness-setup`.

[unreleased]: https://github.com/PavelPetrovich87/harness-validator/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/PavelPetrovich87/harness-validator/compare/v0.1.0...v0.2.0
