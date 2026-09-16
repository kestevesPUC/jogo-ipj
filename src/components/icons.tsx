// Minimal inline icon set (stroke-based, inherits currentColor) — avoids
// emoji-as-icon and keeps the bundle dependency-free.

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconPlus({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconTrash({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  );
}

export function IconEdit({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconCheck({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconArrowLeft({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IconTrophy({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4M17 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

export function IconBook({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

export function IconGamepad({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M6 12h4M8 10v4" />
      <circle cx="17" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="0.8" fill="currentColor" stroke="none" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.6l-.6 6A3 3 0 0 0 5.09 18a3 3 0 0 0 2.51-1.35L9 15h6l1.4 1.65A3 3 0 0 0 18.91 18a3 3 0 0 0 2.99-3.4l-.6-6A4 4 0 0 0 17.32 5Z" />
    </svg>
  );
}

export function IconHistory({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 5v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

export function IconImage({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export function IconUpload({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M12 3v12m0-12 4 4m-4-4-4 4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconLink({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconUsers({ size = 16, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className} style={style} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
