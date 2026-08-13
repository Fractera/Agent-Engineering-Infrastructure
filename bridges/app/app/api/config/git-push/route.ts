import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { requireAuth } from "@/lib/require-auth";
import fs from "fs";

const execAsync = promisify(exec);
const APP_ENV     = process.env.APP_ENV_PATH ?? "/opt/fractera/app/.env.local";
const PROJECT_DIR = "/opt/fractera/app";

function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1);
  }
  return result;
}

function authUrl(repo: string, token: string): string {
  return token ? repo.replace("https://", `https://x-access-token:${token}@`) : repo;
}

function maskToken(s: string): string {
  return s.replace(/x-access-token:[^@]+@/g, "");
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const vars = fs.existsSync(APP_ENV) ? parseEnv(fs.readFileSync(APP_ENV, "utf-8")) : {};
    const repoUrl = vars["USER_GITHUB_REPO_URL"] ?? "";
    const token   = vars["USER_GITHUB_ACCESS_TOKEN"] ?? "";

    if (!repoUrl) {
      return NextResponse.json({
        success: false,
        error: "USER_GITHUB_REPO_URL not set. Add it in Settings → Env Variables.",
      }, { status: 400 });
    }

    const url  = authUrl(repoUrl, token);
    const body = await req.json().catch(() => ({})) as { message?: string };
    const msg  = (body.message ?? "").trim() || `admin: push ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const opts = { timeout: 30000 };
    const lines: string[] = [];

    // Init local repo if this is first time
    if (!fs.existsSync(`${PROJECT_DIR}/.git`)) {
      const { stdout, stderr } = await execAsync(
        `git -C ${PROJECT_DIR} init && git -C ${PROJECT_DIR} symbolic-ref HEAD refs/heads/main`,
        opts
      );
      lines.push((stdout + stderr).trim());
    }

    // The project branch is ALWAYS `main` — and that has to be ENFORCED, not assumed.
    //
    // Measured live 2026-08-13: the slot on a running server sat on `master`, its work
    // committed and safe, and this route answered `error: src refspec main does not match
    // any` — a message that names a branch the owner never chose and says nothing about
    // what to do. The cause is not exotic: `git init` follows `init.defaultBranch`, that
    // setting is empty on a fresh Ubuntu, and git's built-in default is still `master`. So
    // any repository born outside bootstrap.sh (which does set `main`) arrives here named
    // differently, and pushing a branch by a name nobody created can only fail.
    //
    // Renaming is safe in both directions: `branch -M main` is a no-op when the branch is
    // already `main`, and it keeps every commit — only the name moves. An unborn HEAD (a
    // repository with no commits yet) cannot be renamed at all, so there the name is set
    // through the symbolic ref instead.
    //
    // These lines are English like the rest of this route's output: they are shown next to
    // raw git output, and a Russian sentence inside a git log would read as a broken line
    // rather than as a translation.
    const hasCommits = await execAsync(`git -C ${PROJECT_DIR} rev-parse --verify HEAD`, opts)
      .then(() => true).catch(() => false);
    if (!hasCommits) {
      await execAsync(`git -C ${PROJECT_DIR} symbolic-ref HEAD refs/heads/main`, opts).catch(() => null);
    } else {
      const current = await execAsync(`git -C ${PROJECT_DIR} rev-parse --abbrev-ref HEAD`, opts)
        .then(r => r.stdout.trim()).catch(() => "");
      if (current && current !== "main") {
        await execAsync(`git -C ${PROJECT_DIR} branch -M main`, opts).catch(() => null);
        lines.push(`Project branch renamed: ${current} -> main (the repository keeps every commit).`);
      }
    }

    // Create .gitignore if missing (prevents node_modules / .next / secrets from being committed)
    const gitignorePath = `${PROJECT_DIR}/.gitignore`;
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, [
        "node_modules/",
        ".next/",
        "out/",
        ".env.local",
        ".env*.local",
        "storage/",
        "data/*.sqlite",
        "data/*.sqlite-shm",
        "data/*.sqlite-wal",
      ].join("\n") + "\n", "utf-8");
    }

    // `app/.gitkeep` belongs to the substrate: it is how ai-workspace keeps the empty slot
    // directory in its own history, and any checkout there puts it back. It is not part of
    // the user's project and must not travel to the user's repository. Exclude it locally
    // rather than editing the guest's .gitignore — that file belongs to the guest repo.
    const excludePath = `${PROJECT_DIR}/.git/info/exclude`;
    if (fs.existsSync(`${PROJECT_DIR}/.git/info`)) {
      const current = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, "utf-8") : "";
      // Same reasoning for `.next.last-good`: it is the deploy fallback copy of the build output, a
      // machine artifact of THIS server. `.gitignore` covers `.next/` but not this sibling name.
      const wanted = ["/.gitkeep", "/.next.last-good/"];
      const present = current.split("\n").map(l => l.trim());
      const missing = wanted.filter(w => !present.includes(w));
      if (missing.length) {
        fs.appendFileSync(excludePath, `${current.endsWith("\n") || !current ? "" : "\n"}${missing.join("\n")}\n`, "utf-8");
      }
    }
    await execAsync(`git -C ${PROJECT_DIR} rm --cached -q --ignore-unmatch .gitkeep`, opts).catch(() => null);

    // Ensure remote points to user's repo
    await execAsync(
      `git -C ${PROJECT_DIR} remote set-url origin "${url}" 2>/dev/null || git -C ${PROJECT_DIR} remote add origin "${url}"`,
      opts
    ).catch(() => null);

    // A shallow repository cannot be pushed. The slot arrives from bootstrap as
    // `git clone --depth 1`, so its only commit has a truncated parent; git then sends a
    // thin pack based on that missing object and the remote answers "did not receive
    // expected object ... index-pack failed". The starter history is of no use in the
    // user's own repository anyway, so detach from it once: a single root commit holding
    // the current tree. Order matters — .git/shallow must go before gc, otherwise gc
    // trips over entries whose commits it is about to prune.
    // 🔒 НО ТОЛЬКО ЕСЛИ РЕПОЗИТОРИЙ ПОЛЬЗОВАТЕЛЯ ЕЩЁ ПУСТ (владелец 2026-08-13,
    // по реальной поломке).
    //
    // ЧТО СЛУЧИЛОСЬ. Лечение ниже рассчитано на слот, который отправляют ВПЕРВЫЕ:
    // оно отрезает усечённую историю стартера и делает один корневой коммит. Но
    // мелкий клон остаётся мелким и ПОСЛЕ первой отправки, поэтому вторая
    // отправка отрезала историю снова — уже ту, что лежала в репозитории
    // пользователя. Два дерева оказывались без общего предка, и git отказывал:
    // «Updates were rejected… the remote contains work that you do not have».
    //
    // Владельцу это стоило пяти коммитов: единственным выходом оставалась
    // отправка с перезаписью. Сама отправка при этом ничего не ломала — ломало
    // молчаливое обрезание истории до неё.
    //
    // Поэтому спрашиваем УДАЛЁННЫЙ репозиторий. Есть там ветка — историю не
    // трогаем вовсе: связь уже установлена, и рвать её второй раз нельзя. Пуст —
    // лечим, как и раньше.
    //
    // `ls-remote` спрашивает только ссылки, ничего не качая, и отвечает за
    // секунды. Отказ сети трактуем как «репозиторий не пуст»: не отрезать лишний
    // раз безопаснее, чем отрезать по ошибке связи — в худшем случае отправка
    // честно скажет о мелком клоне, и это чинится, а стёртая история — нет.
    const remoteHasWork = await execAsync(`git -C ${PROJECT_DIR} ls-remote --heads origin`, { ...opts, timeout: 30000 })
      .then(r => r.stdout.trim().length > 0)
      .catch(() => true);

    const isShallow = await execAsync(`git -C ${PROJECT_DIR} rev-parse --is-shallow-repository`, opts)
      .then(r => r.stdout.trim() === "true")
      .catch(() => false);

    if (isShallow && remoteHasWork) {
      // Мелкий клон, но репозиторий уже не пуст: историю НЕ режем. Отправка
      // может отказать по усечённому дереву — тогда человек увидит настоящую
      // причину и решение примет он, а не мы за него молча.
      lines.push(
        "Репозиторий уже содержит историю — отсечение истории пропущено намеренно. " +
        "Если отправка откажет из-за усечённого клона, историю нужно объединить осознанно, а не переписать.",
      );
    }

    if (isShallow && !remoteHasWork) {
      const ident = `-c user.email="admin@fractera.ai" -c user.name="Fractera Admin"`;
      const heal = await execAsync(
        `git -C ${PROJECT_DIR} checkout --orphan fractera-detached && ` +
        `git -C ${PROJECT_DIR} add -A && ` +
        `git -C ${PROJECT_DIR} ${ident} commit -m "Fractera slot: project baseline" && ` +
        `git -C ${PROJECT_DIR} branch -M main && ` +
        `rm -f ${PROJECT_DIR}/.git/shallow && ` +
        // Remote-tracking refs still describe the STARTER, not the user's repository, and
        // they keep the truncated commit alive — repack then dies on its missing parent.
        `for r in $(git -C ${PROJECT_DIR} for-each-ref --format='%(refname)' refs/remotes); do ` +
        `git -C ${PROJECT_DIR} update-ref -d "$r"; done; ` +
        `rm -rf ${PROJECT_DIR}/.git/refs/remotes && ` +
        `git -C ${PROJECT_DIR} reflog expire --expire=now --all && ` +
        `git -C ${PROJECT_DIR} gc --prune=now --quiet`,
        { timeout: 120000 }
      ).catch(e => ({ stdout: e.stdout ?? "", stderr: (e.stderr ?? e.message) + "\nDetach from truncated history failed." }));
      lines.push("Truncated starter history detached: rebuilt as a single root commit.");
      lines.push((heal.stdout + heal.stderr).trim());
    }

    // Stage all changes
    const { stdout: s1, stderr: e1 } = await execAsync(`git -C ${PROJECT_DIR} add -A`, opts);
    lines.push((s1 + e1).trim());

    // Commit (ignore exit 1 when nothing new to commit — push still runs for pending commits)
    const commitRes = await execAsync(
      `git -C ${PROJECT_DIR} -c user.email="admin@fractera.ai" -c user.name="Fractera Admin" commit -m "${msg.replace(/"/g, "'")}"`,
      opts
    ).catch(e => ({ stdout: e.stdout ?? "", stderr: e.stderr ?? "" }));
    lines.push((commitRes.stdout + commitRes.stderr).trim());

    // Push
    const { stdout: s3, stderr: e3 } = await execAsync(
      `git -C ${PROJECT_DIR} push -u origin main`,
      opts
    );
    lines.push((s3 + e3).trim());

    return NextResponse.json({ success: true, output: maskToken(lines.filter(Boolean).join("\n")) });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: maskToken((e.stdout ?? "") + (e.stderr ?? e.message)),
    }, { status: 500 });
  }
}
