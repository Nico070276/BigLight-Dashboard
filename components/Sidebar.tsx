"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarOff,
  Download,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";

const navItems = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/ouvriers", label: "Ouvriers", icon: Users },
  { href: "/chantiers", label: "Chantiers", icon: Building2 },
  { href: "/pointages", label: "Pointages", icon: Clock },
  { href: "/absences", label: "Congés / Maladie", icon: CalendarOff },
  { href: "/export", label: "Export paie", icon: Download },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const content = (
    <>
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
        <Image src="/logo.png" alt="BIG LIGHT" width={107} height={40} className="h-10 w-auto" />
        <span className="font-bold text-sm">Pointage</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-background"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <Link
          href="/parametres"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-foreground"
        >
          <Settings size={16} />
          Paramètres
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-foreground"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
        <div className="mt-4 text-xs text-muted px-3">
          BIG LIGHT
          <br />
          Luxembourg · v1.0
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-background border-b border-border px-4 py-3">
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-card"
          aria-label="Ouvrir le menu"
        >
          <Menu size={18} />
        </button>
        <Image src="/logo.png" alt="BIG LIGHT" width={85} height={32} className="h-8 w-auto" />
        <span className="font-bold text-sm">Pointage</span>
      </header>

      <aside className="hidden md:flex w-60 bg-background border-r border-border flex-col p-4 min-h-screen">
        {content}
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-background border-r border-border flex flex-col p-4 overflow-y-auto">
            <button
              onClick={() => setOpen(false)}
              className="self-end w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-card mb-2"
              aria-label="Fermer le menu"
            >
              <X size={18} />
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
