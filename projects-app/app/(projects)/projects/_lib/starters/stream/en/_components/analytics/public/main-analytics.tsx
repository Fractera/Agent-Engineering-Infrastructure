import MainAnalyticsClient from "./main-analytics.client";

// ПУБЛИЧНАЯ ПОЛОВИНА аналитики — два графика за неделю (клиентские: считают из живых строк истории).
// На витрине и в кокпите — одни и те же графики; заявку ИИ добавляет только `index.tsx` в кокпите.
export default function MainAnalytics({ lang }: { lang: string }) {
  return <MainAnalyticsClient lang={lang} />;
}
