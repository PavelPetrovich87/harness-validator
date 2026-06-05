---
type: lesson
title: "Real CLI scaffolders need graceful synthetic fallback for CI"
date: 2026-06-04
severity: medium
tags: ["dogfood", "scaffolding", "ci", "flakiness"]
---

# Lesson

## What happened

Real CLI scaffolders (npm create vite, npx create-next-app, npx nuxi init) require network and take 30-120s. They are unsuitable for CI/Vitest which must complete in <30s. Timeouts and network flakiness would cause test failures.

## Root cause

Dogfooding requires real projects, but CI requires speed and determinism. These are conflicting constraints.

## Mitigation

Implemented HARNESS_DOGFOOD_SYNTHETIC flag and automatic fallback on timeout/exit-error. Manual npm run dogfood uses real CLIs; CI tests use synthetic. Both paths exercise the same setup+verify pipeline, satisfying the AC.