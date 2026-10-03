type IconProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
};

function IconBase({ className, size = 18, strokeWidth = 2, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function OfflineIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 8.5a12 12 0 0 1 20 0" />
      <path d="M5 12.5a8 8 0 0 1 14 0" />
      <path d="M8 16.5a4 4 0 0 1 8 0" />
      <path d="M12 19.5h.01" />
    </IconBase>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 2.8 18.5A1.5 1.5 0 0 0 4.1 20.5h15.8a1.5 1.5 0 0 0 1.3-2l-9.2-15A1.5 1.5 0 0 0 12 3.5Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 18.5 6v5.5c0 4.2-2.5 7.5-6.5 9.5-4-2-6.5-5.3-6.5-9.5V6L12 3.5Z" />
      <path d="M9.5 12.5 11 14l3.5-4" />
    </IconBase>
  );
}

export function BackupIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 17.5h12a2.5 2.5 0 0 0 2.5-2.5V10A2.5 2.5 0 0 0 18 7.5h-1.5l-1.2-2.3A2 2 0 0 0 13.5 4h-3a2 2 0 0 0-1.8 1.2L7.5 7.5H6A2.5 2.5 0 0 0 3.5 10v5a2.5 2.5 0 0 0 2.5 2.5Z" />
      <path d="M12 9v6" />
      <path d="m9.5 11.5 2.5-2.5 2.5 2.5" />
    </IconBase>
  );
}

export function CloudIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 18.5A4.5 4.5 0 0 1 7 9.5a5.5 5.5 0 0 1 10.7 2.2A3.5 3.5 0 1 1 17 18.5H7Z" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3.5v3" />
      <path d="M17 3.5v3" />
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10.5h17" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 19c1.5-3 4.2-4.5 8-4.5s6.5 1.5 8 4.5" />
    </IconBase>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="7.5" cy="15.5" r="3.5" />
      <path d="m10 13 8.5-8.5" />
      <path d="M16 7l2 2" />
      <path d="m18.5 4.5 2 2" />
    </IconBase>
  );
}

export function BankIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 9.5 12 4l8.5 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3.5 20.5h17" />
    </IconBase>
  );
}

export function RobotIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="8" width="15" height="11" rx="2.5" />
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1" />
      <path d="M9.5 12.5h.01M14.5 12.5h.01" />
      <path d="M9.5 16h5" />
      <path d="M2 12.5v3M22 12.5v3" />
    </IconBase>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 6.5h15" />
      <path d="M8.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v1.5" />
      <path d="M6.5 6.5 7.5 19a1.5 1.5 0 0 0 1.5 1.4h6a1.5 1.5 0 0 0 1.5-1.4l1-12.5" />
      <path d="M10 10.5v6M14 10.5v6" />
    </IconBase>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-2.4-1.6L8.4 20.9 6 20.5v-17Z" />
      <path d="M9 8h6M9 11.5h6M9 15h3" />
    </IconBase>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 5.5h3" />
      <path d="M11 18.5h2" />
    </IconBase>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </IconBase>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 6.5C10.5 5.3 8.4 4.5 5.5 4.5H3.5v13h2c2.9 0 5 .8 6.5 2 1.5-1.2 3.6-2 6.5-2h2v-13h-2c-2.9 0-5 .8-6.5 2Z" />
      <path d="M12 6.5v13" />
    </IconBase>
  );
}

export function SmileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10h.01M15 10h.01" />
      <path d="M8.5 14.5a4.2 4.2 0 0 0 7 0" />
    </IconBase>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4.5" width="12" height="16" rx="2" />
      <path d="M9.5 4.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1" />
      <path d="M9 10h6M9 13.5h6M9 17h3" />
    </IconBase>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20h4l10-10a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </IconBase>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.1-1.8A1.5 1.5 0 0 1 9.9 4.5h4.2a1.5 1.5 0 0 1 1.3.7L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.2" />
    </IconBase>
  );
}

/** Gembok tertutup — penanda uang terkunci (kontrak K3.2). */
export function LockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2" />
    </IconBase>
  );
}

/** Gembok terbuka — tombol "Kunci" / status terbuka. */
export function UnlockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 7.7-1.5" />
      <path d="M12 14.5v2" />
    </IconBase>
  );
}

/* ── G2-09: ikon pengganti emoji pada kontrol fungsional ───────────────────── */

export function SparkleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5 13.9 9l5.6 2-5.6 2-1.9 5.5L10.1 13 4.5 11l5.6-2L12 3.5Z" />
      <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 20.5h16" />
      <path d="M7 20.5V12M12 20.5V6.5M17 20.5v-5" />
    </IconBase>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5.5 4.5h10L20 9v10.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" />
      <path d="M8.5 4.5v5h6v-5" />
      <path d="M8.5 20.5v-5h7v5" />
    </IconBase>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4.5 17 4.7-4.7 3.3 3.3 2.5-2.5 4.5 4.4" />
    </IconBase>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 11.5A8 8 0 0 0 6.3 6.3L4 8.5" />
      <path d="M4 5.5v3h3" />
      <path d="M4 12.5A8 8 0 0 0 17.7 17.7L20 15.5" />
      <path d="M20 18.5v-3h-3" />
    </IconBase>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function PrinterIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="7" rx="2" />
      <path d="M7 16h10v4H7z" />
    </IconBase>
  );
}

export function ChecklistIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7.5 6 9.5l3-3" />
      <path d="M4 16.5 6 18.5l3-3" />
      <path d="M12.5 7.5h8M12.5 17h8" />
    </IconBase>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.5 2.5 5 13.5h5l-1 8 9-11.5h-5.2l1.7-7.5Z" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 4.5 4.5" />
    </IconBase>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.5v11" />
      <path d="m7.5 10 4.5 4.5L16.5 10" />
      <path d="M4.5 19.5h15" />
    </IconBase>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 3.5h7.5L19 9v11.5H6V3.5Z" />
      <path d="M13 3.5V9h6" />
      <path d="M9 13h6M9 16.5h4" />
    </IconBase>
  );
}

/** Jam pasir — status "sedang diproses" pada tombol. */
export function HourglassIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3.5h10" />
      <path d="M7 20.5h10" />
      <path d="M8 3.5v3.2c0 2 4 2.8 4 5.3s-4 3.3-4 5.3v3.2" />
      <path d="M16 3.5v3.2c0 2-4 2.8-4 5.3s4 3.3 4 5.3v3.2" />
    </IconBase>
  );
}

/** Cincin bergaris miring — penanda "tidak hadir / batal" pada kalender. */
export function BanIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8A1.5 1.5 0 0 1 20.5 10v7.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-10Z" />
    </IconBase>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 19.5v-11" />
      <path d="m7.5 13 4.5-4.5L16.5 13" />
      <path d="M4.5 4.5h15" />
    </IconBase>
  );
}
