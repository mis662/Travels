import Link from "next/link";

export function Logo({ name, href = "/" }: { name: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold tracking-tight">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-400 text-primary-950" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1zm2.1 0h9.8l-1.2-3.6a.5.5 0 0 0-.5-.4H8.8a.5.5 0 0 0-.5.4L7.1 11z" />
        </svg>
      </span>
      <span className="text-lg leading-tight">{name}</span>
    </Link>
  );
}
