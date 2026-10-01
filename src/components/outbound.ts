const LEAVES_THE_PAGE = /^(https?:)?\/\/|\.pdf$/i;

/**
 * Attributes for a link by where it goes. A link to another site, or to a
 * file such as the resume, opens in a new tab so the garden stays open
 * behind it. In-page links, the other split and mailto stay in this tab.
 */
export function outbound(href: string, rel = ''): { target?: '_blank'; rel?: string } {
  if (LEAVES_THE_PAGE.test(href)) {
    const words = new Set(`${rel} noopener noreferrer`.split(' ').filter(Boolean));
    return { target: '_blank', rel: [...words].join(' ') };
  }
  return rel ? { rel } : {};
}
