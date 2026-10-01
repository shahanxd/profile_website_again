interface KilimDividerProps {
  /** Run the full width of the window, without the fringed ends. */
  bleed?: boolean;
  className?: string;
}

/**
 * The carpet's border as a rule between things: a band of stepped diamonds
 * in the staging's own madder, indigo and cream. Page-wide with a fringe at
 * each end, or full-bleed.
 */
export function KilimDivider({ bleed, className = '' }: KilimDividerProps) {
  return (
    <div className={`${bleed ? '' : 'page'} ${className}`} aria-hidden="true">
      <div className="kilim" data-bleed={bleed ? '' : undefined} />
    </div>
  );
}
