/**
 * The garden's tulip bed and clipped hedge as a full-width strip, in the
 * staging of the split being shown: ground for the foot of the page, or of a
 * section, to stand on. Decoration only.
 */
export function FlowerBed({ className = '' }: { className?: string }) {
  return <div className={`bed ${className}`} aria-hidden="true" />;
}
