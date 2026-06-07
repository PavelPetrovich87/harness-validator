# План рефакторинга harness-validator

## Контекст

Скилл `harness-validator` настраивает и валидирует AI Harness артефакты для проектов. Текущая реализация частично покрывает US1/US2 и полностью не покрывает US3. Ниже — пошаговый план рефакторинга.

---

## Текущие модули и критерии (5 фаз)

| Фаза | Критерии |
|------|----------|
| **AST_STRUCTURE** | H2-заголовки (Stack, Safety, Session Protocol, Feedback Loop, Circuit Breaker); ≤60 строк; Safety ≥5 пунктов; Feedback Loop ≥3; Circuit Breaker ≥1 |
| **INSTRUCTION_MODULES** | local/ ≥2 .md с валидным frontmatter; shared/ ≥1 .md |
| **ARCHITECTURE** | `.dependency-cruiser.js` с `forbidden` массивом ≥2 правил |
| **DATA_CONTRACTS** | `feature_list.json` валиден против схемы |
| **INTEGRATION** | lefthook: существует, ≥3 команд, parallel=true; CI: ≥4 jobs |

---

## Этап 1: US1 — Setup на чистом/частично настроенном проекте

**Проблемы:** нет начальной диагностики, нет текстовых рекомендаций, setup сразу генерирует всё.

### 1.1 Создать `src/diagnostics.ts`
- Проверяет наличие каждого артефакта Harness
- Возвращает: `exists`, `module`, `criteria[]` с `met`/`message`
- Артефакты: AGENTS.md, lefthook.yml, .dependency-cruiser.js, .claude/instructions/, feature_list.json, .harness/manifest.json, .github/workflows/ci.yml

### 1.2 Добавить `scripts/diagnose-harness.ts`
- CLI entrypoint для диагностики
- Выводит текстовый отчёт: "Обнаружены модули: X, Y. Отсутствуют: Z. Рекомендуется: ..."

### 1.3 Модифицировать `runSetup()` в `src/setup.ts`
- Перед генерацией запускать `runDiagnostics()`
- Если Harness уже полностью установлен → предложить `validate` вместо `setup`
- Если частично установлен → отчёт + вопрос "дополнить недостающее или пересоздать с нуля"
- После генерации + валидации выводить модульный отчёт по критериям (не только PASS/FAIL)

### 1.4 Обновить `harness-setup` sub-skill SKILL.md
- Описать диагностический шаг
- Описать поведение при частично установленном Harness

---

## Этап 2: US2 — Review существующего Harness с scoring

**Проблемы:** нет числового score, нет рекомендаций, нет diff с предыдущими запусками.

### 2.1 Расширить `ValidationResult` в `src/types.ts`
- `criterionId: string` — идентификатор критерия
- `severity: 'critical' | 'warning' | 'info'`
- `recommendation?: string` — что делать при FAIL

### 2.2 Создать `src/scoring.ts`
```ts
interface ModuleScore {
  phase: ValidationPhase;
  score: number;        // 0–100
  passCount: number;
  failCount: number;
  warnCount: number;
  totalCriteria: number;
  recommendations: string[];
}
```
- Score фазы = `(passCount / totalCriteria) * 100`
- Общий health score = средневзвешенное по фазам

### 2.3 Обновить каждую фазу в `src/phases/*.ts`
- Каждый результат получает `criterionId` и `recommendation`
- Пример для AST_STRUCTURE:
  - `criterionId: 'ast-sections-present'` → recommendation: "Добавьте H2-заголовки: Stack, Safety, Session Protocol, Feedback Loop, Circuit Breaker"
  - `criterionId: 'ast-line-count'` → recommendation: "Сократите AGENTS.md до 60 строк"

### 2.4 Модифицировать `HarnessValidator.run()` в `src/validator.ts`
- После сбора результатов вычислять `ModuleScore[]`
- Добавить `scores` в `Manifest`

### 2.5 Обновить `scripts/validate-harness.ts`
- Добавить вывод таблицы score по модулям
- Флаг `--recommendations` — выводить список рекомендаций
- Флаг `--compare` — сравнение с предыдущим manifest

### 2.6 Создать `src/diff.ts`
- Читает старый `.harness/manifest.json`
- Сравнивает score по фазам
- Выводит: `↑ +15% AST_STRUCTURE`, `↓ -5% INTEGRATION`

### 2.7 Обновить `harness-validate` sub-skill SKILL.md
- Документировать scoring, recommendations, diff

---

## Этап 3: US3 — Self-update по индустриальным трендам

**Проблемы:** механизм полностью отсутствует.

### 3.1 Создать `scripts/generate-research-prompt.ts`
- Анализирует текущие фазы и критерии из `src/phases/*.ts`
- Генерирует prompt для Deep Research:
  ```
  Текущие критерии валидации AI Harness:
  [список фаз и критериев]

  Проанализируй последние индустриальные тренды в:
  - Безопасности AI-агентов
  - Observability AI-агентов
  - Тестировании AI-генерированного кода
  - Архитектурных паттернах для AI-инструментов

  Предложи: новые критерии, обновления, удаление устаревших, новые фазы.
  ```
- Сохраняет prompt в файл, который пользователь может скопировать

### 3.2 Создать `src/research-schema.ts` + `schemas/research_results.schema.json`
- Формат ожидаемых результатов Deep Research:
  ```json
  {
    "addPhases": [{ "name": "SECURITY", "description": "...", "criteria": [...] }],
    "addCriteria": [{ "phase": "AST_STRUCTURE", "criterionId": "...", "rule": "..." }],
    "updateCriteria": [{ "criterionId": "...", "newRule": "..." }],
    "removeCriteria": [{ "criterionId": "...", "reason": "..." }],
    "version": "0.2.0"
  }
  ```

### 3.3 Создать `scripts/apply-research.ts`
- Принимает JSON с результатами research
- Валидирует против `research_results.schema.json`
- Генерирует git diff / patch для:
  - `src/phases/*.ts` — добавление/обновление/удаление критериев
  - `src/types.ts` — новые `ValidationPhase`
  - `schemas/*.json` — новые схемы
  - SKILL.md файлов — обновление документации
- **НЕ применяет автоматически** — выводит diff и ждёт подтверждения пользователя

### 3.4 Создать `docs/RESEARCH_WORKFLOW.md`
- Шаг 1: `npm run research:prompt` → получить prompt
- Шаг 2: Запустить Deep Research с этим prompt
- Шаг 3: Сохранить результат в JSON
- Шаг 4: `npm run research:apply -- results.json` → посмотреть diff
- Шаг 5: Подтвердить и применить

### 3.5 Добавить команды в `package.json`
```json
"research:prompt": "tsx scripts/generate-research-prompt.ts",
"research:apply": "tsx scripts/apply-research.ts"
```

### 3.6 Создать sub-skill `harness-update` (или добавить в `harness-validator`)
- SKILL.md с полным workflow self-update

---

## Этап 4: Общие улучшения

### 4.1 Версионирование критериев
- `src/criteria-version.ts` — константа `CRITERIA_VERSION`
- Каждый `criterionId` имеет `since: string` (версия)
- Версия пишется в `Manifest.criteria_version`

### 4.2 Тесты
- `tests/unit/scoring.test.ts` — score calculation
- `tests/unit/diagnostics.test.ts` — diagnostics logic
- `tests/unit/diff.test.ts` — manifest diff
- `tests/e2e/research-prompt.test.ts` — prompt generation
- `tests/e2e/research-apply.test.ts` — apply workflow

### 4.3 Обновление документации скилла
- `SKILL.md` — описать все три workflow
- `references/artifacts.md` — добавить новые артефакты (diagnostics, scoring, diff)
- `AGENTS.md` (самого скилла) — отразить новые команды и правила

---

## Итоговая архитектура после рефакторинга

```
src/
  diagnostics.ts          # US1: проверка существующих артефактов
  scoring.ts              # US2: score по модулям
  diff.ts                 # US2: сравнение с предыдущим запуском
  research-schema.ts      # US3: schema для результатов research
  phases/
    ast-structure.ts       # + criterionId, recommendation
    instruction-modules.ts # + criterionId, recommendation
    architecture.ts        # + criterionId, recommendation
    data-contracts.ts      # + criterionId, recommendation
    integration.ts         # + criterionId, recommendation
scripts/
  diagnose-harness.ts     # US1: CLI диагностики
  validate-harness.ts     # US2: + --recommendations, --compare
  generate-research-prompt.ts # US3: генератор prompt
  apply-research.ts       # US3: применение результатов research
```

## Приоритеты

1. **Этап 2 (US2)** — scoring и recommendations: даёт максимальную ценность при минимальных изменениях
2. **Этап 1 (US1)** — diagnostics: улучшает UX setup flow
3. **Этап 3 (US3)** — research workflow: новая функциональность
4. **Этап 4** — тесты и документация
