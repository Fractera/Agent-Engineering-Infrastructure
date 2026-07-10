import Script from "next/script";

// Inline theme bootstrap (runs before paint to avoid a light/dark flash). Shared by
// every root-owning zone ([lang] + (service)) after the static-rendering refactor
// (step 131), so the script lives in one place instead of being duplicated per layout.
const defaultTheme = process.env.NEXT_PUBLIC_DEFAULT_THEME ?? "light";

const themeScript = `
(function() {
  var saved = localStorage.getItem('fractera-theme');
  var theme = saved || '${defaultTheme}';
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
})();
`;

export function ThemeInit() {
  return (
    <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
  );
}
