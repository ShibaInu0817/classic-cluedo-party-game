/** A language's own name for itself ("中文", "English", "Français"). */
export function langName(code: string): string {
  try {
    const n = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
    return n.charAt(0).toLocaleUpperCase(code) + n.slice(1);
  } catch {
    return code;
  }
}
