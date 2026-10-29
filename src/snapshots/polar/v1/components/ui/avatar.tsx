// orbit Avatar: a gray-50 circle with a 10% black ring drawn inside it,
// showing an image or initials in gray-700 (10px at 24px and 32px). Initials
// are the first and last names' first letters; an email counts its local
// part ("adaaanniel@gmail.com" reads "A").
export function initials(name: string) {
  const parts = name
    .split("@")[0]
    .replace(/[^a-zA-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  return parts
    .filter((_, i) => i === 0 || i === parts.length - 1)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: 24 | 32 | 40 | 64 }) {
  const text =
    size === 24
      ? "text-[10px] leading-3"
      : size === 32
        ? "text-[10px] leading-[15px]"
        : size === 40
          ? "text-xs leading-4"
          : "text-xl leading-7";
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--pl-subtle) text-(--pl-text-soft)"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full rounded-full object-cover" />
      ) : (
        <span className={text}>{initials(name)}</span>
      )}
      <span aria-hidden className="absolute inset-0 rounded-full shadow-(--pl-avatar-ring)" />
    </div>
  );
}
