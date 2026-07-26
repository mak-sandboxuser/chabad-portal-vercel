/**
 * lucide-react's Star is a 5-point star; the Chai Rabbi's Circle tier needs
 * a Star of David (hexagram), so this fills that gap the same way
 * MenorahIcon does — a small custom SVG matching lucide's stroke language.
 */
export default function StarOfDavidIcon({ size = 24, className = '', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      <polygon points="12 2.5 20.5 17.5 3.5 17.5" />
      <polygon points="12 21.5 3.5 6.5 20.5 6.5" />
    </svg>
  );
}
