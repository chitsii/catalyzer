import dynamic from "next/dynamic";

// Dynamic import with SSR disabled to avoid Tauri API errors during build
const HomeContent = dynamic(() => import("./home-content"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-muted/40">
      <div className="text-lg">Loading...</div>
    </div>
  ),
});

export default function Home() {
  return <HomeContent />;
}
