(function applyRandomUUIDPolyfill() {
  const g: any = globalThis as any;

  if (!g.crypto) g.crypto = {};
  if (typeof g.crypto.randomUUID === "function") return;

  g.crypto.randomUUID = function randomUUID() {
    if (!g.crypto.getRandomValues) {
      throw new Error("crypto.getRandomValues is not available; cannot polyfill randomUUID");
    }
    const bytes = new Uint8Array(16);
    g.crypto.getRandomValues(bytes);

    // RFC4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b: number) => b.toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") + "-" +
      hex.slice(4, 6).join("") + "-" +
      hex.slice(6, 8).join("") + "-" +
      hex.slice(8, 10).join("") + "-" +
      hex.slice(10, 16).join("")
    );
  };
})();
