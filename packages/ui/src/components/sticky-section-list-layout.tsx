'use client';

import type { Node } from '@react-types/shared';
import { ListLayout, type ListLayoutOptions } from 'react-aria-components';
import type { InvalidationContext } from 'react-stately/useVirtualizerState';

export interface StickySectionListLayoutOptions extends ListLayoutOptions {
  /**
   * Pixels to lift the sticky header above the scrollport's top edge. A
   * negative value tucks it into the scroll container's top padding.
   * @default 0
   */
  stickyHeaderOffset?: number;
}

/**
 * A `ListLayout` variant that pins section headers to the top of the scroll
 * container while their section is in view.
 *
 * React Aria natively marks a layout info as sticky only when `isSticky` is
 * set, and it derives the sticky `top` offset directly from `rect.y`. Section
 * headers are laid out at their section's offset, so pinning them as-is would
 * anchor each header to its own section offset instead of the scrollport top.
 *
 * Item positions are resolved by `buildSection` before we touch the header, so
 * resetting only the header's own `rect.y` keeps the rest of the layout (item
 * offsets and content size) intact while making the header stick to the top of
 * the scroll container. `VirtualizerItem` then emits `position: sticky` at the
 * configured offset, and the section wrapper's overflow-visible bounds
 * naturally clamp the header so it gets pushed out by the next section.
 */
export class StickySectionListLayout<
  T,
  O extends StickySectionListLayoutOptions = StickySectionListLayoutOptions,
> extends ListLayout<T, O> {
  private stickyHeaderOffset = 0;

  override update(invalidationContext: InvalidationContext<O>) {
    super.update(invalidationContext);
    const offset = invalidationContext.layoutOptions?.stickyHeaderOffset;
    if (offset !== undefined) this.stickyHeaderOffset = offset;
  }

  protected override buildSection(node: Node<T>, x: number, y: number) {
    const section = super.buildSection(node, x, y);

    if (this.orientation !== 'vertical') return section;

    const header = section.children?.find(
      (child) => child.layoutInfo.type === 'header',
    );

    if (!header) return section;

    header.layoutInfo.isSticky = true;
    header.layoutInfo.zIndex = 1;
    header.layoutInfo.rect.y = this.stickyHeaderOffset;

    return section;
  }
}
