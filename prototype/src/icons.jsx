// Minimal lucide-style icons, 1.5px stroke, never filled.
// Exported on window for cross-file Babel scope.

const Icon = ({ children, size = 16, className = "", stroke = 1.5, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    {children}
  </svg>
);

const I = {
  Calendar: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>,
  List:     (p) => <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Icon>,
  Bookmark: (p) => <Icon {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Icon>,
  Settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.82-.33 1.7 1.7 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.82.33l-.06.06A2 2 0 1 1 4.3 16.96l.06-.06A1.7 1.7 0 0 0 4.69 15a1.7 1.7 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.3l.06.06A1.7 1.7 0 0 0 9 4.69a1.7 1.7 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09c0 .66.39 1.26 1 1.51a1.7 1.7 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.31 9c.25.61.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" /></Icon>,
  Search:   (p) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>,
  ChevDown: (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>,
  ChevRight:(p) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>,
  ChevLeft: (p) => <Icon {...p}><path d="m15 6-6 6 6 6" /></Icon>,
  ChevUp:   (p) => <Icon {...p}><path d="m6 15 6-6 6 6" /></Icon>,
  ArrowLeft:(p) => <Icon {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Icon>,
  ArrowUp:  (p) => <Icon {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Icon>,
  ArrowDown:(p) => <Icon {...p}><path d="M12 5v14M19 12l-7 7-7-7" /></Icon>,
  TrendUp:  (p) => <Icon {...p}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></Icon>,
  TrendDown:(p) => <Icon {...p}><path d="m22 17-8.5-8.5-5 5L2 7" /><path d="M16 17h6v-6" /></Icon>,
  External: (p) => <Icon {...p}><path d="M15 3h6v6M10 14 21 3M21 14v7H3V3h7" /></Icon>,
  Download: (p) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></Icon>,
  Share:    (p) => <Icon {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" /></Icon>,
  Refresh:  (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M8 16H3v5" /></Icon>,
  Check:    (p) => <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>,
  Mail:     (p) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></Icon>,
  Google:   (p) => <Icon {...p}><path d="M21.8 12.2c0-.7-.06-1.36-.18-2H12v3.78h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.42z"/><path d="M12 22c2.76 0 5.07-.92 6.76-2.48l-3.3-2.56c-.92.62-2.1.98-3.46.98-2.66 0-4.92-1.8-5.72-4.22H2.84v2.64A10 10 0 0 0 12 22z"/><path d="M6.28 13.72A6 6 0 0 1 6 12c0-.6.1-1.18.28-1.72V7.64H2.84A10 10 0 0 0 2 12c0 1.62.38 3.14 1.04 4.48l3.24-2.76z"/><path d="M12 5.88c1.5 0 2.84.52 3.9 1.52l2.92-2.92C17.06 2.98 14.76 2 12 2A10 10 0 0 0 2.84 7.64l3.44 2.64C7.08 7.68 9.34 5.88 12 5.88z"/></Icon>,
  ThumbsUp: (p) => <Icon {...p}><path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 2 2.24l-1.4 7A2 2 0 0 1 18.48 21H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h2.76a2 2 0 0 0 1.79-1.11L14 2a3 3 0 0 1 1 3.88z" /></Icon>,
  ThumbsDown:(p) => <Icon {...p}><path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-2-2.24l1.4-7A2 2 0 0 1 5.54 3H17a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-2.76a2 2 0 0 0-1.79 1.11L10 22a3 3 0 0 1-1-3.88z" /></Icon>,
  Flag:     (p) => <Icon {...p}><path d="M4 22V4M4 4h14l-3 5 3 5H4" /></Icon>,
  Clock:    (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>,
  Quote:    (p) => <Icon {...p}><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2H4c-1 0-2 1-2 2v6c0 1.25.76 2 2 2h1s0 3-3 3"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2-2-2h-4c-1 0-2 1-2 2v6c0 1.25.76 2 2 2h1s0 3-3 3"/></Icon>,
  Youtube:  (p) => <Icon {...p}><path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49 49 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49 49 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></Icon>,
  Twitter:  (p) => <Icon {...p}><path d="M22 4.01s-.6 1.8-1.8 3a6 6 0 0 1 .06 1.12C20.26 14.7 15.58 21 7.7 21 5.25 21 3 20.3 1 19.07c.35.04.7.06 1.06.06 2.03 0 3.9-.7 5.4-1.86a4 4 0 0 1-3.74-2.78c.25.05.5.07.76.07.37 0 .73-.05 1.07-.14A4 4 0 0 1 2.33 10.5v-.05c.54.3 1.16.48 1.82.5A4 4 0 0 1 2.9 5.63a11.34 11.34 0 0 0 8.23 4.17 4 4 0 0 1 6.81-3.64 8 8 0 0 0 2.54-.97 4 4 0 0 1-1.76 2.2c.8-.1 1.57-.3 2.28-.62" /></Icon>,
  Globe:    (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" /></Icon>,
  Plus:     (p) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>,
  X:        (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>,
  Info:     (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Icon>,
  AlertTri: (p) => <Icon {...p}><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></Icon>,
  Sort:     (p) => <Icon {...p}><path d="M3 6h18M6 12h12M10 18h4" /></Icon>,
  Rocket:   (p) => <Icon {...p}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></Icon>,
};

window.I = I;
window.Icon = Icon;
