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
