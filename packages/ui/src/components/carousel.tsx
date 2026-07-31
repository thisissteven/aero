'use client';

import { Button, cn, ScrollShadow } from '@heroui/react';
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Button as RacButton } from 'react-aria-components';
import { createPortal } from 'react-dom';

import { IconChevronLeft, IconChevronRight } from '../heroui-icons';

type CarouselType = 'in-place' | 'miniatures' | 'modal';
interface ContextValue {
  api: EmblaCarouselType | undefined;
  canScrollNext: boolean;
  canScrollPrev: boolean;
  emblaRef: ReturnType<typeof useEmblaCarousel>[0];
  scrollNext: () => void;
  scrollPrev: () => void;
  scrollSnapCount: number;
  scrollTo: (index: number) => void;
  selectedIndex: number;
  setViewportWrapper: (node: HTMLDivElement | null) => void;
  type: CarouselType;
  viewportWrapper: HTMLDivElement | null;
}
const Context = createContext<ContextValue | null>(null);
const useCarousel = () => {
  const value = useContext(Context);
  if (!value)
    throw new Error('Carousel components must be used inside Carousel.Root');
  return value;
};

export interface CarouselRootProps extends ComponentPropsWithRef<'div'> {
  opts?: EmblaOptionsType;
  plugins?: EmblaPluginType[];
  setApi?: (api: EmblaCarouselType) => void;
  type?: CarouselType;
}
function CarouselRoot({
  children,
  className,
  opts,
  plugins,
  setApi,
  type = 'in-place',
  ...props
}: CarouselRootProps): ReactElement {
  const [emblaRef, api] = useEmblaCarousel(opts, plugins);
  const [selectedIndex, setSelectedIndex] = useState(0),
    [scrollSnapCount, setScrollSnapCount] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false),
    [canScrollNext, setCanScrollNext] = useState(false);
  const [viewportWrapper, setViewportWrapper] = useState<HTMLDivElement | null>(
    null,
  );
  const update = useCallback((embla: EmblaCarouselType) => {
    setSelectedIndex(embla.selectedScrollSnap());
    setScrollSnapCount(embla.scrollSnapList().length);
    setCanScrollPrev(embla.canScrollPrev());
    setCanScrollNext(embla.canScrollNext());
  }, []);
  useEffect(() => {
    if (!api) return;
    setApi?.(api);
    update(api);
    api.on('select', update).on('reInit', update);
    return () => {
      api.off('select', update).off('reInit', update);
    };
  }, [api, setApi, update]);
  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]),
    scrollNext = useCallback(() => api?.scrollNext(), [api]),
    scrollTo = useCallback((index: number) => api?.scrollTo(index), [api]);
  const contextValue = useMemo(
    () => ({
      api,
      canScrollNext,
      canScrollPrev,
      emblaRef,
      scrollNext,
      scrollPrev,
      scrollSnapCount,
      scrollTo,
      selectedIndex,
      setViewportWrapper,
      type,
      viewportWrapper,
    }),
    [
      api,
      canScrollNext,
      canScrollPrev,
      emblaRef,
      scrollNext,
      scrollPrev,
      scrollSnapCount,
      scrollTo,
      selectedIndex,
      type,
      viewportWrapper,
    ],
  );

  return (
    <Context value={contextValue}>
      {/* The carousel viewport is intentionally focusable for arrow-key navigation. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        {...props}
        aria-roledescription='carousel'
        className={cn('carousel', `carousel--${type}`, className)}
        data-slot='carousel'
        onKeyDownCapture={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            scrollPrev();
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            scrollNext();
          }
        }}
        role='region'
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        {children}
      </div>
    </Context>
  );
}
function CarouselContent({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  const { emblaRef, setViewportWrapper } = useCarousel();
  return (
    <div
      className='carousel__viewport-wrapper'
      data-slot='carousel-viewport-wrapper'
      ref={setViewportWrapper}
    >
      <div
        className='carousel__viewport'
        data-slot='carousel-viewport'
        ref={emblaRef}
      >
        <div
          {...props}
          className={cn('carousel__content', className)}
          data-slot='carousel-content'
        >
          {children}
        </div>
      </div>
    </div>
  );
}
function CarouselItem({
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  useCarousel();
  return (
    <div
      {...props}
      aria-roledescription='slide'
      className={cn('carousel__item', className)}
      data-slot='carousel-item'
      role='group'
    />
  );
}
interface CarouselControlProps extends Omit<
  ComponentPropsWithRef<typeof Button>,
  'children' | 'className' | 'onPress'
> {
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
}
function CarouselPrevious({
  children,
  className,
  icon,
  ...props
}: CarouselControlProps): ReactElement | null {
  const { canScrollPrev, scrollPrev, type, viewportWrapper } = useCarousel();
  const button = (
    <Button
      aria-label='Previous slide'
      className={
        cn('carousel__previous', `carousel__previous--${type}`, className) ??
        'carousel__previous'
      }
      data-slot='carousel-previous'
      isDisabled={!canScrollPrev}
      isIconOnly
      onPress={scrollPrev}
      size='sm'
      variant='tertiary'
      {...props}
    >
      {children ?? icon ?? <IconChevronLeft />}
    </Button>
  );
  return type === 'miniatures'
    ? button
    : viewportWrapper
      ? createPortal(button, viewportWrapper)
      : null;
}
function CarouselNext({
  children,
  className,
  icon,
  ...props
}: CarouselControlProps): ReactElement | null {
  const { canScrollNext, scrollNext, type, viewportWrapper } = useCarousel();
  const button = (
    <Button
      aria-label='Next slide'
      className={
        cn('carousel__next', `carousel__next--${type}`, className) ??
        'carousel__next'
      }
      data-slot='carousel-next'
      isDisabled={!canScrollNext}
      isIconOnly
      onPress={scrollNext}
      size='sm'
      variant='tertiary'
      {...props}
    >
      {children ?? icon ?? <IconChevronRight />}
    </Button>
  );
  return type === 'miniatures'
    ? button
    : viewportWrapper
      ? createPortal(button, viewportWrapper)
      : null;
}

export interface CarouselDotsProps extends ComponentPropsWithRef<'div'> {
  renderDot?: (state: { index: number; isSelected: boolean }) => ReactNode;
}
function CarouselDots({
  className,
  renderDot,
  ...props
}: CarouselDotsProps): ReactElement | null {
  const { scrollSnapCount, scrollTo, selectedIndex } = useCarousel();
  if (scrollSnapCount <= 1) return null;
  return (
    <div
      {...props}
      aria-label='Slide indicators'
      className={cn('carousel__dots', className)}
      data-slot='carousel-dots'
      role='tablist'
    >
      {Array.from({ length: scrollSnapCount }, (_, index) => {
        const isSelected = selectedIndex === index;
        return renderDot ? (
          <Fragment key={index}>{renderDot({ index, isSelected })}</Fragment>
        ) : (
          <RacButton
            aria-label={`Go to slide ${index + 1}`}
            aria-selected={isSelected}
            className='carousel__dot'
            data-selected={isSelected || undefined}
            data-slot='carousel-dot'
            key={index}
            onPress={() => scrollTo(index)}
          />
        );
      })}
    </div>
  );
}
export interface CarouselThumbnailsProps extends Omit<
  ComponentPropsWithRef<typeof ScrollShadow>,
  'size'
> {
  hideScrollBar?: boolean;
  scrollShadowSize?: number;
}
function CarouselThumbnails({
  className,
  hideScrollBar = true,
  scrollShadowSize = 40,
  ...props
}: CarouselThumbnailsProps): ReactElement {
  const { type } = useCarousel();
  return (
    <ScrollShadow
      {...props}
      aria-label='Slide thumbnails'
      className={cn(
        'carousel__thumbnails',
        type === 'miniatures' && 'carousel__thumbnails--miniatures',
        className,
      )}
      data-slot='carousel-thumbnails'
      hideScrollBar={hideScrollBar}
      orientation='horizontal'
      role='tablist'
      size={scrollShadowSize}
    />
  );
}
export interface CarouselThumbnailProps extends Omit<
  ComponentPropsWithRef<typeof RacButton>,
  'children' | 'className' | 'onPress'
> {
  alt?: string;
  children?: ReactNode;
  className?: string;
  index: number;
  src?: string;
}
function CarouselThumbnail({
  alt = '',
  children,
  className,
  index,
  src,
  ...props
}: CarouselThumbnailProps): ReactElement {
  const { scrollTo, selectedIndex } = useCarousel();
  return (
    <RacButton
      aria-label={`Go to slide ${index + 1}`}
      aria-selected={selectedIndex === index}
      className={cn('carousel__thumbnail', className) ?? 'carousel__thumbnail'}
      data-selected={selectedIndex === index || undefined}
      data-slot='carousel-thumbnail'
      onPress={() => scrollTo(index)}
      {...props}
    >
      {children ?? (src ? <img alt={alt} draggable={false} src={src} /> : null)}
    </RacButton>
  );
}

type CarouselComponent = typeof CarouselRoot & {
  Content: typeof CarouselContent;
  Dots: typeof CarouselDots;
  Item: typeof CarouselItem;
  Next: typeof CarouselNext;
  Previous: typeof CarouselPrevious;
  Root: typeof CarouselRoot;
  Thumbnail: typeof CarouselThumbnail;
  Thumbnails: typeof CarouselThumbnails;
};
export const Carousel: CarouselComponent = Object.assign(CarouselRoot, {
  Content: CarouselContent,
  Dots: CarouselDots,
  Item: CarouselItem,
  Next: CarouselNext,
  Previous: CarouselPrevious,
  Root: CarouselRoot,
  Thumbnail: CarouselThumbnail,
  Thumbnails: CarouselThumbnails,
});
export {
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselRoot,
  CarouselThumbnail,
  CarouselThumbnails,
};
