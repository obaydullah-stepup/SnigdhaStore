import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n";
import { getLayoutSettings } from "@/lib/settings";

/** Trailing path segment of an Instagram URL, e.g. `.../shopname` -> `@shopname`. */
function instagramHandle(url: string): string | null {
  const segment = url.split("?")[0].replace(/\/+$/, "").split("/").pop();
  if (!segment || segment === "instagram.com" || segment === "www.instagram.com")
    return null;
  return `@${segment}`;
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const SHOTS = [
  { seed: "snigdha-life-1", alt: "Home decor flat lay" },
  { seed: "snigdha-life-2", alt: "Fashion detail shot" },
  { seed: "snigdha-life-3", alt: "Minimal table setting" },
  { seed: "snigdha-life-4", alt: "Lifestyle accessory" },
];

export async function InstagramStrip() {
  const [{ t }, { socials }] = await Promise.all([
    getTranslations(),
    getLayoutSettings(),
  ]);
  const socialHandle = instagramHandle(socials.instagram);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-accent-text text-xs font-semibold tracking-[0.2em] uppercase">
            {t("home.instagram.eyebrow")}
          </p>
          <h2 className="font-heading mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("home.instagram.title")}
          </h2>
        </div>
        <Link
          href={socials.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <InstagramIcon className="size-4" />
          {socialHandle ?? t("home.instagram.title")}
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {SHOTS.map((shot) => (
          <div
            key={shot.seed}
            className="group bg-muted relative aspect-square overflow-hidden rounded-xl"
          >
            <Image
              src={`https://picsum.photos/seed/${shot.seed}/600/600`}
              alt={shot.alt}
              fill
              sizes="(min-width: 640px) 25vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
