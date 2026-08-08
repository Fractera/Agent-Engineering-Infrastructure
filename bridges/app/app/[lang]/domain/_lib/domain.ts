// Серверное чтение состояния личного домена (шаг 501, Ф2, партия 9).
//
// Читаем те же данные, что и визард, но ДО отдачи страницы — чтобы состояние
// (какой домен, защищённый режим или IP, до какого числа сертификат, на каком
// шаге остановились) было видно даже с выключенным JS. У страницы, способной
// переключить сервер на HTTPS, это не украшение: владелец обязан видеть правду о
// состоянии прежде, чем что-то нажимать.
//
// Маршруты домена НЕ ТРОГАЕМ ни один. Это проверенная в бою цепочка, которая
// умеет запереть владельца снаружи при ошибке; переносится интерфейс, а не она.

import { headers } from "next/headers";

const ADMIN = process.env.ADMIN_INTERNAL_URL ?? "http://127.0.0.1:3002";

export type WizardState = {
  domain: string | null;
  serverIp: string | null;
  expectedHosts?: string[];
  step1: { complete: boolean; missingHosts?: string[] };
  step2: {
    complete: boolean;
    certSource: "auto" | "upload" | null;
    certPath?: string;
    certExists?: boolean;
    certSans?: string[];
    certExpiresAt?: string | null;
    status?: string;
    error?: string | null;
    hosts?: { host: string; covered: boolean }[];
  };
  step3: { ready?: boolean; complete?: boolean };
  step4: { complete: boolean };
  currentStep?: 1 | 2 | 3 | 4 | 5;
};

export type DomainState = { ok: true; state: WizardState } | { ok: false; reason: string };

// Состояние принадлежит сессии посетителя (маршрут за `requireAuth`), поэтому
// cookie пробрасывается, а страница динамическая.
export async function readDomainState(): Promise<DomainState> {
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const r = await fetch(`${ADMIN}/api/config/domain/wizard-state`, {
      headers: { cookie },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false, reason: `${r.status}` };
    return { ok: true, state: (await r.json()) as WizardState };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// Имена, которые владелец заводит у регистратора.
//
// Ровно ПЯТЬ, и это сверено с двумя источниками правды, а не скопировано:
//   • `SUBDOMAINS` в `app/api/config/domain/route.ts` = ["", "www", "auth",
//     "admin", "data"] — именно эти имена настраивает nginx и покрывает certbot
//     (шаг 500 убрал оттуда hermes и chat вместе с самими службами);
//   • живой сертификат на сервере: `openssl` показал те же пять имён.
//
// Старая панель просила СЕМЬ записей, включая hermes и chat, и это была ложь: две
// записи заводились под службы, снесённые задачей 3 шага 500, и им ничего не
// отвечало. Мой первый порт перенёс эту ложь дословно — владелец её заметил.
// Урок: список, который человек переписывает руками во внешнюю систему, сверяется
// с тем, что настраивает сервер, а не с тем, что рисовала прежняя страница.
export const DNS_HOSTS: { name: string; noteKey: string }[] = [
  { name: "@", noteKey: "apex" },
  { name: "www", noteKey: "www" },
  { name: "auth", noteKey: "auth" },
  { name: "admin", noteKey: "admin" },
  { name: "data", noteKey: "data" },
];
