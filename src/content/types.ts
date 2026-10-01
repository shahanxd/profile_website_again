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
 * Both render the same in production. In development they are outlined when
 * the address carries ?drafts=1 (see showDrafts in visible.ts).
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

/** A number or fact shown as evidence. `asOf` says when it was counted ("now", "early 2025"); the band says it once for all its numbers. Unconfirmed ones are old or unverified: give them an asOf so they do not pose as current. */
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
  /** A real screenshot, diagram or capture: a showcase shows it in place of its illustration, and a card that has the whole row (a plain one) shows it beside its words. */
  image?: Picture;
  /** Said under a showcase's picture. While that picture is an illustration and not a capture, the caption says so. */
  caption?: Copy;
}

export interface Achievement {
  title: Copy;
  detail?: Copy;
  /** When it happened: a year, a span ("2025 to 2026") or "2026, ongoing". Leave it out where it is not known. */
  year?: string;
  href?: string;
  /** Its lamp is lit only once this is true: an unconfirmed line never shines as a result. Unconfirmed and without a year, it is a line still to come and says "not yet". */
  confirmed: boolean;
}

/** A self-hosted video: the file, the still shown until it is played, and how long it runs. */
export interface VideoFile {
  src: string;
  poster: Picture;
  width: number;
  height: number;
  seconds: number;
}

export interface ShowcaseItem {
  id: string;
  kind: 'video' | 'design' | 'photo' | 'game';
  title: Copy;
  /** One line about the piece. */
  role?: Copy;
  /** A video: nothing of it is fetched until its play mark is pressed. */
  video?: VideoFile;
  /** A design's pages, in order. The first is its cover; opened, the piece is paged through. */
  pages?: Picture[];
  /** The piece's own picture: a photograph as shown in the row, or a still (sumud). */
  image?: Picture;
  /** A photograph at full size, for when it is opened. */
  full?: Picture;
  /** A view of the garden that stands in until the piece's own picture is supplied. */
  thumb?: ThumbName;
  /** Said under the stand-in picture, where it could otherwise be taken for the piece's own art. */
  standIn?: Copy;
  href?: string;
  tone?: 'plain';
  /** False until the owner supplies the real piece; until then the title says what will go here. */
  confirmed: boolean;
}

/** A client's words, as the client wrote them. A stand-in says what will sit there and names nobody. */
export interface Testimonial {
  quote: Copy;
  /** Who said it, as far as the owner wants it said. */
  name: Copy;
  href?: string;
  confirmed: boolean;
}

/** Something in the toolkit: its name, and a word about it where one is needed ("main camera"). */
export type Tool = string | { name: string; note: string };

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
  about: Headed & { paragraphs: Copy[]; toolkit: Tool[]; resume?: LinkItem };
  work: Headed & { intro?: Copy; projects: string[] };
  proof: Headed & { achievements: Achievement[] };
}

export interface CreativeContent extends SplitBase {
  about: Headed & { paragraphs: Copy[]; toolkit: Tool[] };
  /** `lines` is what a group says under its name (keyed by the kind of piece it holds). */
  work: Headed & { intro?: Copy; lines?: Partial<Record<ShowcaseItem['kind'], Copy>>; items: ShowcaseItem[] };
  /** `note` is said once above the notes: who the words are from. */
  proof: Headed & { note?: Copy; testimonials: Testimonial[] };
}

export interface SiteContent {
  owner: { name: string; handle: string; city: string };
  projects: Record<string, Project>;
  tech: TechContent;
  creative: CreativeContent;
}
