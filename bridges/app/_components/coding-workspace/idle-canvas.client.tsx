"use client";

import { useEffect, useState } from "react";
import { Shimmer } from "@/components/ai-elements/shimmer.client";

// Background shown when no embed / terminal / preview is active. Uses the
// existing project Shimmer animation (motion/react with a sweeping gradient
// across the text) so the wordmark matches the rest of the app's visual
// language. Hard-coded black background so it always reads as the brand
// canvas regardless of light/dark theme.
export function IdleCanvas() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    function upd() { setWidth(window.innerWidth); }
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  return (
    <div
      className="flex items-center justify-center w-full h-full select-none"
      style={{ background: "#000" }}
    >
      <span
        style={{
          fontSize: width < 600 ? "3rem" : "4.5rem",
          fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          lineHeight: 1,
          letterSpacing: "0.25em",
        }}
      >
        <Shimmer className="uppercase font-light" duration={5} spread={4}>
          Fractera
        </Shimmer>
      </span>
    </div>
  );
}
