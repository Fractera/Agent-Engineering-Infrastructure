// Co-located account-control strings. They BELONG to the account feature and are imported
// by nothing else — delete components/menu/account/ and they go with it (co-location rule).
//
// Four default strings across the FULL 82-language catalogue (config/translations/
// language-metadata.ts), English fallback for anything unlisted. `account` is the label of
// the account button/drawer: it is chosen IDIOMATICALLY per locale (how each language
// actually names this control), NOT translated literally — e.g. en "My account",
// ru "Личный кабинет", de "Mein Konto", ja "マイアカウント". `projects` heads the Projects
// accordion in the drawer (step 177); the category/project names inside it are NOT
// localized — the Projects layer is monolingual (§3.12).

export type AccountLabels = {
  signIn: string;   // not authenticated → opens the auth flow
  account: string;  // authenticated → opens the account drawer (idiomatic per locale)
  signOut: string;  // bottom of the drawer
  projects: string; // header of the Projects accordion (architect/manager only)
};

const ACCOUNT: Record<string, AccountLabels> = {
  en: { signIn: "Sign in", account: "My account", signOut: "Sign out", projects: "Projects" },
  fr: { signIn: "Se connecter", account: "Mon compte", signOut: "Se déconnecter", projects: "Projets" },
  es: { signIn: "Iniciar sesión", account: "Mi cuenta", signOut: "Cerrar sesión", projects: "Proyectos" },
  pt: { signIn: "Entrar", account: "Minha conta", signOut: "Sair", projects: "Projetos" },
  de: { signIn: "Anmelden", account: "Mein Konto", signOut: "Abmelden", projects: "Projekte" },
  it: { signIn: "Accedi", account: "Il mio account", signOut: "Esci", projects: "Progetti" },
  nl: { signIn: "Inloggen", account: "Mijn account", signOut: "Uitloggen", projects: "Projecten" },
  sv: { signIn: "Logga in", account: "Mitt konto", signOut: "Logga ut", projects: "Projekt" },
  no: { signIn: "Logg inn", account: "Min konto", signOut: "Logg ut", projects: "Prosjekter" },
  da: { signIn: "Log ind", account: "Min konto", signOut: "Log ud", projects: "Projekter" },
  fi: { signIn: "Kirjaudu sisään", account: "Oma tili", signOut: "Kirjaudu ulos", projects: "Projektit" },
  is: { signIn: "Skrá inn", account: "Aðgangurinn minn", signOut: "Skrá út", projects: "Verkefni" },
  el: { signIn: "Σύνδεση", account: "Ο λογαριασμός μου", signOut: "Αποσύνδεση", projects: "Έργα" },
  pl: { signIn: "Zaloguj się", account: "Moje konto", signOut: "Wyloguj się", projects: "Projekty" },
  cs: { signIn: "Přihlásit se", account: "Můj účet", signOut: "Odhlásit se", projects: "Projekty" },
  sk: { signIn: "Prihlásiť sa", account: "Môj účet", signOut: "Odhlásiť sa", projects: "Projekty" },
  hu: { signIn: "Bejelentkezés", account: "Fiókom", signOut: "Kijelentkezés", projects: "Projektek" },
  ro: { signIn: "Autentificare", account: "Contul meu", signOut: "Deconectare", projects: "Proiecte" },
  hr: { signIn: "Prijava", account: "Moj račun", signOut: "Odjava", projects: "Projekti" },
  sl: { signIn: "Prijava", account: "Moj račun", signOut: "Odjava", projects: "Projekti" },
  et: { signIn: "Logi sisse", account: "Minu konto", signOut: "Logi välja", projects: "Projektid" },
  lv: { signIn: "Pieslēgties", account: "Mans konts", signOut: "Iziet", projects: "Projekti" },
  lt: { signIn: "Prisijungti", account: "Mano paskyra", signOut: "Atsijungti", projects: "Projektai" },
  mt: { signIn: "Idħol", account: "Il-kont tiegħi", signOut: "Oħroġ", projects: "Proġetti" },
  ca: { signIn: "Inicia la sessió", account: "El meu compte", signOut: "Tanca la sessió", projects: "Projectes" },
  gl: { signIn: "Iniciar sesión", account: "A miña conta", signOut: "Pechar sesión", projects: "Proxectos" },
  cy: { signIn: "Mewngofnodi", account: "Fy nghyfrif", signOut: "Allgofnodi", projects: "Prosiectau" },
  ga: { signIn: "Logáil isteach", account: "Mo chuntas", signOut: "Logáil amach", projects: "Tionscadail" },
  eu: { signIn: "Hasi saioa", account: "Nire kontua", signOut: "Amaitu saioa", projects: "Proiektuak" },
  ru: { signIn: "Войти", account: "Личный кабинет", signOut: "Выйти", projects: "Проекты" },
  uk: { signIn: "Увійти", account: "Особистий кабінет", signOut: "Вийти", projects: "Проєкти" },
  be: { signIn: "Увайсці", account: "Асабісты кабінет", signOut: "Выйсці", projects: "Праекты" },
  bg: { signIn: "Вход", account: "Моят профил", signOut: "Изход", projects: "Проекти" },
  sr: { signIn: "Пријава", account: "Мој налог", signOut: "Одјава", projects: "Пројекти" },
  bs: { signIn: "Prijava", account: "Moj račun", signOut: "Odjava", projects: "Projekti" },
  mk: { signIn: "Најави се", account: "Мојот профил", signOut: "Одјави се", projects: "Проекти" },
  sq: { signIn: "Hyr", account: "Llogaria ime", signOut: "Dil", projects: "Projektet" },
  kk: { signIn: "Кіру", account: "Жеке кабинет", signOut: "Шығу", projects: "Жобалар" },
  uz: { signIn: "Kirish", account: "Shaxsiy kabinet", signOut: "Chiqish", projects: "Loyihalar" },
  ky: { signIn: "Кирүү", account: "Жеке кабинет", signOut: "Чыгуу", projects: "Долбоорлор" },
  tg: { signIn: "Воридшавӣ", account: "Кабинети шахсӣ", signOut: "Баромад", projects: "Лоиҳаҳо" },
  tk: { signIn: "Gir", account: "Hasabym", signOut: "Çyk", projects: "Taslamalar" },
  az: { signIn: "Daxil ol", account: "Hesabım", signOut: "Çıxış", projects: "Layihələr" },
  hy: { signIn: "Մուտք", account: "Իմ հաշիվը", signOut: "Ելք", projects: "Նախագծեր" },
  ka: { signIn: "შესვლა", account: "ჩემი ანგარიში", signOut: "გასვლა", projects: "პროექტები" },
  mn: { signIn: "Нэвтрэх", account: "Миний бүртгэл", signOut: "Гарах", projects: "Төслүүд" },
  ar: { signIn: "تسجيل الدخول", account: "حسابي", signOut: "تسجيل الخروج", projects: "المشاريع" },
  tr: { signIn: "Giriş yap", account: "Hesabım", signOut: "Çıkış yap", projects: "Projeler" },
  he: { signIn: "התחברות", account: "החשבון שלי", signOut: "התנתקות", projects: "פרויקטים" },
  fa: { signIn: "ورود", account: "حساب کاربری", signOut: "خروج", projects: "پروژه‌ها" },
  ku: { signIn: "Têketin", account: "Hesabê min", signOut: "Derketin", projects: "Proje" },
  af: { signIn: "Meld aan", account: "My rekening", signOut: "Meld af", projects: "Projekte" },
  sw: { signIn: "Ingia", account: "Akaunti yangu", signOut: "Toka", projects: "Miradi" },
  ha: { signIn: "Shiga", account: "Asusuna", signOut: "Fita", projects: "Ayyuka" },
  yo: { signIn: "Wọlé", account: "Àkáùntì mi", signOut: "Jáde", projects: "Àwọn iṣẹ́ akanṣe" },
  ig: { signIn: "Banye", account: "Akaụntụ m", signOut: "Pụọ", projects: "Ọrụ ngo" },
  am: { signIn: "ግባ", account: "መለያዬ", signOut: "ውጣ", projects: "ፕሮጀክቶች" },
  zu: { signIn: "Ngena", account: "I-akhawunti yami", signOut: "Phuma", projects: "Amaphrojekthi" },
  xh: { signIn: "Ngena", account: "I-akhawunti yam", signOut: "Phuma", projects: "Iiprojekthi" },
  rw: { signIn: "Injira", account: "Konti yanjye", signOut: "Sohoka", projects: "Imishinga" },
  so: { signIn: "Gal", account: "Akoonkayga", signOut: "Bax", projects: "Mashaariic" },
  zh: { signIn: "登录", account: "我的账户", signOut: "退出", projects: "项目" },
  ja: { signIn: "ログイン", account: "マイアカウント", signOut: "ログアウト", projects: "プロジェクト" },
  ko: { signIn: "로그인", account: "내 계정", signOut: "로그아웃", projects: "프로젝트" },
  hi: { signIn: "साइन इन करें", account: "मेरा खाता", signOut: "साइन आउट करें", projects: "प्रोजेक्ट" },
  ur: { signIn: "سائن ان", account: "میرا اکاؤنٹ", signOut: "سائن آؤٹ", projects: "پروجیکٹس" },
  bn: { signIn: "সাইন ইন", account: "আমার অ্যাকাউন্ট", signOut: "সাইন আউট", projects: "প্রকল্প" },
  te: { signIn: "సైన్ ఇన్", account: "నా ఖాతా", signOut: "సైన్ అవుట్", projects: "ప్రాజెక్టులు" },
  mr: { signIn: "साइन इन", account: "माझे खाते", signOut: "साइन आउट", projects: "प्रकल्प" },
  kn: { signIn: "ಸೈನ್ ಇನ್", account: "ನನ್ನ ಖಾತೆ", signOut: "ಸೈನ್ ಔಟ್", projects: "ಯೋಜನೆಗಳು" },
  gu: { signIn: "સાઇન ઇન", account: "મારું ખાતું", signOut: "સાઇન આઉટ", projects: "પ્રોજેક્ટ" },
  ml: { signIn: "സൈൻ ഇൻ", account: "എന്റെ അക്കൗണ്ട്", signOut: "സൈൻ ഔട്ട്", projects: "പദ്ധതികൾ" },
  ta: { signIn: "உள்நுழைக", account: "எனது கணக்கு", signOut: "வெளியேறு", projects: "திட்டங்கள்" },
  ne: { signIn: "साइन इन", account: "मेरो खाता", signOut: "साइन आउट", projects: "परियोजनाहरू" },
  vi: { signIn: "Đăng nhập", account: "Tài khoản của tôi", signOut: "Đăng xuất", projects: "Dự án" },
  th: { signIn: "เข้าสู่ระบบ", account: "บัญชีของฉัน", signOut: "ออกจากระบบ", projects: "โครงการ" },
  id: { signIn: "Masuk", account: "Akun saya", signOut: "Keluar", projects: "Proyek" },
  ms: { signIn: "Log masuk", account: "Akaun saya", signOut: "Log keluar", projects: "Projek" },
  tl: { signIn: "Mag-sign in", account: "Aking account", signOut: "Mag-sign out", projects: "Mga proyekto" },
  my: { signIn: "ဝင်ရောက်ရန်", account: "ကျွန်ုပ်အကောင့်", signOut: "ထွက်ရန်", projects: "စီမံကိန်းများ" },
  km: { signIn: "ចូល", account: "គណនីរបស់ខ្ញុំ", signOut: "ចេញ", projects: "គម្រោង" },
  lo: { signIn: "ເຂົ້າສູ່ລະບົບ", account: "ບັນຊີຂອງຂ້ອຍ", signOut: "ອອກຈາກລະບົບ", projects: "ໂຄງການ" },
};

export function accountLabels(lang: string): AccountLabels {
  return ACCOUNT[lang] ?? ACCOUNT.en;
}
