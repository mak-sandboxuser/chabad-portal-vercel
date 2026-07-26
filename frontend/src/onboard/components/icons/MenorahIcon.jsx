/**
 * lucide-react has no menorah glyph, so this fills that one gap using the
 * same 24x24 / stroke-based visual language as the surrounding lucide icons.
 */
export default function MenorahIcon({ size = 24, className = '', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 3v9" />
      <path d="M6 6v6" />
      <path d="M18 6v6" />
      <path d="M9 4.5v7.5" />
      <path d="M15 4.5v7.5" />
      <path d="M4 12h16" />
      <path d="M8 12l1 5h6l1-5" />
      <path d="M7 21h10" />
      <path d="M12 17v4" />
    </svg>
  );
}
