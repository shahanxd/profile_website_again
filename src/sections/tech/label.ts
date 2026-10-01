import { site } from '../../content/site';
import type { SlotId } from '../../content/types';

/** What the tech side calls a section, as the menu does (site.tech.nav). */
export function techLabel(slot: SlotId): string {
  return site.tech.nav.find((item) => item.slot === slot)?.label ?? slot;
}
