export function Logo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: "none" }}>
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b3245a" />
          <stop offset="1" stopColor="#4a0c22" />
        </linearGradient>
        <linearGradient id="lg-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#0f9e8c" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#lg-bg)" />
      {/* gauge arc */}
      <path d="M11 32a13 13 0 1 1 26 0" fill="none" stroke="#1a0710" strokeWidth="6" strokeLinecap="round" />
      <path d="M11 32a13 13 0 0 1 9-12.4" fill="none" stroke="url(#lg-teal)" strokeWidth="6" strokeLinecap="round" />
      {/* needle */}
      <path d="M24 32 L33 21" stroke="#5eead4" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="32" r="4" fill="url(#lg-teal)" />
    </svg>
  );
}
