import type { Meta, StoryObj } from '@storybook/react';
import type { EmblaCarouselType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useRef, useState } from 'react';

import { Card } from '@aero/ui/card';

import { Carousel } from './index';

const images = [
  {
    alt: 'Sneakers front view',
    src: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/shoes/product-view/1.jpeg',
  },
  {
    alt: 'Sneakers side view',
    src: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/shoes/product-view/2.jpeg',
  },
  {
    alt: 'Sneakers back view',
    src: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/shoes/product-view/3.jpeg',
  },
  {
    alt: 'Sneakers top view',
    src: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/shoes/product-view/4.jpeg',
  },
  {
    alt: 'Sneakers detail view',
    src: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/shoes/product-view/5.jpeg',
  },
  {
    alt: 'Sneakers sole view',
    src: 'https://nextuipro.nyc3.cdn.digitaloceanspaces.com/components-images/shoes/product-view/6.jpeg',
  },
];
const meta = {
  component: Carousel,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/Carousel',
} satisfies Meta<typeof Carousel>;
export default meta;
type Story = StoryObj<typeof meta>;

const ImageSlides = ({ modal = false }: { modal?: boolean }) => (
  <>
    {images.map((image) => (
      <Carousel.Item key={image.src}>
        <div className='overflow-hidden rounded-3xl'>
          <img
            alt={image.alt}
            className={`${modal ? 'aspect-[4/3]' : 'aspect-[1/1]'} w-full object-cover select-none`}
            draggable={false}
            src={image.src}
          />
        </div>
      </Carousel.Item>
    ))}
  </>
);
const NumberSlides = ({ count = 5 }: { count?: number }) => (
  <>
    {Array.from({ length: count }, (_, index) => index + 1).map((number) => (
      <Carousel.Item key={number}>
        <div className='p-1'>
          <Card className='select-none'>
            <Card.Content className='flex aspect-square items-center justify-center'>
              <span className='text-4xl font-semibold tabular-nums'>
                {number}
              </span>
            </Card.Content>
          </Card>
        </div>
      </Carousel.Item>
    ))}
  </>
);

export const Default: Story = {
  render: () => (
    <div className='w-full max-w-sm'>
      <Carousel opts={{ loop: true }}>
        <Carousel.Content>
          <ImageSlides />
        </Carousel.Content>
        <Carousel.Previous />
        <Carousel.Next />
        <Carousel.Dots />
        <Carousel.Thumbnails>
          {images.map((image, index) => (
            <Carousel.Thumbnail
              alt={image.alt}
              index={index}
              key={image.src}
              src={image.src}
            />
          ))}
        </Carousel.Thumbnails>
      </Carousel>
    </div>
  ),
};
export const ModalType: Story = {
  name: 'Type: Modal',
  render: () => (
    <div className='w-full max-w-sm px-16'>
      <Carousel opts={{ loop: true }} type='modal'>
        <Carousel.Content>
          <ImageSlides modal />
        </Carousel.Content>
        <Carousel.Previous />
        <Carousel.Next />
        <Carousel.Thumbnails>
          {images.map((image, index) => (
            <Carousel.Thumbnail
              alt={image.alt}
              index={index}
              key={image.src}
              src={image.src}
            />
          ))}
        </Carousel.Thumbnails>
      </Carousel>
    </div>
  ),
};
export const MultipleSlides: Story = {
  render: () => (
    <div className='w-full max-w-sm'>
      <Carousel opts={{ align: 'start' }}>
        <Carousel.Content>
          {Array.from({ length: 8 }, (_, index) => index + 1).map((number) => (
            <Carousel.Item className='basis-1/3' key={number}>
              <div className='p-1'>
                <Card className='select-none'>
                  <Card.Content className='flex aspect-square items-center justify-center'>
                    <span className='text-2xl font-semibold tabular-nums'>
                      {number}
                    </span>
                  </Card.Content>
                </Card>
              </div>
            </Carousel.Item>
          ))}
        </Carousel.Content>
        <Carousel.Previous />
        <Carousel.Next />
      </Carousel>
    </div>
  ),
};
export const InfiniteLoop: Story = {
  render: () => (
    <div className='w-full max-w-xs'>
      <Carousel opts={{ loop: true }}>
        <Carousel.Content>
          <NumberSlides />
        </Carousel.Content>
        <Carousel.Previous />
        <Carousel.Next />
      </Carousel>
    </div>
  ),
};
function AutoplayDemo() {
  const plugin = useRef(Autoplay({ delay: 2000, stopOnInteraction: true }));
  return (
    <div className='w-full max-w-xs'>
      <Carousel opts={{ loop: true }} plugins={[plugin.current]}>
        <Carousel.Content>
          <NumberSlides />
        </Carousel.Content>
        <Carousel.Dots />
      </Carousel>
    </div>
  );
}
export const AutoplayStory: Story = {
  name: 'Autoplay',
  render: () => <AutoplayDemo />,
};
function ApiExample() {
  const [api, setApi] = useState<EmblaCarouselType>(),
    [current, setCurrent] = useState(1),
    [count, setCount] = useState(0);
  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCurrent(api.selectedScrollSnap() + 1);
      setCount(api.scrollSnapList().length);
    };
    update();
    api.on('select', update).on('reInit', update);
    return () => {
      api.off('select', update).off('reInit', update);
    };
  }, [api]);
  return (
    <div className='flex w-full max-w-xs flex-col gap-2'>
      <Carousel setApi={setApi}>
        <Carousel.Content>
          <NumberSlides />
        </Carousel.Content>
        <Carousel.Previous />
        <Carousel.Next />
      </Carousel>
      <p className='text-muted text-center text-sm tabular-nums'>
        Slide {current} of {count}
      </p>
    </div>
  );
}
export const ApiAccessStory: Story = {
  name: 'API Access',
  render: () => <ApiExample />,
};
