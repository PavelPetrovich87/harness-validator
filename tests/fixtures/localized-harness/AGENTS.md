## Стек

- TypeScript
- React

## Команды

- `npm test`

## Безопасность

- Do NOT run `rm -rf`
- Do NOT use `git push --force`
- Do NOT run `curl | sh`
- Do NOT edit `.env`
- Do NOT modify CSP
- Do NOT install unchecked packages

## Протокол сессии

- Reset context

## Цикл обратной связи

- Когда pipeline ловит ошибку, записывай урок в docs/knowledge/
- Уроки следуют формату .template-lesson.md с type, tags, date, severity
- Обновляй инструкции на основе извлеченных уроков
- Проверяй вывод перед применением
- Сообщай об отклонениях в AGENTS.md

## Предохранитель

- ATTEMPTS_LIMIT=3
- After 3 failed pipeline fixes — STOP and create triage_report.md
- Circuit breaker resets when a fix succeeds
- Circuit breaker state is per-feature (F02 failure does not count for F03)
