import Script from "next/script";

// Инициализация ширины колонки зоны ДО первой отрисовки (тот же приём, что ThemeInit).
// Делает две вещи:
//   1) поднимает сохранённый выбор владельца (localStorage) в html[data-zone-width],
//      чтобы широкий режим не «прыгал» после гидрации;
//   2) измеряет ширину полосы прокрутки в --zone-sbw: 100vw её включает, и без этой
//      поправки широкий режим (100vw - 64px) вылезал бы за экран горизонтально.
// Пересчёт на resize и load — полоса прокрутки появляется/исчезает вместе с высотой
// контента. Ключ хранения общий с переключателем в футере (zone-width-toggle.client.tsx).
const zoneWidthScript = `
(function() {
  var el = document.documentElement;
  try {
    if (localStorage.getItem('fractera-zone-width') === 'wide') {
      el.setAttribute('data-zone-width', 'wide');
    }
  } catch (e) {}
  function sbw() {
    var v = window.innerWidth - el.clientWidth;
    el.style.setProperty('--zone-sbw', (v > 0 ? v : 0) + 'px');
  }
  sbw();
  window.addEventListener('resize', sbw);
  window.addEventListener('load', sbw);
})();
`;

export function ZoneWidthInit() {
  return (
    <Script
      id="zone-width-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: zoneWidthScript }}
    />
  );
}
