const WORDS = [
  "WOLF", "BEAR", "HAWK", "LION", "PUMA", "LYNX", "ORCA", "CROW",
  "DEER", "MOTH", "IBIS", "KITE", "SEAL", "TERN", "WREN", "DOVE",
];

/** Temporary, single-use pairing code shown on the device, e.g. `WOLF-3847`. */
export function generatePairingCode(): string {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]!;
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${digits}`;
}
