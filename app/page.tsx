import { KioskShell } from "@/features/kiosk";
import { loadOptions } from "@/features/kiosk/options-file";

// Read options.txt when the page is served, not when the app is built: every
// kiosk runs the same build, and the file is what tells them apart.
export const dynamic = "force-dynamic";

export default async function Home() {
  return <KioskShell options={await loadOptions()} />;
}
