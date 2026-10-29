// Polar's own icons, copied from the live dashboard's DOM: the navigation and
// most glyphs are Material Icons (Outlined, filled paths, Apache 2.0) and the
// rest Lucide (2px strokes, ISC), the two sets Polar's orbit package ships.
// Path data is as served; each icon takes currentColor.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** A Material icon: filled paths in a 24px box */
function material(paths: string) {
  return function MaterialIcon({ size = 16, ...props }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
        <path d={paths} />
      </svg>
    );
  };
}

/** A Lucide icon: 2px round strokes in a 24px box */
function lucide(children: React.ReactNode) {
  return function LucideIcon({ size = 16, ...props }: IconProps) {
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
        aria-hidden
        {...props}
      >
        {children}
      </svg>
    );
  };
}

/** Polar's mark, as the sidebar draws it: 24px, with the viewBox's 34-unit margin */
export function PolarLogo({ size = 24, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="-34 -34 378 378" fill="none" aria-hidden {...props}>
      <path
        fill="currentColor"
        d="M139.50 117.29L57.07 34.86L53.76 37.63L50.91 40.15L48.12 42.74L45.40 45.40L42.74 48.12L40.15 50.91L37.63 53.76L34.72 57.24L117.14 139.66L0.76 139.66L0.42 143.60L0.19 147.39L0.05 151.20L0.00 155.95L0.07 159.75L0.24 163.56L0.49 167.35L0.86 171.29L117.13 171.29L35.14 253.28L37.63 256.24L40.15 259.09L42.74 261.88L46.07 265.27L48.81 267.91L51.62 270.48L54.48 272.99L57.59 275.57L139.50 193.65L139.50 309.22L143.60 309.58L147.39 309.81L151.20 309.95L155.00 310.00L158.80 309.95L162.61 309.81L166.40 309.58L171.14 309.16L171.14 0.84L166.40 0.42L162.61 0.19L158.80 0.05L155.00 0.00L151.20 0.05L147.39 0.19L143.60 0.42L139.50 0.78ZM244.21 154.15L244.26 151.50L244.37 148.87L244.53 146.24L244.87 142.33L245.16 139.73L245.69 135.87L246.10 133.31L246.82 129.50L247.36 126.98L247.94 124.47L248.58 121.99L249.62 118.29L250.37 115.85L251.58 112.22L252.44 109.83L253.82 106.28L254.80 103.95L256.34 100.48L257.42 98.20L259.11 94.83L260.30 92.61L262.15 89.33L263.43 87.17L265.43 83.99L266.81 81.91L268.94 78.83L270.42 76.82L272.69 73.86L274.25 71.93L276.66 69.08L279.14 66.32L280.84 64.51L278.35 61.15L275.42 57.41L272.99 54.48L269.85 50.91L267.26 48.12L263.93 44.73L260.49 41.44L257.44 38.67L254.71 41.50L251.53 44.98L248.44 48.55L246.44 50.98L243.52 54.70L241.63 57.23L238.89 61.09L237.12 63.71L234.55 67.71L232.90 70.42L230.52 74.54L229.00 77.34L226.81 81.58L225.42 84.45L223.43 88.81L222.17 91.76L220.38 96.23L219.26 99.24L217.69 103.80L216.71 106.88L215.35 111.54L214.52 114.67L213.39 119.42L212.71 122.61L211.81 127.43L211.28 130.66L210.61 135.55L210.25 138.84L209.82 143.79L209.62 147.11L209.44 152.12L209.41 155.48L209.43 158.39L209.57 162.74L209.82 167.05L210.19 171.32L210.50 174.15L211.05 178.36L211.71 182.53L212.48 186.66L213.05 189.39L213.99 193.45L215.03 197.47L216.18 201.44L217.43 205.37L218.77 209.25L220.21 213.08L221.74 216.87L223.36 220.60L225.07 224.29L226.88 227.92L228.77 231.51L230.74 235.03L232.80 238.51L234.94 241.93L237.16 245.29L239.45 248.59L241.82 251.84L244.27 255.03L246.79 258.15L249.38 261.22L252.04 264.22L254.77 267.16L258.19 270.66L261.19 267.91L264.60 264.60L267.26 261.88L270.48 258.38L272.99 255.52L276.01 251.85L278.93 248.10L281.42 244.68L279.42 242.59L277.25 240.23L275.14 237.81L273.09 235.35L271.09 232.85L269.16 230.30L267.29 227.71L265.48 225.07L263.74 222.39L262.06 219.67L260.45 216.91L258.91 214.11L257.44 211.27L256.04 208.39L254.71 205.47L253.46 202.52L252.27 199.53L251.17 196.51L250.14 193.45L249.19 190.35L248.32 187.23L247.52 184.07L246.81 180.88L246.39 178.74L245.81 175.50L245.33 172.23L244.93 168.93L244.71 166.72L244.45 163.38L244.28 160.01L244.21 156.61Z"
      />
    </svg>
  );
}

// Sidebar navigation (Material Outlined)
export const HomeIcon = material(
  "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2M5 19V5h6v14zm14 0h-6v-7h6zm0-9h-6V5h6z",
);
export const ProductsIcon = material(
  "m21.5 9-2.25-4h-3.31l-1.69-3h-4.5L8.06 5H4.75L2.5 9l1.69 3-1.69 3 2.25 4h3.31l1.69 3h4.5l1.69-3h3.31l2.25-4-1.69-3zm-2.29 0-1.12 2h-2.14l-1.12-2 1.12-2h2.14zm-8.27 5-1.12-2 1.12-2h2.12l1.12 2-1.12 2zm2.14-10 1.12 1.98L13.06 8h-2.12L9.8 5.98 10.92 4zM5.92 7h2.14l1.12 2-1.12 2H5.92L4.79 9zm-1.13 8 1.12-2h2.14l1.12 2-1.12 2H5.92zm6.13 5L9.8 18.02 10.94 16h2.12l1.13 2.02L13.08 20zm7.16-3h-2.14l-1.12-2 1.12-2h2.14l1.12 2z",
);
export const CustomersIcon = material(
  "M16.67 13.13C18.04 14.06 19 15.32 19 17v3h4v-3c0-2.18-3.57-3.47-6.33-3.87M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4c-.47 0-.91.1-1.33.24C14.5 5.27 15 6.58 15 8s-.5 2.73-1.33 3.76c.42.14.86.24 1.33.24m-6 0c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4m0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4m6 5H3v-.99C3.2 16.29 6.3 15 9 15s5.8 1.29 6 2z",
);
export const AnalyticsIcon = material("m16 6 2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z");
export const SalesIcon = material(
  "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2m6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2z",
);
export const FinanceIcon = material(
  "M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4",
);
export const SettingsIcon = material(
  "M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z",
);
export const SupportIcon = material(
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m7.46 7.12-2.78 1.15c-.51-1.36-1.58-2.44-2.95-2.94l1.15-2.78c2.1.8 3.77 2.47 4.58 4.57M12 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3M9.13 4.54l1.17 2.78c-1.38.5-2.47 1.59-2.98 2.97L4.54 9.13c.81-2.11 2.48-3.78 4.59-4.59M4.54 14.87l2.78-1.15c.51 1.38 1.59 2.46 2.97 2.96l-1.17 2.78c-2.1-.81-3.77-2.48-4.58-4.59m10.34 4.59-1.15-2.78c1.37-.51 2.45-1.59 2.95-2.97l2.78 1.17c-.81 2.1-2.48 3.77-4.58 4.58",
);
export const ArrowOutwardIcon = material("M6 6v2h8.59L5 17.59 6.41 19 16 9.41V18h2V6z");
export const ExpandMoreIcon = material("M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z");
export const ArrowBackIcon = material("M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z");

// Page glyphs (Material)
export const AddIcon = material("M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z");
export const MoreVertIcon = material(
  "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2m0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2m0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2",
);
export const RemoveIcon = material("M19 13H5v-2h14z");
export const KeyboardArrowUpIcon = material("M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z");
export const ChevronRightIcon = material("M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z");
export const BenefitIcon = material(
  "M19 3H5L2 9l10 12L22 9zM9.62 8l1.5-3h1.76l1.5 3zM11 10v6.68L5.44 10zm2 0h5.56L13 16.68zm6.26-2h-2.65l-1.5-3h2.65zM6.24 5h2.65l-1.5 3H4.74z",
);
export const PersonIcon = material(
  "M12 5.9c1.16 0 2.1.94 2.1 2.1s-.94 2.1-2.1 2.1S9.9 9.16 9.9 8s.94-2.1 2.1-2.1m0 9c2.97 0 6.1 1.46 6.1 2.1v1.1H5.9V17c0-.64 3.13-2.1 6.1-2.1M12 4C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4m0 9c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4",
);
export const SearchMaterialIcon = material(
  "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14",
);
export const FilterIcon = material("M10 18h4v-2h-4zM3 6v2h18V6zm3 7h12v-2H6z");
export const ArrowDownwardIcon = material("m20 12-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z");
export const SelectArrowIcon = material("M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z");
export const CalendarIcon = material(
  "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V10h14zm0-12H5V6h14zM9 14H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2zm-8 4H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2z",
);
export const DownloadIcon = material(
  "M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3zm-1-4-1.41-1.41L13 12.17V4h-2v8.17L8.41 9.59 7 11l5 5z",
);
export const CloseIcon = material(
  "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
);

// Lucide
export const BellIcon = lucide(
  <>
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </>,
);
export const SearchIcon = lucide(
  <>
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </>,
);
export const TuneIcon = lucide(
  <>
    <path d="M14 17H5" />
    <path d="M19 7h-9" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </>,
);
export const ChevronDownIcon = lucide(<path d="m6 9 6 6 6-6" />);
export const SortDownIcon = lucide(
  <>
    <path d="M8 18L12 22L16 18" />
    <path d="M12 2V22" />
  </>,
);
export const ChevronsLeftIcon = lucide(
  <>
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </>,
);
export const ChevronLeftIcon = lucide(<path d="m15 18-6-6 6-6" />);
export const ChevronRightLucideIcon = lucide(<path d="m9 18 6-6-6-6" />);
export const ChevronsRightIcon = lucide(
  <>
    <path d="m6 17 5-5-5-5" />
    <path d="m13 17 5-5-5-5" />
  </>,
);
export const ShieldCheckIcon = lucide(
  <>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const CoinsIcon = lucide(
  <>
    <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" />
    <path d="M15 6h1v4" />
    <path d="m6.134 14.768.866-.5 2 3.464" />
    <circle cx="16" cy="8" r="6" />
  </>,
);

// Settings navigation (Lucide)
export const GeneralIcon = TuneIcon;
export const MembersIcon = lucide(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <path d="M16 3.128a4 4 0 0 1 0 7.744" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <circle cx="9" cy="7" r="4" />
  </>,
);
export const BillingIcon = lucide(
  <>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </>,
);
export const DomainsIcon = lucide(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </>,
);
export const PreviewIcon = lucide(
  <>
    <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
    <path d="M6.453 15h11.094" />
    <path d="M8.5 2h7" />
  </>,
);
export const WalletIcon = lucide(
  <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>,
);
export const SubscriptionsIcon = lucide(
  <>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </>,
);
export const PortalIcon = lucide(
  <>
    <path d="M18 20a6 6 0 0 0-12 0" />
    <circle cx="12" cy="10" r="4" />
    <circle cx="12" cy="12" r="10" />
  </>,
);
export const MailIcon = lucide(
  <>
    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
    <rect x="2" y="4" width="20" height="16" rx="2" />
  </>,
);
export const FieldsIcon = lucide(
  <>
    <path d="M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6" />
    <path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7" />
    <path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1" />
    <path d="M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1" />
    <path d="M9 6v12" />
  </>,
);
export const KeyIcon = lucide(
  <>
    <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
    <path d="m21 2-9.6 9.6" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </>,
);
export const WebhooksIcon = lucide(
  <>
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </>,
);
export const EmbedIcon = ShieldCheckIcon;
export const ProfileIcon = lucide(
  <>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>,
);
export const LockIcon = lucide(
  <>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);
export const CodeIcon = lucide(
  <>
    <path d="m18 16 4-4-4-4" />
    <path d="m6 8-4 4 4 4" />
    <path d="m14.5 4-5 16" />
  </>,
);

// Design-system glyphs, all Lucide as orbit imports them (lucide-react, ISC):
// the select and checkbox tick, dismiss, alert and accordion chevrons.
export const CheckIcon = lucide(<path d="M20 6 9 17l-5-5" />);
export const XIcon = lucide(
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);
export const MinusIcon = lucide(<path d="M5 12h14" />);
export const ChevronUpIcon = lucide(<path d="m18 15-6-6-6 6" />);
export const ChevronsUpDownIcon = lucide(
  <>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </>,
);
export const InfoIcon = lucide(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </>,
);
export const CircleAlertIcon = lucide(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </>,
);
export const CircleCheckIcon = lucide(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </>,
);
export const TriangleAlertIcon = lucide(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);
export const LoaderCircleIcon = lucide(<path d="M21 12a9 9 0 1 1-6.219-8.56" />);
export const LinkIcon = lucide(
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>,
);
export const CopyIcon = lucide(
  <>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </>,
);
/** the drag handle on a reorderable row ("Selected" in Customize) */
export const GripIcon = lucide(
  <>
    <line x1="5" x2="19" y1="9" y2="9" />
    <line x1="5" x2="19" y1="15" y2="15" />
  </>,
);
export const TagIcon = lucide(
  <>
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
  </>,
);
export const PackageIcon = lucide(
  <>
    <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
    <path d="M12 22V12" />
    <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
    <path d="m7.5 4.27 9 5.15" />
  </>,
);
