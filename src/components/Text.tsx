import type { ElementType, ReactNode } from 'react';
import { copyText, isDraft, type Copy } from '../content/types';
import { draftMark } from '../content/visible';

interface TextProps {
  copy: Copy;
  as?: ElementType;
  className?: string;
  id?: string;
  tabIndex?: number;
  children?: ReactNode;
}

/** Renders site copy. Drafts look the same to visitors; on the development server, ?drafts=1 outlines them. */
export function Text({ copy, as: Tag = 'span', children, ...rest }: TextProps) {
  return (
    <Tag {...rest} {...draftMark(isDraft(copy))}>
      {copyText(copy)}
      {children}
    </Tag>
  );
}
