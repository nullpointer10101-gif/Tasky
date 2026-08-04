export default function LoadingSpinner({ rows = 3, cardHeight = 'h-24' }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`bg-surface rounded-card shadow-card ${cardHeight} p-5 flex flex-col gap-3`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-soft  flex-shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <div className="h-3 bg-surface-soft  rounded-pill w-2/3" />
              <div className="h-3 bg-surface-soft  rounded-pill w-1/3" />
            </div>
            <div className="w-16 h-8 bg-surface-soft  rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
