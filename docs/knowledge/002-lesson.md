---
type: lesson
title: "Synthetic dogfood projects need explicit architecture pattern answers"
date: 2026-06-04
severity: medium
tags: ["dogfood", "validation", "synthetic-projects"]
---

# Lesson

## What happened

Initial dogfood runs failed because synthetic projects lack src/ui + src/services directories. detectArchitecturePattern returned null, pattern was set to skip, and .dependency-cruiser.js was not generated. The validator architecture phase then failed, triggering the circuit breaker.

## Root cause

Non-interactive mode uses detectArchitecturePattern to choose pattern. Synthetic minimal projects do not match any heuristic, so pattern=skip. But the validator always requires .dependency-cruiser.js regardless of pattern choice.

## Mitigation

Dogfood CLI now writes an answers.json with pattern: layered before calling runSetup(). For synthetic projects, explicitly pin the architecture pattern instead of relying on auto-detection.