const URL_PATTERN = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g;

export function extractLinks(text: string | null): string[] {
  return text ? (text.match(URL_PATTERN) ?? []) : [];
}

export function splitByLinks(text: string): Array<{ text: string; isLink: boolean }> {
  const parts: Array<{ text: string; isLink: boolean }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ text: text.slice(lastIndex, index), isLink: false });
    parts.push({ text: match[0], isLink: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), isLink: false });
  return parts;
}
