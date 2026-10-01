import type { SplitId } from '../split/types';

/**
 * Copy that the owner has not written or approved yet is wrapped in draft().
 * Drafts render normally but are outlined in development, and `npm run check`
 * counts them, so nothing unapproved slips out unnoticed.
 */
export type Copy = string | { draft: string };

export const draft = (text: string): Copy => ({ draft: text });
export const copyText = (copy: Copy): string => (typeof copy === 'string' ? copy : copy.draft);
export const isDraft = (copy: Copy): boolean => typeof copy !== 'string';

/** Section ids are shared by both splits, so a link like #work means the same place on either side. */
export type SlotId = 'about' | 'work' | 'proof' | 'contact';

export interface LinkItem {
  kind: 'repo' | 'live' | 'package' | 'video' | 'social' | 'resume' | 'email';
  label: string;
  href: string;
}

/** A number or fact shown as evidence. Unconfirmed ones are never rendered in a production build. */
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
  image?: { src: string; alt: string; width: number; height: number };
}

export interface Achievement {
  title: Copy;
  detail?: Copy;
  year?: string;
  href?: string;
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
  image?: { src: string; alt: string; width: number; height: number };
  href?: string;
  tone?: 'plain';
  /** False until the owner supplies the real piece; hidden in production. */
  confirmed: boolean;
}

/** Only real quotes supplied by the owner go here. */
export interface Testimonial {
  quote: string;
  name: string;
  role?: string;
  href?: string;
}

export interface NavItem {
  slot: SlotId;
  label: string;
}

interface SplitBase {
  hero: { line: Copy; sub: Copy };
  nav: NavItem[];
  band: { line: Copy; numbers: Result[] };
  contact: { heading: Copy; line: Copy; links: LinkItem[] };
}

export interface TechContent extends SplitBase {
  about: { heading: Copy; paragraphs: Copy[]; toolkit: string[] };
  work: { heading: Copy; intro?: Copy; projects: string[] };
  proof: { heading: Copy; achievements: Achievement[] };
}

export interface CreativeContent extends SplitBase {
  about: { heading: Copy; paragraphs: Copy[]; toolkit: string[] };
  work: { heading: Copy; intro?: Copy; items: ShowcaseItem[] };
  proof: { heading: Copy; testimonials: Testimonial[] };
}

export interface SiteContent {
  owner: { name: string; handle: string; city: string };
  projects: Record<string, Project>;
  tech: TechContent;
  creative: CreativeContent;
}

export type ContentFor<S extends SplitId> = S extends 'tech' ? TechContent : CreativeContent;
