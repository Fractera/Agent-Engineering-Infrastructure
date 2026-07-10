"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProjectColumn } from "../_data/columns";
import type { RecordRow } from "../_lib/types";
import type { FinanceRecord, ImageRecord, GeoRecord } from "../_lib/project-data";
import { RecordsTable } from "./records-table.client";
import { FinanceTable } from "./finance-table.client";
import { ImagesTable } from "./images-table.client";
import { GeoTable } from "./geo-table.client";

// The FOUR integrated storages in ONE panel (owner contract, step 207.20): Records · Finances · Images ·
// GEO — one table at a time behind a right-aligned toggle (Records by default), each linked many-to-many
// through record_images / record_geo so a row in one table names its partners in the others. The choice
// is remembered per browser (localStorage).
const STORAGE = "records-finances-view:personal/telegram-notes";
type View = "records" | "finances" | "images" | "geo";
const TITLES: Record<View, string> = {
  records: "Records & requests",
  finances: "Finances",
  images: "Images",
  geo: "GEO",
};
const VIEWS: View[] = ["records", "finances", "images", "geo"];
const LABELS: Record<View, string> = {
  records: "Records",
  finances: "Finances",
  images: "Images",
  geo: "GEO",
};

export function RecordsFinancesPanel({
  columns,
  records,
  finances,
  images,
  geo,
}: {
  columns: ProjectColumn[];
  records: RecordRow[];
  finances: FinanceRecord[];
  images: ImageRecord[];
  geo: GeoRecord[];
}) {
  const [view, setView] = useState<View>("records");

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE);
      if (v && (VIEWS as string[]).includes(v)) setView(v as View);
    } catch {
      /* no stored choice — default to records */
    }
  }, []);

  const choose = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(STORAGE, v);
    } catch {
      /* storage unavailable — the choice just does not persist */
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-medium">{TITLES[view]}</h2>
        <div className="inline-flex rounded-md border p-0.5">
          {VIEWS.map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              aria-pressed={view === v}
              onClick={() => choose(v)}
            >
              {LABELS[v]}
            </Button>
          ))}
        </div>
      </div>
      {view === "records" && <RecordsTable columns={columns} initialRows={records} />}
      {view === "finances" && <FinanceTable rows={finances} />}
      {view === "images" && <ImagesTable rows={images} />}
      {view === "geo" && <GeoTable rows={geo} />}
    </div>
  );
}
