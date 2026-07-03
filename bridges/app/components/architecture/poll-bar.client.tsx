"use client"

// A 1px full-width orange bar that fills left→right over 4s, then fires onPoll
// and refills — the heartbeat of the live tree (step 106). Pauses when the tab
// is hidden (animationPlayState), so we don't poll a backgrounded tab.
export function PollBar({ onPoll, paused }: { onPoll: () => void; paused: boolean }) {
  return (
    <div className="h-px w-full overflow-hidden bg-muted/40">
      <style>{`@keyframes pollFill{from{width:0%}to{width:100%}}`}</style>
      <div
        className="h-full bg-amber-500"
        style={{
          animation: "pollFill 4s linear infinite",
          animationPlayState: paused ? "paused" : "running",
        }}
        onAnimationIteration={() => { if (!paused) onPoll() }}
      />
    </div>
  )
}
