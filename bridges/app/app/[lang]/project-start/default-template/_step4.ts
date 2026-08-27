// СЛОВА ШАГА 4 — ОТПРАВИТЬ ПРОЕКТ В GITHUB (28-21, 2026-08-27).
//
// 🔒 ТЕКСТ ИЗ ЖИВОГО МАСТЕРА (`github.step4Title`, `step4Body`, `step4Check`), а
// не сочинён мной. Главная мысль владельца сохранена дословно: «подключение
// данных не перемещает ни одного файла — перемещает отправка».

export type StepFourStrings = {
  pageTitle: string;
  pageHint: string;
  badge: string;
  title: string;
  lead: string;
  info: string;
  important: string;
  actionLead: string;
  bullets: string[];
  stepOf: string;
  done: string;
  cta: string;
  busy: string;
  successTitle: string;
  successHint: string;
  failureTitle: string;
  reasons: Record<string, string>;
  reasonUnknown: string;
  pushedAt: string;
  /** Подпись ссылки на репозиторий человека — способ убедиться, что код доехал. */
  linkLabel: string;
  goPrev: string;
  goNext: string;
};

const ru: StepFourStrings = {
  pageTitle: "Стартовый шаблон",
  pageHint: "Путь от пустого репозитория до работающего сайта — по одному шагу за раз.",

  badge: "Шаг четвёртый · закрывает система",
  title: "Отправить проект в GitHub",
  lead:
    "Подключение данных не перемещает ни одного файла. Перемещает отправка: она собирает то, что сейчас есть на сервере, и кладёт в ваш репозиторий.",
  info:
    "Как понять, что получилось: откройте репозиторий в браузере и обновите страницу. Появляются файлы, а в списке коммитов — одна запись с этого сервера.",
  important:
    "Пока отправка не нажата, репозиторий остаётся пустым — и это читается как «не сработало». Три предыдущих шага только подготовили доступ; файлы не двигал ни один из них.",
  actionLead: "Одно нажатие. Отправка идёт с сервера напрямую в ваш репозиторий.",
  bullets: [
    "Отправляется то, что сейчас лежит в вашем приложении на сервере",
    "Используются адрес и токен, подтверждённые на третьем шаге",
    "Отправка не трогает ничего, кроме вашего репозитория",
  ],
  stepOf: "Шаг {n} из {total}",
  done: "Шаг завершён",

  cta: "Отправить проект",
  busy: "Отправляем…",
  successTitle: "Проект отправлен",
  successHint: "Откройте репозиторий и обновите страницу — файлы уже там",
  failureTitle: "Отправка не прошла",
  reasons: {
    "not-verified": "Сначала вернитесь на третий шаг и подтвердите связь — отправка идёт по проверенным данным.",
    "no-project": "На сервере не найдено приложение для отправки. Это не про ваш репозиторий — сообщите нам.",
    "push-rejected": "GitHub отказал в записи. Обычно это истёкший токен: выпустите новый и повторите третий шаг.",
    network: "GitHub не ответил. Это не про ваши данные — попробуйте ещё раз через минуту.",
  },
  reasonUnknown: "Причина неизвестна. Попробуйте ещё раз; если повторится — сообщите нам.",
  pushedAt: "Отправлено:",
  linkLabel: "ваш репозиторий",
  goPrev: "К предыдущему шагу",
  goNext: "К следующему шагу",
};

const en: StepFourStrings = {
  pageTitle: "Starter template",
  pageHint: "The way from an empty repository to a working site — one step at a time.",

  badge: "Step four · closed by the system",
  title: "Push the project to GitHub",
  lead:
    "Connecting the credentials does not move a single file. The push does: it takes what is on the server right now and puts it into your repository.",
  info:
    "How to tell it worked: open the repository in a browser and refresh. Files appear, and the commit list shows one entry from this server.",
  important:
    "Until the push is pressed, the repository stays empty — and that reads as «it did not work». The three previous steps only prepared access; none of them moved files.",
  actionLead: "One press. The push goes from the server straight into your repository.",
  bullets: [
    "What is pushed is what lies in your application on the server right now",
    "The address and token confirmed on step three are used",
    "The push touches nothing except your repository",
  ],
  stepOf: "Step {n} of {total}",
  done: "Step finished",

  cta: "Push the project",
  busy: "Pushing…",
  successTitle: "The project was pushed",
  successHint: "Open the repository and refresh — the files are already there",
  failureTitle: "The push did not go through",
  reasons: {
    "not-verified": "Go back to step three and confirm the connection first — the push uses verified credentials.",
    "no-project": "No application was found on the server to push. This is not about your repository — tell us.",
    "push-rejected": "GitHub refused the write. Usually an expired token: issue a new one and repeat step three.",
    network: "GitHub did not answer. This is not about your credentials — try again in a minute.",
  },
  reasonUnknown: "The reason is unknown. Try again; if it repeats, tell us.",
  pushedAt: "Pushed:",
  linkLabel: "your repository",
  goPrev: "To the previous step",
  goNext: "To the next step",
};

const DICT: Record<string, StepFourStrings> = { en, ru };

export function stepFourStrings(lang: string): StepFourStrings {
  return DICT[lang] ?? en;
}
