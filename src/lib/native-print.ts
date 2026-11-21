/** Bridge exposed by the Aadesh desktop app (electron/preload.cjs). Absent in normal browsers. */
type DesktopBridge = { printReceipt: (opts: { widthMm: number }) => Promise<{ ok: boolean; error?: string }> };

function bridge(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { aadeshDesktop?: DesktopBridge }).aadeshDesktop;
}

export function isDesktopApp() {
  return !!bridge();
}

/**
 * Prints the receipt currently mounted for print. In the desktop app this prints silently
 * to the default printer with zero margins; in a browser it opens the native print dialog.
 */
export async function printReceipt(widthMm = 80): Promise<boolean> {
  const b = bridge();
  if (b) {
    const res = await b.printReceipt({ widthMm });
    return res.ok;
  }
  window.print();
  return true;
}
