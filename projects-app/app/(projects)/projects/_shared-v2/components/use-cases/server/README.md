# Пользовательские кейсы (дев-слой) — server/ намеренно пуст

У дев-панели кейсов СВОЕЙ серверной функции нет: она рендерится ВНУТРИ страницы автоматизации (через
дев-слот) и читает/пишет кейсы через СОБСТВЕННЫЕ двери автоматизации — те же, что и у остального ядра:

- чтение — `GET api/core?select=useCases` (набор кейсов + `reviewedSignature`);
- добавить — `POST api/patch { op:"append", object:"useCases", value:{title,text,status} }` (сервер генерит `cuid`/`number`);
- удалить — `POST api/patch { op:"delete", address:{object:"useCase", cuid} }`;
- ревью-гейт — `POST api/patch { address:{object:"useCases"}, set:{reviewedSignature} }`.

Двери и модель кейса (`title`+`text`+`status`, `useCases.reviewedSignature`) живут в папке автоматизации
(`other/<автоматизация>/api/*` + `_data/automation.schema.ts`). Здесь — только клиент (`client/`) и типы
(`types/`). Одна серверная модель на фичу, не разбросана.
