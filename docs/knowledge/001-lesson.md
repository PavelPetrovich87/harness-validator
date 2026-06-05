---
type: lesson
title: "harnessRoot parameter must distinguish templates from source files"
date: 2026-06-04
severity: high
tags: ["dogfood", "refactoring", "api-design"]
---

# Lesson

## What happened

When adding harnessRoot to runSetup(), generators initially used a single fallback root. This broke existing tests: templates resolved against projectRoot (copied into temp dirs), but validator source files and schemas resolved against process.cwd(). A single fallback caused either templates or source files to fail.

## Root cause

Templates and harness source files have different resolution semantics. Templates may be copied into the target project (old behavior), while source files (validator, schemas) always live in the harness repo. A single root parameter conflated these two concerns.

## Mitigation

Split into two concepts inside generateAllArtifacts: templateRoot (falls back to projectRoot) and sourceRoot (falls back to process.cwd()). Document this distinction for future generator authors.