export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto max-w-2xl px-8 py-16 sm:py-20 ${className}`}>
      {children}
    </div>
  );
}
