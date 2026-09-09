import { Capacitor } from "@capacitor/core";

export async function exportCsv(csv, filename) {
  const data = `\uFEFF${csv}`;
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"), import("@capacitor/share"),
    ]);
    // Use private app cache, not broad external-storage permissions. Reuse this
    // one file so successive exports don't accumulate sensitive workout data.
    const { uri } = await Filesystem.writeFile({
      path: "exports/fitbae-workouts.csv", data, directory: Directory.Cache,
      encoding: Encoding.UTF8, recursive: true,
    });
    try {
      await Share.share({ title: "FitBae workout history", files: [uri], dialogTitle: "Save or share your workouts" });
    } catch (error) {
      if (!/cancel/i.test(error.message || "")) throw error;
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
