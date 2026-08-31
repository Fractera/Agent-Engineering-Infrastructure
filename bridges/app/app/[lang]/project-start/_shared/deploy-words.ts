// ОБЪЯСНЕНИЕ РАЗВЁРТЫВАНИЯ — ОДНО НА ОБА ПУТИ (переехало сюда в 35-7).
//
// 🔒 ДВА ОБЪЯСНЕНИЯ ОДНОГО СЛОВА РАЗОЙДУТСЯ. Фраза «запусти развёртывание на
// моём сервере» — единственная, которую человек унесёт с собой и будет
// повторять сам; она обязана звучать одинаково на обоих путях. Текст ПЕРЕЕХАЛ
// из `default-template/_step10.ts` дословно, а не был переписан.
//
// 🔒 ПОЧЕМУ ПЕРЕЕХАЛА ТОЛЬКО ОНА, А НЕ ВЕСЬ `_step10`. Десятый шаг первого пути
// — про очистку главной и «Hello Fractera»; у второго пути этого нет и быть не
// может: человек пришёл ЗА чужим дизайном. Общее здесь ровно одно предложение.

/**
 * Голубая подсказка: что такое развёртывание и какая фраза его запускает.
 *
 * 🔒 АДРЕС ЖИВОЙ, А НЕ ВЫДУМАННЫЙ. Сервер сам говорит, работает он за доменом
 * или по IP (`publicSiteUrl()`), и подставляется именно его ответ. Написать «ваш
 * адрес» вообще — заставить человека гадать в ту минуту, когда он впервые ищет
 * свой проект в интернете; написать неверный режим — пообещать `https://` тому,
 * кто работает по IP.
 *
 * 🔒 ВЕТКА БЕЗ АДРЕСА НУЖНА И НЕ ЯВЛЯЕТСЯ ЗАПАСНОЙ. Сервер в защищённом режиме
 * без пройденного визарда домена честно отвечает «не знаю», и текст обязан
 * читаться связно без адреса — иначе в предложении окажется дыра.
 */
export function whatDeployMeans(lang: string, siteUrl: string | null): string {
  const ru = siteUrl
    ? `Фраза, которая превращает вашу разработку в настоящий интернет-проект, звучит так: «запусти развёртывание на моём сервере». По ней агент отправляет файлы проекта на ваш сервер, собирает их там заново и подменяет работающую версию новой. До этой минуты ваши изменения жили только на localhost:3000, то есть на вашей машине; после неё их видит любой, кто откроет ${siteUrl}. Занимает это несколько минут — примерно как установка зависимостей на восьмом шаге, и по той же причине: проект собирается целиком.`
    : `Фраза, которая превращает вашу разработку в настоящий интернет-проект, звучит так: «запусти развёртывание на моём сервере». По ней агент отправляет файлы проекта на ваш сервер, собирает их там заново и подменяет работающую версию новой. До этой минуты ваши изменения жили только на localhost:3000, то есть на вашей машине; после неё их видит любой, кто откроет адрес вашего сервера. Занимает это несколько минут — примерно как установка зависимостей на восьмом шаге, и по той же причине: проект собирается целиком.`;
  const en = siteUrl
    ? `The phrase that turns your work into a real internet project is this one: "deploy this to my server". On it the agent sends the project files to your server, builds them there anew and replaces the running version with yours. Until this minute your changes lived on localhost:3000 only — on your machine; after it anyone who opens ${siteUrl} sees them. It takes a few minutes — about as long as installing dependencies on step eight, and for the same reason: the whole project is being built.`
    : `The phrase that turns your work into a real internet project is this one: "deploy this to my server". On it the agent sends the project files to your server, builds them there anew and replaces the running version with yours. Until this minute your changes lived on localhost:3000 only — on your machine; after it anyone who opens your server address sees them. It takes a few minutes — about as long as installing dependencies on step eight, and for the same reason: the whole project is being built.`;
  return lang === "ru" ? ru : en;
}
