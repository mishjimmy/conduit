"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants, cn } from "@conduit/ui";

const NAV = [
  { href: "/screens", label: "Screens" },
  { href: "/layouts", label: "Layouts" },
  { href: "/playlists", label: "Playlists" },
  { href: "/groups", label: "Groups" },
  { href: "/media", label: "Media" },
  { href: "/cameras", label: "Cameras" },
  { href: "/messages", label: "Messages" },
];

/** Global top navigation. Hidden on the login screen. */
export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-6">
        <Link href="/screens" className="mr-3 flex items-center gap-2 font-semibold tracking-tight">
          <span className="size-2.5 rounded-full bg-primary" />
          Conduit
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: isActive(item.href) ? "default" : "ghost", size: "sm" }),
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/pair" className={cn(buttonVariants({ size: "sm" }), "ml-auto")}>
          Pair a screen
        </Link>
      </div>
    </header>
  );
}
