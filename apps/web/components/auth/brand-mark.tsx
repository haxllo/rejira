interface BrandMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

export function BrandMark({ size = 24, className, title = 'Loading' }: BrandMarkProps) {
  return (
    <span
      className={className ?? 'auth-split-mark'}
      style={{ width: size, height: size, display: 'inline-block', lineHeight: 0 }}
    >
      <svg
        viewBox="0 0 30 30"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        width={size}
        height={size}
        style={{ '--on': '#FC6F03', '--off': '#FFFFFF', '--dur': '0.600s' } as React.CSSProperties}
      >
        <title>{title}</title>
        <style>{`
          circle { fill: var(--off); }
          circle.on { fill: var(--on); }
          @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
          @keyframes fs0010 { 0% { opacity: 0; } 49.99% { opacity: 0; } 50.00% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
          @keyframes fs0110 { 0% { opacity: 0; } 24.99% { opacity: 0; } 25.00% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
          @keyframes fs1110 { 0% { opacity: 1; } 74.99% { opacity: 1; } 75.00% { opacity: 0; } 100% { opacity: 0; } }
        `}</style>
        <circle cx="3" cy="3" r="2" />
        <circle cx="9" cy="3" r="2" />
        <circle cx="15" cy="3" r="2" />
        <circle className="on" cx="15" cy="3" r="2" opacity="0" style={{ animation: 'fs0010 var(--dur) linear infinite' }} />
        <circle cx="21" cy="3" r="2" />
        <circle cx="27" cy="3" r="2" />
        <circle cx="3" cy="9" r="2" />
        <circle cx="9" cy="9" r="2" />
        <circle className="on" cx="9" cy="9" r="2" opacity="0" style={{ animation: 'fs0110 var(--dur) linear infinite' }} />
        <circle cx="15" cy="9" r="2" />
        <circle className="on" cx="15" cy="9" r="2" opacity="1" style={{ animation: 'fs1110 var(--dur) linear infinite' }} />
        <circle cx="21" cy="9" r="2" />
        <circle className="on" cx="21" cy="9" r="2" opacity="0" style={{ animation: 'fs0110 var(--dur) linear infinite' }} />
        <circle cx="27" cy="9" r="2" />
        <circle cx="3" cy="15" r="2" />
        <circle className="on" cx="3" cy="15" r="2" opacity="0" style={{ animation: 'fs0010 var(--dur) linear infinite' }} />
        <circle cx="9" cy="15" r="2" />
        <circle className="on" cx="9" cy="15" r="2" opacity="1" style={{ animation: 'fs1110 var(--dur) linear infinite' }} />
        <circle cx="15" cy="15" r="2" />
        <circle className="on" cx="15" cy="15" r="2" opacity="1" style={{ animation: 'fs1110 var(--dur) linear infinite' }} />
        <circle cx="21" cy="15" r="2" />
        <circle className="on" cx="21" cy="15" r="2" opacity="1" style={{ animation: 'fs1110 var(--dur) linear infinite' }} />
        <circle cx="27" cy="15" r="2" />
        <circle className="on" cx="27" cy="15" r="2" opacity="0" style={{ animation: 'fs0010 var(--dur) linear infinite' }} />
        <circle cx="3" cy="21" r="2" />
        <circle cx="9" cy="21" r="2" />
        <circle className="on" cx="9" cy="21" r="2" opacity="0" style={{ animation: 'fs0110 var(--dur) linear infinite' }} />
        <circle cx="15" cy="21" r="2" />
        <circle className="on" cx="15" cy="21" r="2" opacity="1" style={{ animation: 'fs1110 var(--dur) linear infinite' }} />
        <circle cx="21" cy="21" r="2" />
        <circle className="on" cx="21" cy="21" r="2" opacity="0" style={{ animation: 'fs0110 var(--dur) linear infinite' }} />
        <circle cx="27" cy="21" r="2" />
        <circle cx="3" cy="27" r="2" />
        <circle cx="9" cy="27" r="2" />
        <circle cx="15" cy="27" r="2" />
        <circle className="on" cx="15" cy="27" r="2" opacity="0" style={{ animation: 'fs0010 var(--dur) linear infinite' }} />
        <circle cx="21" cy="27" r="2" />
        <circle cx="27" cy="27" r="2" />
      </svg>
    </span>
  );
}
