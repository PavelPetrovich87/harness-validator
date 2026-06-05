# AI Harness v1.1

> Гибридная спецификация для управления AI-агентами в проектах.
> Skill описывает — агент генерирует — AST + Schema валидирует.

**Версия:** 1.1 (ревью от 02.06.2026)  
**Модули:** 8 (L1: 2, L2: 2, L3: 2, Cross-cutting: 2)  
**Статус:** В разработке — [Roadmap](TICKETS.md)

---

## Что это

AI Harness — это система контроля и стандартизации работы AI-агентов (Claude, Copilot и др.) в реальных проектах. Она решает 4 критические проблемы, выявленные при аудите v1.0:

| Проблема (v1.0) | Решение (v1.1) |
|-----------------|----------------|
| Хрупкая валидация (`grep`/`wc`/`sed` падают на локализации и пробелах) | **AST-валидатор** (`remark-parse` + TypeScript) |
| Нет контроля слоев ("UI не импортирует data-access" — текст, не код) | **dependency-cruiser** — Architecture-as-Code |
| Deadlock в Feedback Loop (агент бесконечно чинит lint) | **Circuit Breaker** — 3 попытки, затем триаж |
| Слабая валидация frontmatter (проверялся только разделитель `---`) | **JSON Schema** через `ajv-cli` |

---

## Архитектура: 8 модулей

```
+============================================================+
|                    AI HARNESS v1.1 (HYBRID)                  |
+============================================================+
|  L1: CONTEXT SYSTEM                                        |
|  +------------------+  +------------------------+          |
|  | 1. AGENTS.md     |  | 2. Instruction Modules |          |
|  |    (generated)   |  |    (generated)         |          |
|  +------------------+  +------------------------+          |
|                                                            |
|  L2: QUALITY & SAFETY                                      |
|  +------------------+  +------------------------+          |
|  | 3. Quality Pipe. |  | 4. Safety Config       |          |
|  |    (hybrid)      |  |    (embedded)          |          |
|  |    + dep-cruiser |  |                        |          |
|  +------------------+  +------------------------+          |
|                                                            |
|  L3: MEMORY & PROTOCOL                                   |
|  +------------------+  +------------------------+          |
|  | 5. Knowledge Base|  | 6. Session Protocol    |          |
|  |    (template)    |  |    (embedded)          |          |
|  +------------------+  +------------------------+          |
|                                                            |
|  CROSS-CUTTING                                             |
|  +------------------+  +------------------------+          |
|  | 7. Skills Regis. |  | 8. Feedback Loop       |          |
|  |    (infra)       |  |    (process)           |          |
|  +------------------+  |    + Circuit Breaker   |          |
|                         +------------------------+          |
+============================================================+
         |                           |
         v                           v
+-------------------+    +-----------------------+
| AST Validator     |    | JSON Schema           |
| (remark-parse)    |    | (ajv-cli)             |
| + dependency-     |    +-----------------------+
|   cruiser         |
+-------------------+
```

### L1: Context System

#### 1. AGENTS.md (Root Manifest)
Корневой файл контекста. Агент читает при каждом старте. Содержит стек, архитектурные решения, команды, safety-конфигурацию, session protocol, feedback loop.

- **Тип:** Generated
- **Артефакт:** `./AGENTS.md` (< 50 строк)
- **Валидация:** AST-based (remark-parse) — проверка heading узлов, не строк

#### 2. Instruction Modules
Объединение Path Rules и Skills. Два типа:
- `local/` — project-specific, агент генерирует
- `shared@version/` — cross-project, git subtree

- **Тип:** Generated
- **Артефакт:** `./.claude/instructions/`
- **Валидация:** AST + JSON Schema (frontmatter)

### L2: Quality & Safety

#### 3. Quality Pipeline
Объединение Lefthook, Custom Linters и CI Gates + dependency-cruiser для архитектурного контроля.

- **Тип:** Hybrid (Generated + Template)
- **Артефакты:** `lefthook.yml`, `.dependency-cruiser.js`, `biome.json`, `.github/workflows/ci.yml`
- **Инструменты по стеку:**
  - TypeScript → Biome + ESLint + tsc + vitest + dependency-cruiser
  - Python → ruff + mypy + pytest
  - Go → golangci-lint + go test

#### 4. Safety Config
Блокировка опасных операций — раздел `## Safety` в `AGENTS.md`. Не генерируется агентом, фиксирован.

- **Тип:** Embedded
- **Артефакт:** Раздел `## Safety` в `AGENTS.md`
- **Содержимое:** rm -rf, git push --force, curl | sh, editing .env, modifying CSP, installing packages with postinstall scripts, modifying DB schemas with data loss risk

### L3: Memory & Protocol

#### 5. Knowledge Base
Объединение ADR и Lessons. Единая директория с тегируемыми записями типов: `decision`, `lesson`, `pattern`.

- **Тип:** Template
- **Артефакт:** `docs/knowledge/`
- **Шаблоны:** `.template-decision.md`, `.template-lesson.md`, `.template-pattern.md`

#### 6. Session Protocol
Объединение Git Checkpoints и Context Reset Protocol.

- **Тип:** Embedded + `feature_list.json`
- **Артефакт:** Раздел в `AGENTS.md` + `feature_list.json`
- **Валидация:** `ajv-cli validate --schema=feature_list.schema.json feature_list.json`

### Cross-cutting

#### 7. Skills Registry
Центральный репозиторий shared-инструкций. Инфраструктурный модуль.

- **Тип:** Infrastructure
- **Артефакт:** Git repo с `skills/<name>/SKILL.md`
- **Подключение:** `git subtree add --prefix=.claude/instructions/shared <repo> v1.0.0`

#### 8. Feedback Loop + Circuit Breaker
Цикл: агент ошибается → pipeline ловит → lesson → instruction обновляется.

- **Тип:** Process (раздел в `AGENTS.md`)
- **Circuit Breaker:** `ATTEMPTS_LIMIT = 3`. После 3-й неудачи — `triage_report.md` + STOP + human handoff

---

## Принципы гибридного подхода

| # | Правило | Смысл |
|---|---------|-------|
| 1 | **Skill описывает, агент генерирует** | `SKILL.md` содержит декларативные описания модулей. Агент читает skill, анализирует проект, генерирует артефакты. |
| 2 | **Security-критичное копируется, не генерируется** | CSP, secrets, auth-конфиги — verified templates. Агент адаптирует переменные, но структура фиксирована. |
| 3 | **Все валидируется AST-based checker'ом** | `validate-harness.ts` (remark-parse) проверяет структуру Markdown AST. dependency-cruiser проверяет архитектурные границы. JSON Schema валидирует метаданные. Никакого `grep`. |
| 4 | **Circuit Breaker для Feedback Loop** | `ATTEMPTS_LIMIT=3`. После — `triage_report.md` и human handoff. Никаких бесконечных циклов. |

### Типы артефактов

| Тип | Описание |
|-----|----------|
| **Generated** | Агент генерирует на основе skill и контекста проекта |
| **Template** | Копируется из verified template с минимальной адаптацией |
| **Embedded** | Встроено в другой модуль, не существует отдельно |

---

## Три режима работы

### 1. Interactive Setup
1. Агент читает `SKILL.md`
2. Агент сканирует проект (`package.json`, структура)
3. Агент задает уточняющие вопросы (3–5 шт.)
4. Пользователь отвечает
5. Агент генерирует артефакты (`AGENTS.md`, `lefthook.yml`, ...)
6. Агент копирует templates (`.template-*.md`, `.dependency-cruiser.js`)
7. Агент запускает: `npx tsx validate-harness.ts`
8. Validator создает `.harness/manifest.json`
9. Агент выводит: "Harness configured. Errors: 0. Warnings: X."

### 2. Sync
1. Новая версия `SKILL.md`
2. Агент читает diff
3. Агент показывает изменения, пользователь подтверждает
4. Агент применяет изменения
5. Validator проверяет
6. Manifest обновляется

### 3. CI-only (deterministic, без LLM)
```yaml
# .github/workflows/harness-validate.yml
name: Harness Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci  # установка зависимостей валидатора
      - run: npx tsx validate-harness.ts
      # FAIL if exit code != 0
```

---

## Prerequisites

### Runtime

| Компонент | Назначение | Версия |
|-----------|-----------|--------|
| **Node.js** | Runtime для валидатора | >= 20 |
| **TypeScript** | Язык валидатора | >= 5.4 |
| **tsx** | Запуск `.ts` без компиляции | >= 4.7 |

### NPM-зависимости (валидатор)

```json
{
  "dependencies": {
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-frontmatter": "^5.0.0",
    "unist-util-visit": "^5.0.0",
    "ajv": "^8.12.0",
    "glob": "^10.3.0"
  }
}
```

### Инструменты pipeline (по стеку)

| Стек | Lint | Typecheck | Test | Architecture |
|------|------|-----------|------|--------------|
| **TypeScript** | Biome / ESLint | `tsc --noEmit` | Vitest | dependency-cruiser |
| **Python** | ruff | mypy | pytest | — |
| **Go** | golangci-lint | — | `go test` | — |

### Инфраструктура

| Инструмент | Назначение |
|------------|-----------|
| **lefthook** | Git hooks (pre-commit, pre-push) |
| **dependency-cruiser** | Архитектурный контроль импортов |
| **ajv-cli** | Валидация JSON Schema |
| **GitHub Actions** | CI-only validation mode |
| **actionlint** | Валидация YAML workflow |
| **git subtree** | Подключение shared instructions |

---

## Quick Start

> **Note:** Полная инструкция по установке будет доступна после завершения [HARNESS-017](TICKETS.md) и [HARNESS-021](TICKETS.md).

### Для разработчика (после setup)

```bash
# 1. Валидировать harness
npx tsx validate-harness.ts

# 2. Запустить pipeline локально
lefthook run pre-commit

# 3. Проверить feature_list.json
npx ajv-cli validate \
  --schema=feature_list.schema.json \
  --errors=text \
  feature_list.json
```

### Для команды

```bash
# Добавить harness в проект (interactive setup)
# Агент выполняет шаги 1–9 из раздела "Interactive Setup"

# После установки — автоматическая валидация на каждый push
# через GitHub Actions (CI-only mode)
```

---

## Структура проекта (после setup)

```
project-root/
├── AGENTS.md                           # L1: Root manifest (< 50 lines)
├── feature_list.json                   # L3: Session Protocol data
├── feature_list.schema.json            # L3: JSON Schema
├── lefthook.yml                        # L2: Git hooks pipeline
├── .dependency-cruiser.js              # L2: Architecture-as-Code
├── biome.json / eslint.config.js       # L2: Linter config
├── .claude/
│   └── instructions/
│       ├── local/                      # L1: Project-specific
│       │   ├── react-components.md
│       │   ├── api-endpoints.md
│       │   └── tests.md
│       └── shared/                     # L1: Cross-project (git subtree)
│           └── ...
├── docs/
│   └── knowledge/
│       ├── .schema.json                # L3: Frontmatter schema
│       ├── .template-decision.md       # L3: Templates
│       ├── .template-lesson.md
│       ├── .template-pattern.md
│       └── 001-example-lesson.md       # L3: Actual records
├── .github/
│   └── workflows/
│       ├── ci.yml                      # L2: CI pipeline
│       └── harness-validate.yml        # CI-only validation
├── .harness/
│   └── manifest.json                   # Generated audit lock-file
└── templates/                          # Verified templates (repo only)
    ├── AGENTS.md
    ├── lefthook.yml
    ├── .dependency-cruiser.js
    └── knowledge/
        └── ...
```

---

## Validator: 4 фазы

```
+---------------------------------------------+
|  validate-harness.ts (Node.js)              |
|                                             |
|  Phase 1: AST Structure (remark-parse)      |
|    - AGENTS.md: heading узлы depth=2        |
|    - Instructions: frontmatter AST check    |
|    - Safety: list items под heading Safety  |
|                                             |
|  Phase 2: Code Architecture (dep-cruiser)   |
|    - .dependency-cruiser.js существует      |
|    - npx depcruise src --config ...         |
|    - forbidden rules определены             |
|                                             |
|  Phase 3: Data Contracts (ajv + JSON Schema)|
|    - feature_list.json по схеме             |
|    - Knowledge Base frontmatter по схеме    |
|    - manifest.json валиден                  |
|                                             |
|  Phase 4: Integration                       |
|    - Lefthook config valid                  |
|    - CI workflow syntax (actionlint)        |
|    - Linter configs parseable               |
|                                             |
|  Output: manifest.json + report             |
+---------------------------------------------+
```

**Ключевое:** Валидатор работает детерминированно, без LLM. Запускается за < 5 секунд.

---

## Roadmap

Полный список тикетов, AC и тестов — в файле [TICKETS.md](TICKETS.md).

| Фаза | Недели | Фокус |
|------|--------|-------|
| Phase 0: Foundation | W1–W2 | Validator, Schema, Templates, CI |
| Phase 1: L1 Context | W3 | AGENTS.md, Instruction Modules, Skills Registry |
| Phase 2: L2 + L3 | W4–W5 | Quality Pipeline, Safety, Knowledge Base, Session Protocol |
| Phase 3: Cross-cutting | W6–W7 | Feedback Loop, Circuit Breaker, Triage Report |
| Phase 4: Integration | W8–W10 | Setup flow, CI mode, Dogfooding, Docs |

**Критический путь:** HARNESS-001 → HARNESS-003 → HARNESS-006 → HARNESS-009 → HARNESS-017 → HARNESS-020

---

## License

TBD
