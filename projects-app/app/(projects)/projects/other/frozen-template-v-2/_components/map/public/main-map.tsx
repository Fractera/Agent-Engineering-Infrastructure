import { EuropeMapView } from "./components/europe-map.client";

// ПУБЛИЧНАЯ ПОЛОВИНА карты — сама карта (перенос v1). На витрине и в кокпите — одна и та же карта; отличие
// поверхностей несёт только `index.tsx` (в кокпите под картой добавляется заявка ИИ).
export default function MainMap() {
  return <EuropeMapView />;
}
