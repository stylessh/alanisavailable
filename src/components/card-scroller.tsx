/**
 * Full-bleed horizontal row. It breaks out of the narrow Container, but its
 * first card still lines up with the column (max-w-2xl + px-8).
 */
export function CardScroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      <ul className="-my-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(2rem,calc((100vw-42rem)/2+2rem))] py-10 [scrollbar-width:none] scroll-px-[max(2rem,calc((100vw-42rem)/2+2rem))] [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
    </div>
  );
}
