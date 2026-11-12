"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/", label: "Today", match: (p: string) => p === "/",
    icon: <path d="M4 7h16M4 12h11M4 17h6" />,
  },
  {
    href: "/library", label: "Library", match: (p: string) => p.startsWith("/library") || p.startsWith("/papers"),
    icon: <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm0 13a3 3 0 0 1 3-3h10" />,
  },
  {
    href: "/me", label: "Me", match: (p: string) => p.startsWith("/me") || p.startsWith("/upgrade"),
    icon: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  },
];

export function TabBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-[32rem]">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-accent-text" : "text-muted"}`}
              >
                {active && <span aria-hidden className="absolute inset-x-6 top-0 h-[3px] bg-accent" />}
                <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {tab.icon}
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
