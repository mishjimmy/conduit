"use client";

import { QRCodeSVG } from "qrcode.react";

export function PairingScreen({ code, online }: { code: string; online: boolean }) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://conduit.local";
  const pairUrl = `${base}/pair?code=${encodeURIComponent(code)}`;

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-8 bg-black text-white">
      <h1 className="text-3xl font-semibold tracking-tight">Pair this screen</h1>

      <div className="rounded-2xl bg-white p-6">
        <QRCodeSVG value={pairUrl} size={260} />
      </div>

      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-white/60">Pairing code</p>
        <p className="mt-1 font-mono text-5xl font-bold tracking-[0.2em]">{code}</p>
      </div>

      <p className="max-w-md text-center text-white/60">
        Scan the QR code or enter the code in the Conduit CMS to assign this screen a
        name, location, and playlist.
      </p>

      {!online && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-amber-400/80">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
          connection lost — retrying
        </div>
      )}
    </main>
  );
}
