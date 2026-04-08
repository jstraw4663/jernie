// Parses "Title · detail one · detail two" or "Title — detail" into title + blurb.
// The first segment before · or — is the title; everything after is the blurb.
// Used by TimelineItem (full view) and SelectableListItem (edit mode, title-only).
export function parseItemText(text: string): { title: string; blurb: string } {
  const dotIdx = text.indexOf(' · ');
  if (dotIdx !== -1) return { title: text.slice(0, dotIdx), blurb: text.slice(dotIdx + 3) };
  const dashIdx = text.indexOf(' — ');
  if (dashIdx !== -1) return { title: text.slice(0, dashIdx), blurb: text.slice(dashIdx + 3) };
  return { title: text, blurb: '' };
}
