// Раздел «Запуск проекта» — путь от пустого репозитория до первого изменения,
// увиденного на собственном адресе (шаг 25; прежде «Подключить GitHub», шаг 501).
//
// 🔒 АДРЕС РАЗДЕЛА НЕ ПОМЕНЯЛСЯ (решение владельца 2026-08-26). Сюда ведут крошки,
// меню, предупреждение подвала и руководство «Как построить этот проект»; сменить
// slug ради нового заголовка значило бы переучивать всё это разом. Поменялось имя
// на экране: GitHub — первые три шага пути, а не отдельная работа.
//
// 🔒 ЭКРАН ВЫБОРА ЗАКРЫВАЕТ СОБОЙ ВСЁ ОСТАЛЬНОЕ. Пока путь не выбран, ни полей, ни
// кнопок, ни состояния связи на странице нет. Показанное действие читается как
// требуемое, и четыре требования на входе — ровно то, из-за чего настройку
// бросали.
//
// Динамическая: состояние связи, выбранный путь и пройденные шаги — живые.

import Link from "next/link";
import { GitBranch, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { getAdminStrings } from "@/lib/i18n/admin-strings";
import { adminHref } from "@/lib/admin-nav";
import { readLaunch } from "@/lib/launch";
import { readLocalizedContent } from "@/lib/content/localized-content";
import { PageShell } from "../_components/page-shell";
import { HelpDetails } from "../_components/help-details";
import { GuideProse } from "../how-to-build/_components/guide-prose";
import { readGitStatus } from "./_lib/git";
import { ConnectForm } from "./_components/connect-form.client";
import { StartChoice } from "./_components/start-choice.client";
import { LaunchReset } from "./_components/launch-reset.client";
import { StepBeads } from "./_components/step-beads";
import { LaunchStep } from "./_components/launch-step";
import { ShimmerLink } from "./_components/shimmer-link";
import { VerifyButton } from "./_components/verify-button.client";
import { StepCheck } from "./_components/step-check.client";
import { CopyBlock } from "./_components/copy-block.client";
import { LaunchFinish } from "./_components/launch-finish";

export const dynamic = "force-dynamic";

const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

export default async function GitHubPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const s = getAdminStrings(lang);
  const g = s.github;
  const l = s.launch;

  // 🔒 ОСТРОВКУ ОТДАЮТСЯ ТОЛЬКО ЕГО СОБСТВЕННЫЕ СЛОВА, ПЕРЕЧИСЛЕННЫЕ ПОИМЁННО.
  //
  // Тип `LaunchResetLabels` называет девять ключей, и `labels={l}` компилируется:
  // лишние поля при передаче переменной TypeScript пропускает. Но тип не сужает
  // РАНТАЙМ — по проводу уезжал весь раздел `launch` целиком, все 33 ключа,
  // включая подписи кнопок экрана выбора. В разметке они остаются даже после
  // того, как экран выбора сменился шагами.
  //
  // ✗ Поймано негативным контролем 25-1: приёмка требовала, чтобы после выбора
  // пути подписи трёх кнопок дали 0 совпадений, а они дали 1 — из этого payload.
  // Утечка на 33 ключа мелка рядом с законом «словарь панели серверный», и корень
  // у неё тот же: клиенту достаётся то, чего он не просил.
  const resetLabels = {
    restart: l.restart, restartTitle: l.restartTitle, restartBody: l.restartBody,
    restartKeep: l.restartKeep, restartWithGithub: l.restartWithGithub,
    restartWithGithubHint: l.restartWithGithubHint, restartCancel: l.restartCancel,
    restartDone: l.restartDone, restartFailed: l.restartFailed,
  };

  const launch = readLaunch();

  // ── Путь ещё не выбран ─────────────────────────────────────────────────────
  //
  // Текст окна переезда разбирает СЕРВЕР и отдаёт островку готовым деревом:
  // библиотека разбора markdown в браузер не уезжает. Файла нет — окно всё равно
  // открывается, но с честной строкой вместо текста, а не пустым.
  if (launch.mode === null) {
    const doc = readLocalizedContent("launch-migration-modal", lang);

    return (
      <PageShell lang={lang} slug="github" s={s} title={s.pages.github.title} hint={s.pages.github.hint}>
        <StartChoice
          labels={{
            chooseTitle: l.chooseTitle, chooseLead: l.chooseLead,
            starterTitle: l.starterTitle, starterBody: l.starterBody, starterCta: l.starterCta,
            starterMoreLabel: l.starterMoreLabel, starterMore: l.starterMore,
            adoptTitle: l.adoptTitle, adoptBody: l.adoptBody, adoptCta: l.adoptCta,
            adoptMoreLabel: l.adoptMoreLabel, adoptMore: l.adoptMore,
            migrationCta: l.migrationCta, migrationTitle: l.migrationTitle,
            migrationOpen: l.migrationOpen, chooseFailed: l.chooseFailed,
          }}
          migrationDoc={
            doc.ok ? (
              <>
                {doc.isFallback && (
                  <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground/80">
                    {s.content.englishFallback}
                  </p>
                )}
                <GuideProse markdown={doc.text} />
              </>
            ) : (
              <p className="text-[11px] text-destructive">{s.howToBuild.missing}</p>
            )
          }
          migrationHref={adminHref(lang, "development-mode")}
        />

        <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">
          {g.seeAlso}{" "}
          <Link href={adminHref(lang, "github-about")} className="underline">{s.pages["github-about"].title}</Link>
          {" · "}
          <Link href={adminHref(lang, "deployments")} className="underline">{s.pages.deployments.title}</Link>
        </p>
      </PageShell>
    );
  }

  // ── Путь выбран ────────────────────────────────────────────────────────────
  const result = await readGitStatus();

  if (!result.ok) {
    return (
      <PageShell lang={lang} slug="github" s={s} title={s.pages.github.title} hint={s.pages.github.hint}>
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-[12px] font-medium text-destructive">{g.unavailable}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{result.reason}</p>
        </div>
        <div className="mt-4"><LaunchReset labels={resetLabels} /></div>
      </PageShell>
    );
  }

  const st = result.status;

  // Единственный открытый шаг — первый незакрытый. `undefined`, когда пройдено
  // всё: тогда блока шага нет вовсе, и это законное состояние (финал — 25-6).
  const cur = launch.steps[launch.current];

  // Проза шага — файлом, не ключом словаря: она длинная, её правят как текст, и
  // корпус на 82 языка не растёт на каждый абзац. Файла нет — блок просто без
  // прозы, а не пустой экран.
  const stepDoc = cur ? readLocalizedContent(`launch-step-${cur.id}`, lang) : null;

  // Причины отказа проверки — плоскими ключами, собираются в карту здесь, на
  // сервере. Островку уезжают только те строки, которые ему нужны.
  //
  // ✗ Подпись кнопки была `checkLabel` — «Я выполнил этот шаг», то есть подпись
  // ЧЕКБОКСА. Кнопка машинного шага говорила человеку обратное тому, что делает:
  // проверяет система, а надпись предлагала подтвердить самому. У каждого
  // машинного шага теперь своя подпись.
  const verifyCta: Partial<Record<string, string>> = {
    repo: l.verifyRepoCta, key: l.verifyKeyCta, upload: l.verifyUploadCta,
  };
  const verifyLabels = {
    action: (cur && verifyCta[cur.id]) || l.verifyRepoCta,
    checking: l.verifying,
    failedPrefix: l.verifyFailed,
    reasons: {
      repo_not_set: l.reasonRepoNotSet, repo_not_found: l.reasonRepoNotFound,
      auth_failed: l.reasonAuthFailed, network: l.reasonNetwork,
      key_not_issued: l.reasonKeyNotIssued, no_main_branch: l.reasonNoMainBranch,
      not_implemented_yet: l.reasonNotImplemented, unknown: l.reasonUnknown,
    },
  };

  return (
    <PageShell lang={lang} slug="github" s={s} title={s.pages.github.title} hint={s.pages.github.hint}>
      {/* Полоса состояния — серверная: правда видна и без JS. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border px-3 py-2 text-[11px]">
        <span className="flex items-center gap-1.5">
          <GitBranch size={12} className="text-muted-foreground" />
          {st.repoUrl
            ? <span className="font-mono text-foreground">{st.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}</span>
            : <span className="text-muted-foreground">{g.noRepo}</span>}
        </span>

        {st.state === "working" ? (
          <span className="flex items-center gap-1 text-[10px] text-green-500">
            <CheckCircle size={10} />{g.stateWorking}
          </span>
        ) : st.state === "unverified" ? (
          <span className="flex items-center gap-1 text-[10px] text-orange-500">
            <AlertCircle size={10} />{g.stateUnverified}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">{g.stateUnconfigured}</span>
        )}

        {st.verifiedAt && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {fill(g.verifiedAt, { when: new Date(st.verifiedAt).toLocaleString() })}
          </span>
        )}
      </div>

      {/* Цена невыполненной настройки, названная прямо: без git код с сервера не
          уезжает никуда, а выгрузка данных его не несёт. Серверная — видна и без JS. */}
      {st.state === "unconfigured" && (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-[10px] leading-relaxed text-destructive">
          {g.notConnected}
        </p>
      )}

      {/* «Данные введены, но GitHub их не подтвердил» — то состояние, которое
          выглядит как рабочее и им не является. Названо отдельно. */}
      {st.state === "unverified" && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md border border-orange-500/40 bg-orange-500/5 p-2.5 text-[10px] leading-relaxed text-orange-700 dark:text-orange-300">
          <XCircle size={11} className="mt-0.5 shrink-0" />
          <span>{g.unverifiedHint}</span>
        </p>
      )}

      {/* 🪦 СЧЁТЧИК «файлов только на этом сервере» УДАЛЁН (владелец 2026-08-13).
          Он стоял здесь янтарной тревогой с примерами имён, и на первом
          подключении — единственном месте, где эту страницу читают внимательно, —
          сообщал бессмыслицу: до первой отправки «только здесь» лежит ВЕСЬ
          проект, так что число говорило лишь «файлов в проекте 41», а выглядело
          как список потерь. Когда связь уже работает, то же число живёт в подвале
          строкой состояния, и второй его источник расходился бы с первым.
          Не воскрешать: страница отвечает на «как подключить», а не «что у меня
          не сохранено». */}

      {/* Верёвочка с бусинами — сверху, над единственным открытым шагом. */}
      <div className="mt-4">
        <StepBeads
          done={launch.steps.map((x) => x.done)}
          current={launch.current}
          labels={{ stepOf: l.stepOf }}
        />
      </div>

      {/* 🔒 РОВНО ОДИН БЛОК ШАГА. Пройденные свёрнуты в зелёные бусины, будущих
          не видно. Всё пройдено — блока нет вовсе, и это законное состояние:
          финальный экран строится в 25-6.

          ⏳ ДО ПОДШАГА 25-3 содержимое есть только у шага `repo` — это прежняя
          рабочая форма подключения, переехавшая внутрь блока. Остальные шаги
          показывают свою суть и честную строку «содержимое строится». Половина
          способности хуже её отсутствия: форму нельзя было убрать раньше, чем
          25-3 даст ей замену. */}
      {cur && (
        <LaunchStep
          index={launch.current}
          total={launch.total}
          title={l.steps[cur.id].title}
          lead={l.steps[cur.id].lead}
          kind={cur.kind}
          labels={{ stepOf: l.stepOf, machineOnly: l.machineOnly }}
        >
          {/* Проза шага — общая для всех, идёт первой. */}
          {stepDoc?.ok && (
            <div className="mb-3">
              {stepDoc.isFallback && (
                <p className="mb-2 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground/80">
                  {s.content.englishFallback}
                </p>
              )}
              <GuideProse markdown={stepDoc.text} />
            </div>
          )}

          {cur.id === "repo" ? (
        <>
          {/* Крупная переливающаяся надпись — решение владельца: способность
              существовала и не работала, потому что кнопку не замечали. */}
          <p className="mb-3">
            <ShimmerLink href="https://github.com/new">{l.createRepoCta}</ShimmerLink>
          </p>
        <ConnectForm
          repoUrl={st.repoUrl}
          hasToken={st.hasToken}
          canPush={st.state !== "unconfigured"}
          labels={{
            repoLabel: g.repoLabel, repoPlaceholder: "https://github.com/owner/repository",
            tokenLabel: g.tokenLabel, tokenPlaceholder: "ghp_…", tokenReplace: g.tokenReplace,
            connect: g.connect, connecting: g.connecting, connected: g.connected,
            push: g.push, pushing: g.pushing, pushed: g.pushed,
            failed: g.failed, outputLabel: g.outputLabel,
          }}
          guide={{
            step1Title: g.step1Title, step1Link: g.step1Link, step1Body: g.step1Body,
            step2Title: g.step2Title, step2Link: g.step2Link, step2Steps: g.step2Steps,
            step2Note: g.step2Note, step2Saved: g.step2Saved,
            step3Title: g.step3Title, step3Body: g.step3Body,
            step4Title: g.step4Title, step4Body: g.step4Body,
            step4Check: g.step4Check, step4Open: g.step4Open,
          }}
        />
          <div className="mt-3">
            <VerifyButton step="repo" labels={verifyLabels} />
          </div>
        </>
          ) : cur.id === "key" ? (
            // 🔒 Кнопка ключа ПУЛЬСИРУЕТ — второй способ обратить внимание,
            // названный владельцем. Сама выдача живёт на вкладке `env`, здесь —
            // проверка факта: ключ либо есть на диске, либо его нет.
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={adminHref(lang, "env")}
                className="launch-pulse inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-orange-500"
              >
                {l.issueKeyCta}
              </Link>
              <VerifyButton step="key" labels={verifyLabels} pulse={false} />
            </div>
          ) : cur.id === "upload" ? (
            <VerifyButton step="upload" labels={verifyLabels} pulse />
          ) : cur.id === "first-prompt" ? (
            // 🔒 АДРЕС РЕПОЗИТОРИЯ ПОДСТАВЛЯЕТСЯ, А ПУСТОТА НАЗЫВАЕТСЯ ВСЛУХ.
            // Инструкция без адреса бесполезна, но `{repoUrl}` в чате выглядит
            // поломкой, а пустое место — недосмотром. Честная скобка говорит
            // человеку, что вернуться надо к первому шагу.
            <div className="space-y-3">
              <CopyBlock
                text={fill(l.firstPromptText, { repoUrl: launch.repoUrl || l.repoUnknown })}
                labels={{ copy: l.copyCta, copied: l.copiedNote, failed: l.copyFailed }}
              />
              <StepCheck
                step={cur.id}
                initial={cur.done}
                labels={{ label: l.checkLabel, saving: l.checkSaving, failed: l.checkFailed }}
              />
            </div>
          ) : cur.id === "env" ? (
            // Шаг уводит на соседнюю вкладку и обязан привести обратно: ссылка
            // рядом с галочкой, а не вместо неё.
            <div className="space-y-3">
              <Link
                href={adminHref(lang, "env")}
                className="launch-pulse inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-orange-500"
              >
                {s.pages.env.title}
              </Link>
              <StepCheck
                step={cur.id}
                initial={cur.done}
                labels={{ label: l.checkLabel, saving: l.checkSaving, failed: l.checkFailed }}
              />
            </div>
          ) : cur.id === "first-change" || cur.id === "first-deploy" ? (
            // Две последние инструкции для агента. Обе задают ему режим работы
            // шагами разработки — на пустой папке он про него иногда забывает.
            <div className="space-y-3">
              <CopyBlock
                text={cur.id === "first-change" ? l.firstChangeText : l.firstDeployText}
                labels={{ copy: l.copyCta, copied: l.copiedNote, failed: l.copyFailed }}
              />
              <StepCheck
                step={cur.id}
                initial={cur.done}
                labels={{ label: l.checkLabel, saving: l.checkSaving, failed: l.checkFailed }}
              />
            </div>
          ) : cur.kind === "checked" ? (
            // 🔒 Человеческий шаг закрывает ЧЕЛОВЕК, и отметка снимаемая. У панели
            // нет глаз на его машине: проверить, что папка создана и подписка
            // активирована, она не может и делать вид не будет.
            <StepCheck
              step={cur.id}
              initial={cur.done}
              labels={{ label: l.checkLabel, saving: l.checkSaving, failed: l.checkFailed }}
            />
          ) : (
            // ⏳ Машинный шаг `adopt` — поток B, строится в 25-7. До тех пор блок
            // честно показывает суть прозой и не притворяется работающим.
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
              {l.reasonNotImplemented}
            </p>
          )}
        </LaunchStep>
      )}

      {/* 🔒 ПРОЙДЕНО ВСЁ — вместо блока шага финальный экран. `cur` здесь
          `undefined` по построению: `current` равен `total`, и `steps[total]`
          не существует. Это не «пустое состояние», а законный конец пути. */}
      {!cur && (
        <LaunchFinish
          email="admin@fractera.ai"
          labels={{
            title: l.finishTitle, lead: l.finishLead,
            askTitle: l.finishAskTitle, askBody: l.finishAskBody,
            stepsTitle: l.finishStepsTitle, stepsBody: l.finishStepsBody,
            stepsPhrase: l.finishStepsPhrase,
            bye: l.finishBye, contact: l.finishContact,
          }}
        />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {g.seeAlso}{" "}
          <Link href={adminHref(lang, "github-about")} className="underline">{s.pages["github-about"].title}</Link>
          {" · "}
          <Link href={adminHref(lang, "deployments")} className="underline">{s.pages.deployments.title}</Link>
        </p>
        <LaunchReset labels={resetLabels} />
      </div>

      <HelpDetails label={g.helpLabel}>
        <p><strong>{g.helpWhyTitle}</strong> {g.helpWhy}</p>
        <p><strong>{g.helpFirstTitle}</strong> {g.helpFirst}</p>
        <p><strong>{g.helpTokenTitle}</strong> {g.helpToken}</p>
        <p><strong>{g.helpDataTitle}</strong> {g.helpData}</p>
      </HelpDetails>
    </PageShell>
  );
}
