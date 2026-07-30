/** Lightweight language guess for comment UI (no external API). */
export function detectCommentLanguage(text: string): string {
  const sample = text.replace(/\s+/g, "");
  if (!sample) return "unknown";

  let hangul = 0;
  let latin = 0;
  let cjk = 0;
  for (const ch of sample) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7a3) hangul += 1;
    else if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff)
    ) {
      cjk += 1;
    } else if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a)
    ) {
      latin += 1;
    }
  }

  const total = hangul + latin + cjk;
  if (total === 0) return "unknown";
  if (hangul / total >= 0.25) return "ko";
  if (cjk / total >= 0.25) return "ja";
  if (latin / total >= 0.4) return "en";
  return "unknown";
}
