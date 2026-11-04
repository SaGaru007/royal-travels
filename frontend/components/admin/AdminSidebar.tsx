"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AdminSession, clearAdminSession, getAdminSession } from "@/lib/auth";

const navItems = [
  { label: "Bookings", href: "/admin/bookings", icon: "📅" },
  { label: "Analytics", href: "/admin/analytics", icon: "📈" },
  { label: "Fleet", href: "/admin/fleet", icon: "🚐" },
  { label: "Settings", href: "/admin/settings", icon: "⚙️" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    setSession(getAdminSession());
  }, []);

  function signOut() {
    clearAdminSession();
    router.replace("/admin/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-ink text-cream flex flex-col">
      <div className="p-5 border-b border-white/10">
        <Link href="/admin/bookings" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-ink text-sm">
            ◆
          </span>
          <div>
            <div className="text-sm font-semibold text-gold leading-none">
              Royal Travels
            </div>
            <div className="text-[10px] text-cream/50 mt-1">
              Concierge Dispatch
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-2 mt-4 text-xs text-cream/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Operational
          <span className="ml-auto">24/7 Active</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 text-sm px-3 py-2.5 rounded-md transition-colors ${
                active
                  ? "bg-gold text-ink font-medium"
                  : "text-cream/70 hover:bg-white/10 hover:text-cream"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <Link
          href="/"
          className="block text-xs text-cream/60 hover:text-cream px-2 py-1.5"
        >
          ↗ View public site
        </Link>
        <div className="flex items-center gap-2 px-2 py-2 mt-1">
          <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs">
            👤
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">
              {session?.name ?? "Admin"}
            </div>
            <div className="text-[10px] text-cream/50 capitalize">
              {session?.role ?? "staff"} desk
            </div>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full mt-2 text-xs text-cream/60 hover:text-cream text-left px-2 py-1.5"
        >
          Sign Out →
        </button>
      </div>
    </aside>
  );
}
