import type { SplitId } from './types';

export interface SplitMeta {
  id: SplitId;
  label: string;
  path: string;
  title: string;
  description: string;
  themeColor: string;
}

export const SPLITS: Record<SplitId, SplitMeta> = {
  creative: {
    id: 'creative',
    label: 'creative',
    path: '/creative',
    title: 'shahan · creative',
    description: 'video editing, graphic design and things made with care, by shahan.',
    themeColor: '#f3e6cc',
  },
  tech: {
    id: 'tech',
    label: 'tech',
    path: '/tech',
    title: 'shahan · tech',
    description: 'ml systems, developer tools and robots, built by shahan.',
    themeColor: '#14162e',
  },
};

export const SPLIT_IDS: SplitId[] = ['creative', 'tech'];

export function otherSplit(split: SplitId): SplitId {
  return split === 'creative' ? 'tech' : 'creative';
}

/** A split URL names its split; everything else (the bare address) is creative. */
export function splitFromPath(pathname: string): SplitId {
  return /\/tech\/?$/.test(pathname) ? 'tech' : 'creative';
}
