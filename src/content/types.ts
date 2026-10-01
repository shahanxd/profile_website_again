import type { sectionArt } from './sectionArt';

/**
 * The placeholder policy. Anything the owner has not supplied or approved yet
 * still ships, as a stand-in that belongs to the page and says plainly what
 * will go there. A stand-in never poses as a fact: no invented names,
 * clients, awards or numbers. Two marks keep them findable:
 *
 *  - wording that is not the owner's is wrapped in draft();
 *  - facts and pieces carry `confirmed: false` until the owner confirms or
 *    supplies them.
 *
 * Both render the same in production. In development they are outlined
 * (see Text.tsx and devMark in visible.ts).
 */
export type Copy = string | { draft: string };

export const draft = (text: string): Copy => ({ draft: text });
export const copyText = (copy: Copy): string => (typeof copy === 'string' ? copy : copy.draft);
export const isDraft = (copy: Copy): boolean => typeof copy !== 'string';

/** Section ids are shared by both splits, so a link like #work means the same place on either side. */
export type SlotId = 'about' | 'work' | 'proof' | 'contact';

/**
 * A view of the garden that stands in for a picture not supplied yet (the
 * Thumb component draws it in the staging of the split being shown). One of:
 * pavilion, pool, horizon, canopy, beds, lantern, carpet, sky, cypress, cat.
 */
export type ThumbName = keyof (typeof sectionArt)['creative']['views'];

export interface Picture {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface LinkItem {
  kind: 'repo' | 'live' | 'package' | 'video' | 'social' | 'resume' | 'email';
  label: string;
  href: string;
}

/** A number or fact shown as evidence. Unconfirmed ones are old or unverified; give them an asOf so they do not pose as current (the band says it once for all its numbers). */
export interface Result {
  value: string;
  label: string;
  confirmed: boolean;
  asOf?: string;
}

export interface Project {
  id: string;
  name: string;
  /** feature: a large showcase. grid: a compact card. */
  size: 'feature' | 'grid';
  /** plain: serious subject; no playful motion or jokes around it. */
  tone?: 'plain';
  line: Copy;
  /** What was hard, and what the owner built. */
  body: Copy;
  results: Result[];
  stack: string[];
  links: LinkItem[];
  /** The stand-in picture, shown until `image` is supplied. */
  thumb: ThumbName;
  /** A real screenshot, diagram or capture. */
  image?: Picture;
  /** Said under a showcase's picture. While that picture is an illustration and not a capture, the caption says so. */
  caption?: Copy;
}

export interface Achievement {
  title: Copy;
  detail?: Copy;
  /** When it happened. Leave it out for a line that is still to come: it says "not yet". */
  year?: string;
  href?: string;
  /** Its lamp is lit only once this is true (and there is a year): an unconfirmed line never shines as a result. */
  confirmed: boolean;
}

export interface ShowcaseItem {
  id: string;
  kind: 'video' | 'design' | 'game';
  title: Copy;
  role?: Copy;
  client?: string;
  year?: string;
  /** Videos load their player only when pressed. */
  youtubeId?: string;
  /** The stand-in picture, shown until `image` (or a video) is supplied. */
  thumb: ThumbName;
  image?: Picture;
  /** Said under the stand-in picture, where it could otherwise be taken for the piece's own art. */
  standIn?: Copy;
  href?: string;
  tone?: 'plain';
  /** False until the owner supplies the real piece; until then the title says what will go here. */
  confirmed: boolean;
}

/** A client's words. Stand-ins say what will sit there and name nobody; real ones are supplied by the owner. */
export interface Testimonial {
  quote: Copy;
  /** Who said it. A stand-in says "name, what they do". */
  name: Copy;
  href?: string;
  confirmed: boolean;
}

export interface NavItem {
  slot: SlotId;
  label: string;
}

/** A section's heading. `mark` is the phrase in it that gets the pen underline (it must appear in the heading as written). */
interface Headed {
  heading: Copy;
  mark?: string;
}

interface SplitBase {
  hero: { line: Copy; sub: Copy };
  nav: NavItem[];
  /** The scene band mid-page: one line and the headline numbers. */
  band: { line: Copy; numbers: Result[] };
  contact: Headed & { line: Copy; links: LinkItem[]; note?: Copy };
}

export interface TechContent extends SplitBase {
  about: Headed & { paragraphs: Copy[]; toolkit: string[] };
  work: Headed & { intro?: Copy; projects: string[] };
  proof: Headed & { achievements: Achievement[] };
}

export interface CreativeContent extends SplitBase {
  about: Headed & { paragraphs: Copy[]; toolkit: string[] };
  work: Headed & { intro?: Copy; items: ShowcaseItem[] };
  proof: Headed & { testimonials: Testimonial[] };
}

export interface SiteContent {
  owner: { name: string; handle: string; city: string };
  projects: Record<string, Project>;
  tech: TechContent;
  creative: CreativeContent;
}
