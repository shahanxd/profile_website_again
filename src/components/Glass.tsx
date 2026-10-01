import type { ElementType, ReactNode } from 'react';

interface GlassProps {
  as?: ElementType;
  className?: string;
  'aria-label'?: string;
  children: ReactNode;
}

/**
 * Glass that suits pixels: what is behind it blurred, a faint Bayer tile over
 * that, corners cut in steps, a page pixel of light along the inner top and
 * left. Solid where the browser cannot blur. Keep to two on screen at once
 * (the menu and the band's panel), and never put it inside something clipped
 * or masked, which would leave it nothing to blur.
 */
export function Glass({ as: Tag = 'div', className = '', children, ...rest }: GlassProps) {
  return (
    <Tag className={`glass step-1 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
