export default function AdminTopbar({ label }: { label: string }) {
  return (
    <div className="h-16 bg-white border-b border-line flex items-center justify-between px-6 gap-4">
      <span className="text-xs font-medium text-muted whitespace-nowrap">
        📍 {label}
      </span>
      <div className="flex items-center gap-4 text-sm text-ink/70 whitespace-nowrap">
        <a href="tel:+919986780221" className="hover:text-ink">
          📞 Priority: +91 99867 80221
        </a>
        <span className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center text-xs">
          👤
        </span>
      </div>
    </div>
  );
}
