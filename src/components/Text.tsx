import type { ElementType, ReactNode } from 'react';
import { copyText, isDraft, type Copy } from '../content/types';

interface TextProps {
  copy: Copy;
  as?: ElementType;
  className?: string;
  id?: string;
  tabIndex?: number;
  children?: ReactNode;
}

/** Renders site copy. Drafts look the same to visitors but are marked while developing. */
export function Text({ copy, as: Tag = 'span', children, ...rest }: TextProps) {
  const marked = import.meta.env.DEV && isDraft(copy);
  return (
    <Tag {...rest} data-draft={marked ? '' : undefined} title={marked ? 'draft copy' : undefined}>
      {copyText(copy)}
      {children}
    </Tag>
  );
}
