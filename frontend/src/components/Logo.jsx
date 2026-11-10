/**
 * Rāma's bow and arrow. Drawn with theme tokens (gold bow, ink arrow),
 * so one mark serves both light and dark mode.
 */
export default function Logo({ size = 30 }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="Ramayana Guide">
      <g strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="var(--gold)">
          <path d="M11 4.5C23.5 8.5 23.5 23.5 11 27.5" />
          <path d="M11 4.5V27.5" strokeWidth="1" />
        </g>
        <g stroke="var(--ink)">
          <path d="M4 16H27.5" />
          <path d="M23.5 12.5L27.5 16L23.5 19.5" />
          <path d="M4 16L6.5 13.5M4 16L6.5 18.5M7 16L9.5 13.5M7 16L9.5 18.5" strokeWidth="1" />
        </g>
      </g>
    </svg>
  )
}
