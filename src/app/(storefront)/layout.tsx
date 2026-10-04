import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { getLayoutSettings } from "@/lib/settings";

export default async function StorefrontLayout({ children }: LayoutProps<"/">) {
  const settings = await getLayoutSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar settings={settings} />
      <Header settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </div>
  );
}
