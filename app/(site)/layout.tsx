import SiteChrome from "@/components/SiteChrome";
import MiniPlayer from "@/components/radio/MiniPlayer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteChrome />
      <div className="site-shell">{children}</div>
      <MiniPlayer />
    </>
  );
}
