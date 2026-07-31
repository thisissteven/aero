'use client';

import { cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useMemo,
} from 'react';

export type TimelineAlign = 'center' | 'start';
export type TimelineAxis = 'center' | 'start';
export type TimelineDensity = 'comfortable' | 'compact';
export type TimelinePlacement = 'alternate' | TimelineSide;
export type TimelineSide = 'end' | 'start';
export type TimelineSize = 'lg' | 'md' | 'sm';
export type TimelineStatus =
  'current' | 'danger' | 'default' | 'muted' | 'success' | 'warning';

interface TimelineContextValue {
  axis: TimelineAxis;
  itemAlign: TimelineAlign;
  markerClass: string;
  placement: TimelinePlacement;
}
export interface TimelineItemContextValue {
  align: TimelineAlign;
  index: number;
  isLast: boolean;
  side: TimelineSide;
  status: TimelineStatus;
}
const TimelineContext = createContext<TimelineContextValue>({
  axis: 'start',
  itemAlign: 'start',
  markerClass: 'timeline__marker--md',
  placement: 'end',
});
const ItemContext = createContext<TimelineItemContextValue>({
  align: 'start',
  index: 0,
  isLast: false,
  side: 'end',
  status: 'default',
});
export const useTimelineItem = (): TimelineItemContextValue =>
  useContext(ItemContext);

const isTimelineItem = (
  node: ReactNode,
): node is ReactElement<TimelineItemProps> =>
  isValidElement(node) && node.type === TimelineItem;
const resolveSide = (
  index: number,
  placement: TimelinePlacement,
  side?: TimelineSide,
): TimelineSide =>
  side ??
  (placement === 'alternate' ? (index % 2 === 0 ? 'end' : 'start') : placement);

export interface TimelineRootProps extends Omit<
  ComponentPropsWithRef<'ol'>,
  'children'
> {
  axis?: TimelineAxis;
  children: ReactNode;
  density?: TimelineDensity;
  itemAlign?: TimelineAlign;
  placement?: TimelinePlacement;
  size?: TimelineSize;
}
export function TimelineRoot({
  axis = 'start',
  children,
  className,
  density = 'comfortable',
  itemAlign = 'start',
  placement = 'end',
  size = 'md',
  ...props
}: TimelineRootProps): ReactElement {
  const context = useMemo(
    () => ({
      axis,
      itemAlign,
      markerClass: `timeline__marker--${size}`,
      placement,
    }),
    [axis, itemAlign, placement, size],
  );
  const nodes = Children.toArray(children);
  const itemCount = nodes.filter(isTimelineItem).length;
  let itemIndex = 0;
  const renderedChildren = nodes.map((node) => {
    if (!isTimelineItem(node)) return node;
    const index = itemIndex++;
    return cloneElement(node, {
      _index: index,
      _isLast: index === itemCount - 1,
      _side: resolveSide(index, placement, node.props.side),
      key: node.key ?? `timeline-item-${index}`,
    });
  });

  return (
    <TimelineContext value={context}>
      <ol
        className={cn(
          'timeline',
          `timeline--axis-${axis}`,
          `timeline--${density}`,
          `timeline--${size}`,
          className,
        )}
        data-axis={axis}
        data-placement={placement}
        data-slot='timeline'
        {...props}
      >
        {renderedChildren}
      </ol>
    </TimelineContext>
  );
}

export interface TimelineItemProps extends Omit<
  ComponentPropsWithRef<'li'>,
  'content'
> {
  align?: TimelineAlign;
  children?: ReactNode;
  side?: TimelineSide;
  status?: TimelineStatus;
  _index?: number;
  _isLast?: boolean;
  _side?: TimelineSide;
}
export function TimelineItem({
  _index,
  _isLast,
  _side,
  align,
  children,
  className,
  side,
  status = 'default',
  ...props
}: TimelineItemProps): ReactElement {
  const timeline = useContext(TimelineContext);
  const index = _index ?? 0;
  const isLast = _isLast ?? false;
  const itemAlign = align ?? timeline.itemAlign;
  const itemSide = _side ?? resolveSide(index, timeline.placement, side);
  const context = useMemo(
    () => ({ align: itemAlign, index, isLast, side: itemSide, status }),
    [index, isLast, itemAlign, itemSide, status],
  );
  const contents: ReactNode[] = [];
  const railParts: ReactElement[] = [];
  let rail: ReactElement<TimelineRailProps> | null = null;
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === TimelineRail)
      rail = child as ReactElement<TimelineRailProps>;
    else if (
      isValidElement(child) &&
      (child.type === TimelineMarker || child.type === TimelineConnector)
    )
      railParts.push(child);
    else contents.push(child);
  });
  const resolvedRail = rail as ReactElement<TimelineRailProps> | null;
  const renderedRail =
    resolvedRail && railParts.length > 0
      ? cloneElement(resolvedRail, {
          children: (
            <>
              {resolvedRail.props.children}
              {railParts}
            </>
          ),
        })
      : (resolvedRail ?? <TimelineRail>{railParts}</TimelineRail>);

  return (
    <ItemContext value={context}>
      <li
        aria-current={status === 'current' ? 'true' : undefined}
        className={cn(
          'timeline__item',
          `timeline__item--align-${itemAlign}`,
          className,
        )}
        data-align={itemAlign}
        data-index={index}
        data-last={isLast || undefined}
        data-side={itemSide}
        data-slot='timeline-item'
        data-status={status}
        {...props}
      >
        {contents}
        {renderedRail}
      </li>
    </ItemContext>
  );
}

export interface TimelineRailProps extends ComponentPropsWithRef<'span'> {
  children?: ReactNode;
}
export function TimelineRail({
  children,
  className,
  ...props
}: TimelineRailProps): ReactElement {
  const nodes = Children.toArray(children);
  const hasMarker = nodes.some(
    (node) => isValidElement(node) && node.type === TimelineMarker,
  );
  const hasConnector = nodes.some(
    (node) => isValidElement(node) && node.type === TimelineConnector,
  );
  return (
    <span
      className={cn('timeline__rail', className)}
      data-slot='timeline-rail'
      {...props}
    >
      {!hasMarker ? <TimelineMarker /> : null}
      {children}
      {!hasConnector ? <TimelineConnector /> : null}
    </span>
  );
}

export interface TimelineMarkerProps extends ComponentPropsWithRef<'span'> {
  children?: ReactNode;
  status?: TimelineStatus;
}
export function TimelineMarker({
  'aria-hidden': ariaHidden,
  children,
  className,
  status,
  ...props
}: TimelineMarkerProps): ReactElement {
  const timeline = useContext(TimelineContext);
  const item = useContext(ItemContext);
  return (
    <span
      aria-hidden={children ? ariaHidden : (ariaHidden ?? true)}
      className={cn('timeline__marker', timeline.markerClass, className)}
      data-slot='timeline-marker'
      data-status={status ?? item.status}
      {...props}
    >
      {children}
    </span>
  );
}

export interface TimelineConnectorProps extends ComponentPropsWithRef<'span'> {
  force?: boolean;
}
export function TimelineConnector({
  className,
  force,
  ...props
}: TimelineConnectorProps): ReactElement | null {
  const { isLast } = useContext(ItemContext);
  if (isLast && !force) return null;
  return (
    <span
      aria-hidden='true'
      className={cn('timeline__connector', className)}
      data-force={force || undefined}
      data-slot='timeline-connector'
      {...props}
    />
  );
}

export interface TimelineContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  side?: TimelineSide;
}
export function TimelineContent({
  children,
  className,
  side,
  ...props
}: TimelineContentProps): ReactElement {
  const item = useContext(ItemContext);
  const contentSide = side ?? item.side;
  return (
    <div
      className={cn('timeline__content', className)}
      data-side={contentSide}
      data-slot='timeline-content'
      {...props}
    >
      {children}
    </div>
  );
}

type TimelineComponent = typeof TimelineRoot & {
  Connector: typeof TimelineConnector;
  Content: typeof TimelineContent;
  Item: typeof TimelineItem;
  Marker: typeof TimelineMarker;
  Rail: typeof TimelineRail;
  Root: typeof TimelineRoot;
  useItem: typeof useTimelineItem;
};
export const Timeline: TimelineComponent = Object.assign(TimelineRoot, {
  Connector: TimelineConnector,
  Content: TimelineContent,
  Item: TimelineItem,
  Marker: TimelineMarker,
  Rail: TimelineRail,
  Root: TimelineRoot,
  useItem: useTimelineItem,
});
