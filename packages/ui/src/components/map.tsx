'use client';

import { Button, ButtonGroup, CloseButton, cn, Spinner } from '@heroui/react';
import maplibregl, {
  type CircleLayerSpecification,
  type GeoJSONSource,
  type GeoJSONSourceSpecification,
  type LineLayerSpecification,
  type Map as MapRef,
  type MapOptions,
  type MarkerOptions,
  type PopupOptions,
  type ProjectionSpecification,
  type StyleSpecification,
} from 'maplibre-gl';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type MapTheme = 'dark' | 'light';
export interface MapViewport {
  bearing: number;
  center: [number, number];
  pitch: number;
  zoom: number;
}
export interface MapStyles {
  dark?: StyleSpecification | string;
  light?: StyleSpecification | string;
}
interface MapContextValue {
  isLoaded: boolean;
  map: MapRef | null;
}
const Context = createContext<MapContextValue | null>(null);
const useMapContext = (): MapContextValue => {
  const context = useContext(Context);
  if (!context) throw new Error('Map components must be used within <Map>.');
  return context;
};
export const useMap = (): MapContextValue => useMapContext();

const emptyStyle: StyleSpecification = { layers: [], sources: {}, version: 8 };
const getViewport = (map: MapRef): MapViewport => {
  const center = map.getCenter();
  return {
    bearing: map.getBearing(),
    center: [center.lng, center.lat],
    pitch: map.getPitch(),
    zoom: map.getZoom(),
  };
};
const getDocumentTheme = (): MapTheme =>
  typeof document !== 'undefined' &&
  (document.documentElement.classList.contains('dark') ||
    (!document.documentElement.classList.contains('light') &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches))
    ? 'dark'
    : 'light';
const readCssValue = (element: HTMLElement, property: string): string =>
  window.getComputedStyle(element).getPropertyValue(property).trim();
const resolveCssColor = (
  element: HTMLElement,
  property: string,
  fallback: string,
): string => {
  const value = readCssValue(element, property);
  if (!value) return fallback;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return value;
  context.fillStyle = fallback;
  const fallbackColor = context.fillStyle;
  context.fillStyle = value;
  return context.fillStyle === fallbackColor && value !== fallbackColor
    ? fallback
    : context.fillStyle;
};
const resolveCssNumber = (
  element: HTMLElement,
  property: string,
  fallback: number,
): number => {
  const value = Number.parseFloat(readCssValue(element, property));
  return Number.isFinite(value) ? value : fallback;
};

const centerTuple = (
  value: NonNullable<MapOptions['center']>,
): [number, number] => {
  if (Array.isArray(value)) return [value[0], value[1]];
  return ['lng' in value ? value.lng : value.lon, value.lat];
};
const centersEqual = (
  left: MapOptions['center'] | undefined,
  right: MapOptions['center'] | undefined,
): boolean => {
  if (left === right) return true;
  if (!left || !right) return false;
  const leftCenter = centerTuple(left);
  const rightCenter = centerTuple(right);
  return leftCenter[0] === rightCenter[0] && leftCenter[1] === rightCenter[1];
};

export interface MapRootProps extends Omit<MapOptions, 'container' | 'style'> {
  'aria-describedby'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children?: ReactNode;
  className?: string;
  id?: string;
  isLoading?: boolean;
  mapStyle?: StyleSpecification | string;
  onViewportChange?: (viewport: MapViewport) => void;
  projection?: ProjectionSpecification;
  ref?: Ref<MapRef | null>;
  role?: string;
  style?: CSSProperties;
  styles?: MapStyles;
  theme?: MapTheme;
  tabIndex?: number;
  viewport?: Partial<MapViewport>;
}
export function MapRoot({
  'aria-describedby': ariaDescribedBy,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
  className,
  isLoading = false,
  id,
  mapStyle,
  onViewportChange,
  projection,
  ref,
  role,
  style,
  styles,
  theme,
  tabIndex,
  viewport,
  ...props
}: MapRootProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapRef | null>(null);
  const [isMapLoaded, setMapLoaded] = useState(false);
  const [isStyleLoaded, setStyleLoaded] = useState(false);
  const [documentTheme, setDocumentTheme] =
    useState<MapTheme>(getDocumentTheme);
  const optionsRef = useRef(props);
  const initialViewportRef = useRef(viewport);
  const projectionRef = useRef(projection);
  const viewportCallback = useRef(onViewportChange);
  const isApplyingViewport = useRef(false);
  const styleReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  viewportCallback.current = onViewportChange;
  const resolvedTheme = theme ?? documentTheme;
  const resolvedStyle =
    mapStyle ??
    (resolvedTheme === 'dark'
      ? (styles?.dark ?? styles?.light ?? emptyStyle)
      : (styles?.light ?? styles?.dark ?? emptyStyle));
  const styleRef = useRef(resolvedStyle);
  const appliedStyleRef = useRef(resolvedStyle);
  const bearing = viewport?.bearing ?? props.bearing;
  const center = viewport?.center ?? props.center;
  const pitch = viewport?.pitch ?? props.pitch;
  const zoom = viewport?.zoom ?? props.zoom;
  const previousViewport = useRef({ bearing, center, pitch, zoom });

  useImperativeHandle(ref, () => map as MapRef, [map]);
  useEffect(() => {
    if (theme || typeof document === 'undefined') return;
    const updateTheme = () => setDocumentTheme(getDocumentTheme());
    const observer = new MutationObserver(updateTheme);
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    observer.observe(document.documentElement, {
      attributeFilter: ['class'],
      attributes: true,
    });
    media?.addEventListener('change', updateTheme);
    return () => {
      observer.disconnect();
      media?.removeEventListener('change', updateTheme);
    };
  }, [theme]);
  useEffect(() => {
    if (!containerRef.current) return;
    const instance = new maplibregl.Map({
      attributionControl: { compact: true },
      container: containerRef.current,
      renderWorldCopies: false,
      style: styleRef.current as StyleSpecification | string,
      ...optionsRef.current,
      ...initialViewportRef.current,
    });
    const clearStyleReadyTimer = () => {
      if (styleReadyTimer.current) clearTimeout(styleReadyTimer.current);
      styleReadyTimer.current = null;
    };
    const markStyleReady = () => {
      clearStyleReadyTimer();
      styleReadyTimer.current = setTimeout(() => {
        if (instance.isStyleLoaded()) {
          setStyleLoaded(true);
          if (projectionRef.current)
            instance.setProjection(projectionRef.current);
        }
      }, 0);
    };
    const onLoad = () => {
      setMapLoaded(true);
      markStyleReady();
    };
    const onMove = () => {
      if (!isApplyingViewport.current)
        viewportCallback.current?.(getViewport(instance));
    };
    instance.on('load', onLoad);
    instance.on('style.load', markStyleReady);
    instance.on('styledata', markStyleReady);
    instance.on('idle', markStyleReady);
    instance.on('move', onMove);
    setMap(instance);
    return () => {
      clearStyleReadyTimer();
      instance.off('load', onLoad);
      instance.off('style.load', markStyleReady);
      instance.off('styledata', markStyleReady);
      instance.off('idle', markStyleReady);
      instance.off('move', onMove);
      instance.remove();
      setMap(null);
      setMapLoaded(false);
      setStyleLoaded(false);
    };
  }, []);
  useEffect(() => {
    if (!map || appliedStyleRef.current === resolvedStyle) return;
    appliedStyleRef.current = resolvedStyle;
    setStyleLoaded(false);
    map.setStyle(resolvedStyle, { diff: false });
  }, [map, resolvedStyle]);
  useEffect(() => {
    if (map && isStyleLoaded && projection) map.setProjection(projection);
  }, [isStyleLoaded, map, projection]);
  useEffect(() => {
    const next = { bearing, center, pitch, zoom };
    const previous = previousViewport.current;
    previousViewport.current = next;
    if (!map) return;
    const changes: Partial<MapViewport> = {};
    if (bearing !== undefined && !Object.is(bearing, previous.bearing))
      changes.bearing = bearing;
    if (center !== undefined && !centersEqual(center, previous.center))
      changes.center = centerTuple(center);
    if (pitch !== undefined && !Object.is(pitch, previous.pitch))
      changes.pitch = pitch;
    if (zoom !== undefined && !Object.is(zoom, previous.zoom))
      changes.zoom = zoom;
    if (!Object.keys(changes).length) return;
    isApplyingViewport.current = true;
    try {
      map.jumpTo(changes);
    } finally {
      isApplyingViewport.current = false;
    }
  }, [bearing, center, map, pitch, zoom]);

  const isLoaded = isMapLoaded && isStyleLoaded;
  const showLoader = !isMapLoaded || isLoading;
  const contextValue = useMemo(() => ({ isLoaded, map }), [isLoaded, map]);

  return (
    <Context value={contextValue}>
      <div
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn('map', className)}
        data-loaded={isLoaded ? 'true' : undefined}
        data-loading={showLoader ? 'true' : undefined}
        data-slot='map'
        id={id}
        ref={containerRef}
        role={role}
        style={style}
        tabIndex={tabIndex}
      >
        {showLoader ? (
          <div className='map__loader' data-slot='map-loader'>
            <Spinner
              className='map__loader-spinner'
              color='current'
              data-slot='map-loader-spinner'
              size='sm'
            />
          </div>
        ) : null}
        {map ? children : null}
      </div>
    </Context>
  );
}

interface MarkerContextValue {
  map: MapRef | null;
  marker: maplibregl.Marker;
}
const MarkerContext = createContext<MarkerContextValue | null>(null);
const useMarker = () => {
  const context = useContext(MarkerContext);
  if (!context)
    throw new Error('Marker components must be used within <Map.Marker>.');
  return context;
};
export interface MapMarkerProps extends MarkerOptions {
  children?: ReactNode;
  latitude: number;
  longitude: number;
  onClick?: (event: MouseEvent) => void;
  onDrag?: (position: { lat: number; lng: number }) => void;
  onDragEnd?: (position: { lat: number; lng: number }) => void;
  onDragStart?: (position: { lat: number; lng: number }) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
}
export function MapMarker({
  children,
  draggable = false,
  latitude,
  longitude,
  onClick,
  onDrag,
  onDragEnd,
  onDragStart,
  onMouseEnter,
  onMouseLeave,
  ...options
}: MapMarkerProps): ReactElement | null {
  const { map } = useMapContext();
  const [marker, setMarker] = useState<maplibregl.Marker | null>(null);
  const optionsRef = useRef(options);
  const initialDraggableRef = useRef(draggable);
  const initialPositionRef = useRef<[number, number]>([longitude, latitude]);
  const callbacks = useRef({
    onClick,
    onDrag,
    onDragEnd,
    onDragStart,
    onMouseEnter,
    onMouseLeave,
  });
  callbacks.current = {
    onClick,
    onDrag,
    onDragEnd,
    onDragStart,
    onMouseEnter,
    onMouseLeave,
  };
  useEffect(() => {
    const element = document.createElement('div');
    element.className = 'map__marker';
    element.dataset['slot'] = 'map-marker';
    const instance = new maplibregl.Marker({
      ...optionsRef.current,
      draggable: initialDraggableRef.current,
      element,
    }).setLngLat(initialPositionRef.current);
    setMarker(instance);
    return () => {
      instance.remove();
    };
  }, []);
  useEffect(() => {
    if (!map || !marker) return;
    marker.addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, marker]);
  useEffect(() => {
    marker?.setLngLat([longitude, latitude]);
  }, [latitude, longitude, marker]);
  useEffect(() => {
    marker?.setDraggable(draggable);
  }, [draggable, marker]);
  useEffect(() => {
    marker?.setOffset(options.offset ?? [0, 0]);
  }, [marker, options.offset]);
  useEffect(() => {
    marker?.setRotation(options.rotation ?? 0);
  }, [marker, options.rotation]);
  useEffect(() => {
    marker?.setRotationAlignment(options.rotationAlignment ?? 'auto');
  }, [marker, options.rotationAlignment]);
  useEffect(() => {
    marker?.setPitchAlignment(options.pitchAlignment ?? 'auto');
  }, [marker, options.pitchAlignment]);
  useEffect(() => {
    if (!marker) return;
    const element = marker.getElement();
    const position = () => {
      const value = marker.getLngLat();
      return { lat: value.lat, lng: value.lng };
    };
    const click = (event: MouseEvent) => callbacks.current.onClick?.(event);
    const enter = (event: MouseEvent) =>
      callbacks.current.onMouseEnter?.(event);
    const leave = (event: MouseEvent) =>
      callbacks.current.onMouseLeave?.(event);
    const start = () => callbacks.current.onDragStart?.(position());
    const drag = () => callbacks.current.onDrag?.(position());
    const end = () => callbacks.current.onDragEnd?.(position());
    element.addEventListener('click', click);
    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    marker.on('dragstart', start);
    marker.on('drag', drag);
    marker.on('dragend', end);
    return () => {
      element.removeEventListener('click', click);
      element.removeEventListener('mouseenter', enter);
      element.removeEventListener('mouseleave', leave);
      marker.off('dragstart', start);
      marker.off('drag', drag);
      marker.off('dragend', end);
    };
  }, [marker]);
  const contextValue = useMemo(
    () => (marker ? { map, marker } : null),
    [map, marker],
  );
  return contextValue ? (
    <MarkerContext value={contextValue}>{children}</MarkerContext>
  ) : null;
}
export interface MapMarkerContentProps extends ComponentPropsWithRef<'div'> {}
export function MapMarkerContent({
  children,
  className,
  ...props
}: MapMarkerContentProps): ReactElement {
  const { marker } = useMarker();
  return createPortal(
    <div
      {...props}
      className={cn('map__marker-content', className)}
      data-slot='map-marker-content'
    >
      {children ?? <MapMarkerDot />}
    </div>,
    marker.getElement(),
  );
}
export interface MapMarkerDotProps extends ComponentPropsWithRef<'span'> {
  color?: string;
  ringColor?: string;
}
export function MapMarkerDot({
  className,
  color,
  ringColor,
  style,
  ...props
}: MapMarkerDotProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('map__default-marker', className)}
      data-slot='map-default-marker'
      style={
        {
          ...style,
          '--map-marker-color': color,
          '--map-marker-ring-color': ringColor,
        } as CSSProperties
      }
    />
  );
}
export interface MapMarkerLabelProps extends ComponentPropsWithRef<'div'> {
  position?: 'bottom' | 'top';
}
export function MapMarkerLabel({
  children,
  className,
  position = 'top',
  ...props
}: MapMarkerLabelProps): ReactElement {
  return (
    <div
      {...props}
      className={cn(
        'map__marker-label',
        `map__marker-label--${position}`,
        className,
      )}
      data-position={position}
      data-slot='map-marker-label'
    >
      {children}
    </div>
  );
}

const PopupContent = ({
  children,
  className,
  closeButton,
  onClose,
  slot,
}: {
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
  onClose: () => void;
  slot: 'map-marker-popup' | 'map-popup';
}) => (
  <div
    className={cn('map__popup-content', className)}
    data-close-button={closeButton || undefined}
    data-slot={slot}
  >
    {closeButton ? (
      <CloseButton
        aria-label='Close popup'
        className='map__popup-close-button'
        data-slot='map-popup-close-button'
        onPress={onClose}
      />
    ) : null}
    {children}
  </div>
);
export interface MapMarkerPopupProps extends Omit<PopupOptions, 'closeButton'> {
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
}
export function MapMarkerPopup({
  children,
  className,
  closeButton = false,
  ...options
}: MapMarkerPopupProps): ReactElement | null {
  const { map, marker } = useMarker();
  const [state, setState] = useState<{
    container: HTMLDivElement;
    popup: maplibregl.Popup;
  } | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    const container = document.createElement('div');
    const popup = new maplibregl.Popup({
      offset: 16,
      ...optionsRef.current,
      closeButton: false,
    })
      .setMaxWidth('none')
      .setDOMContent(container);
    setState({ container, popup });
    return () => {
      popup.remove();
    };
  }, []);
  useEffect(() => {
    if (!map || !state) return;
    marker.setPopup(state.popup);
    return () => {
      marker.setPopup(null);
    };
  }, [map, marker, state]);
  useEffect(() => {
    if (!state) return;
    state.popup.setOffset(options.offset ?? 16);
    state.popup.setMaxWidth(options.maxWidth ?? 'none');
  }, [options.maxWidth, options.offset, state]);
  return state
    ? createPortal(
        <PopupContent
          className={className ?? ''}
          closeButton={closeButton}
          onClose={() => {
            state.popup.remove();
          }}
          slot='map-marker-popup'
        >
          {children}
        </PopupContent>,
        state.container,
      )
    : null;
}
export interface MapMarkerTooltipProps extends Omit<
  PopupOptions,
  'closeButton'
> {
  children: ReactNode;
  className?: string;
}
export function MapMarkerTooltip({
  children,
  className,
  ...options
}: MapMarkerTooltipProps): ReactElement | null {
  const { map, marker } = useMarker();
  const [state, setState] = useState<{
    container: HTMLDivElement;
    popup: maplibregl.Popup;
  } | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    const container = document.createElement('div');
    const popup = new maplibregl.Popup({
      offset: 16,
      ...optionsRef.current,
      closeButton: false,
      closeOnClick: true,
    })
      .setMaxWidth('none')
      .setDOMContent(container);
    setState({ container, popup });
    return () => {
      popup.remove();
    };
  }, []);
  useEffect(() => {
    if (!map || !state) return;
    const element = marker.getElement();
    const enter = () => state.popup.setLngLat(marker.getLngLat()).addTo(map);
    const leave = () => state.popup.remove();
    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    return () => {
      element.removeEventListener('mouseenter', enter);
      element.removeEventListener('mouseleave', leave);
    };
  }, [map, marker, state]);
  useEffect(() => {
    if (!state) return;
    state.popup.setOffset(options.offset ?? 16);
    state.popup.setMaxWidth(options.maxWidth ?? 'none');
  }, [options.maxWidth, options.offset, state]);
  return state
    ? createPortal(
        <div
          className={cn('map__tooltip', className)}
          data-slot='map-marker-tooltip'
        >
          {children}
        </div>,
        state.container,
      )
    : null;
}
export interface MapPopupProps extends Omit<PopupOptions, 'closeButton'> {
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
  latitude: number;
  longitude: number;
  onClose?: () => void;
}
export function MapPopup({
  children,
  className,
  closeButton = false,
  latitude,
  longitude,
  onClose,
  ...options
}: MapPopupProps): ReactElement | null {
  const { map } = useMapContext();
  const [state, setState] = useState<{
    container: HTMLDivElement;
    popup: maplibregl.Popup;
  } | null>(null);
  const optionsRef = useRef(options);
  const initialPositionRef = useRef<[number, number]>([longitude, latitude]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const container = document.createElement('div');
    const popup = new maplibregl.Popup({
      offset: 16,
      ...optionsRef.current,
      closeButton: false,
    })
      .setMaxWidth('none')
      .setLngLat(initialPositionRef.current)
      .setDOMContent(container);
    setState({ container, popup });
    return () => {
      popup.remove();
    };
  }, []);
  useEffect(() => {
    if (!map || !state) return;
    const close = () => closeRef.current?.();
    state.popup.on('close', close);
    state.popup.addTo(map);
    return () => {
      state.popup.off('close', close);
      state.popup.remove();
    };
  }, [map, state]);
  useEffect(() => {
    if (!state) return;
    state.popup.setLngLat([longitude, latitude]);
    if (map && !state.popup.isOpen()) state.popup.addTo(map);
  }, [latitude, longitude, map, state]);
  useEffect(() => {
    if (!state) return;
    state.popup.setOffset(options.offset ?? 16);
    state.popup.setMaxWidth(options.maxWidth ?? 'none');
  }, [options.maxWidth, options.offset, state]);
  return state
    ? createPortal(
        <PopupContent
          className={className ?? ''}
          closeButton={closeButton}
          onClose={() => {
            state.popup.remove();
          }}
          slot='map-popup'
        >
          {children}
        </PopupContent>,
        state.container,
      )
    : null;
}

export type MapControlsPosition =
  'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
export interface MapControlsProps extends ComponentPropsWithRef<'div'> {
  position?: MapControlsPosition;
}
export function MapControls({
  children,
  className,
  position = 'bottom-right',
  ...props
}: MapControlsProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('map__controls', `map__controls--${position}`, className)}
      data-position={position}
      data-slot='map-controls'
    >
      {children ?? <MapZoomControl />}
    </div>
  );
}
export type MapControlGroupProps = ComponentPropsWithRef<typeof ButtonGroup>;
export function MapControlGroup({
  children,
  className,
  orientation = 'vertical',
  size = 'sm',
  variant = 'tertiary',
  ...props
}: MapControlGroupProps): ReactElement {
  return (
    <ButtonGroup
      {...props}
      className={cn('map__control-group', className) ?? ''}
      data-slot='map-control-group'
      orientation={orientation}
      size={size}
      variant={variant}
    >
      {children}
    </ButtonGroup>
  );
}
export type MapControlButtonProps = Omit<
  ComponentPropsWithRef<typeof Button>,
  'aria-label'
> & {
  label: string;
};
export function MapControlButton({
  children,
  className,
  label,
  type = 'button',
  ...props
}: MapControlButtonProps): ReactElement {
  return (
    <Button
      {...props}
      isIconOnly
      aria-label={label}
      className={cn('map__control-button', className) ?? ''}
      data-slot='map-control-button'
      type={type}
    >
      {children}
    </Button>
  );
}
export type MapControlSeparatorProps = ComponentPropsWithRef<
  typeof ButtonGroup.Separator
>;
export function MapControlSeparator({
  className,
  ...props
}: MapControlSeparatorProps): ReactElement {
  return (
    <ButtonGroup.Separator
      {...props}
      className={cn('map__control-separator', className) ?? ''}
      data-slot='map-control-separator'
    />
  );
}
const ControlIcon = ({
  ref,
  type,
}: {
  ref?: Ref<SVGSVGElement>;
  type: 'compass' | 'fullscreen' | 'locate' | 'minus' | 'plus';
}): ReactElement => {
  if (type === 'plus' || type === 'minus')
    return (
      <svg
        aria-hidden='true'
        className='map__control-icon'
        data-slot='map-control-icon'
        fill='none'
        ref={ref}
        viewBox='0 0 16 16'
      >
        <path
          d='M3 8h10M8 3v10'
          stroke='currentColor'
          strokeLinecap='round'
          strokeWidth='1.5'
        />
        {type === 'minus' ? (
          <path d='M8 2v12' stroke='var(--overlay)' strokeWidth='3' />
        ) : null}
      </svg>
    );
  if (type === 'locate')
    return (
      <svg
        aria-hidden='true'
        className='map__control-icon'
        data-slot='map-control-icon'
        fill='none'
        ref={ref}
        viewBox='0 0 16 16'
      >
        <path
          clipRule='evenodd'
          d='M8.75 1.75a.75.75 0 0 0-1.5 0v.79A5.51 5.51 0 0 0 2.54 7.25h-.79a.75.75 0 0 0 0 1.5h.79a5.51 5.51 0 0 0 4.71 4.71v.79a.75.75 0 0 0 1.5 0v-.79a5.51 5.51 0 0 0 4.71-4.71h.79a.75.75 0 0 0 0-1.5h-.79a5.51 5.51 0 0 0-4.71-4.71zM8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0 2.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5'
          fill='currentColor'
          fillRule='evenodd'
        />
      </svg>
    );
  if (type === 'fullscreen')
    return (
      <svg
        aria-hidden='true'
        className='map__control-icon'
        data-slot='map-control-icon'
        fill='none'
        ref={ref}
        viewBox='0 0 16 16'
      >
        <path
          d='M2.5 5.5v-3h3m5 0h3v3m0 5v3h-3m-5 0h-3v-3'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='1.5'
        />
      </svg>
    );
  return (
    <svg
      aria-hidden='true'
      className='map__compass-icon'
      data-slot='map-compass-icon'
      fill='none'
      ref={ref}
      viewBox='0 0 24 24'
    >
      <path d='M12 2 16 12h-4V2Z' data-needle='north-right' />
      <path d='m12 2-4 10h4V2Z' data-needle='north-left' />
      <path d='m12 22 4-10h-4v10Z' data-needle='south-right' />
      <path d='M12 22 8 12h4v10Z' data-needle='south-left' />
    </svg>
  );
};
export interface MapZoomControlProps extends Omit<
  MapControlGroupProps,
  'children'
> {
  duration?: number;
  step?: number;
}
export function MapZoomControl({
  duration = 300,
  step = 1,
  ...props
}: MapZoomControlProps): ReactElement {
  const { map } = useMapContext();
  return (
    <MapControlGroup {...props}>
      <MapControlButton
        isDisabled={!map}
        label='Zoom in'
        onPress={() => map?.zoomTo(map.getZoom() + step, { duration })}
      >
        <ControlIcon type='plus' />
      </MapControlButton>
      <MapControlButton
        isDisabled={!map}
        label='Zoom out'
        onPress={() => map?.zoomTo(map.getZoom() - step, { duration })}
      >
        <MapControlSeparator />
        <ControlIcon type='minus' />
      </MapControlButton>
    </MapControlGroup>
  );
}
export interface MapCompassControlProps extends Omit<
  MapControlGroupProps,
  'children'
> {
  duration?: number;
}
export function MapCompassControl({
  duration = 300,
  ...props
}: MapCompassControlProps): ReactElement {
  const { map } = useMapContext();
  const iconRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!map || !iconRef.current) return;
    const update = () => {
      if (iconRef.current)
        iconRef.current.style.transform = `rotateX(${map.getPitch()}deg) rotateZ(${-map.getBearing()}deg)`;
    };
    map.on('rotate', update);
    map.on('pitch', update);
    update();
    return () => {
      map.off('rotate', update);
      map.off('pitch', update);
    };
  }, [map]);
  return (
    <MapControlGroup {...props}>
      <MapControlButton
        isDisabled={!map}
        label='Reset bearing to north'
        onPress={() => map?.resetNorthPitch({ duration })}
      >
        <ControlIcon ref={iconRef} type='compass' />
      </MapControlButton>
    </MapControlGroup>
  );
}
export interface MapLocateControlProps extends Omit<
  MapControlGroupProps,
  'children'
> {
  duration?: number;
  onLocate?: (coords: { latitude: number; longitude: number }) => void;
  onLocateError?: (error: GeolocationPositionError) => void;
  zoom?: number;
}
export function MapLocateControl({
  duration = 1500,
  onLocate,
  onLocateError,
  zoom = 14,
  ...props
}: MapLocateControlProps): ReactElement {
  const { map } = useMapContext();
  const [loading, setLoading] = useState(false);
  const available =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const locate = () => {
    if (!map || !available) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const coords = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        };
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          duration,
          zoom,
        });
        onLocate?.(coords);
        setLoading(false);
      },
      (error) => {
        onLocateError?.(error);
        setLoading(false);
      },
    );
  };
  return (
    <MapControlGroup {...props}>
      <MapControlButton
        isDisabled={!map || !available || loading}
        label='Find my location'
        onPress={locate}
      >
        {loading ? (
          <Spinner color='current' data-slot='map-control-spinner' size='sm' />
        ) : (
          <ControlIcon type='locate' />
        )}
      </MapControlButton>
    </MapControlGroup>
  );
}
export interface MapFullscreenControlProps extends Omit<
  MapControlGroupProps,
  'children'
> {
  onFullscreenError?: (error: unknown) => void;
}
export function MapFullscreenControl({
  onFullscreenError,
  ...props
}: MapFullscreenControlProps): ReactElement {
  const { map } = useMapContext();
  const toggle = () => {
    const element = map?.getContainer();
    if (!element) return;
    (document.fullscreenElement
      ? document.exitFullscreen()
      : element.requestFullscreen()
    ).catch(onFullscreenError);
  };
  return (
    <MapControlGroup {...props}>
      <MapControlButton
        isDisabled={!map || !document.fullscreenEnabled}
        label='Toggle fullscreen'
        onPress={toggle}
      >
        <ControlIcon type='fullscreen' />
      </MapControlButton>
    </MapControlGroup>
  );
}

export interface MapRouteProps {
  color?: string;
  coordinates: [number, number][];
  dashArray?: number[];
  id?: string;
  interactive?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  opacity?: number;
  width?: number;
}
export function MapRoute({
  color,
  coordinates,
  dashArray,
  id,
  interactive = true,
  onClick,
  onMouseEnter,
  onMouseLeave,
  opacity,
  width,
}: MapRouteProps): null {
  const { isLoaded, map } = useMapContext();
  const baseId = useLayerId('route', id);
  const sourceId = `${baseId}-source`;
  const layerId = `${baseId}-layer`;
  const callbacks = useRef({ onClick, onMouseEnter, onMouseLeave });
  callbacks.current = { onClick, onMouseEnter, onMouseLeave };
  const resolvePaint = useCallback(() => {
    const container = map?.getContainer();
    return {
      color:
        color ??
        (container
          ? resolveCssColor(container, '--map-route-color', '#4285F4')
          : '#4285F4'),
      opacity:
        opacity ??
        (container
          ? resolveCssNumber(container, '--map-route-opacity', 0.8)
          : 0.8),
      width:
        width ??
        (container ? resolveCssNumber(container, '--map-route-width', 3) : 3),
    };
  }, [color, map, opacity, width]);
  useEffect(() => {
    if (!isLoaded || !map) return;
    const paint = resolvePaint();
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        },
      });
    if (!map.getLayer(layerId))
      map.addLayer({
        id: layerId,
        source: sourceId,
        type: 'line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': paint.color,
          'line-opacity': paint.opacity,
          'line-width': paint.width,
          ...(dashArray ? { 'line-dasharray': dashArray } : {}),
        },
      });
    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [dashArray, isLoaded, layerId, map, resolvePaint, sourceId]);
  useEffect(() => {
    if (!isLoaded || !map) return;
    (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    });
  }, [coordinates, isLoaded, map, sourceId]);
  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    const paint = resolvePaint();
    map.setPaintProperty(layerId, 'line-color', paint.color);
    map.setPaintProperty(layerId, 'line-opacity', paint.opacity);
    map.setPaintProperty(layerId, 'line-width', paint.width);
    map.setPaintProperty(layerId, 'line-dasharray', dashArray ?? null);
  }, [dashArray, isLoaded, layerId, map, resolvePaint]);
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;
    const click = () => callbacks.current.onClick?.();
    const enter = () => {
      map.getCanvas().style.cursor = 'pointer';
      callbacks.current.onMouseEnter?.();
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
      callbacks.current.onMouseLeave?.();
    };
    map.on('click', layerId, click);
    map.on('mouseenter', layerId, enter);
    map.on('mouseleave', layerId, leave);
    return () => {
      map.off('click', layerId, click);
      map.off('mouseenter', layerId, enter);
      map.off('mouseleave', layerId, leave);
    };
  }, [interactive, isLoaded, layerId, map]);
  return null;
}

const useLayerId = (prefix: string, id?: string): string => {
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return id ?? `${prefix}-${reactId}`;
};
export interface MapArcDatum {
  from: [number, number];
  id: number | string;
  to: [number, number];
  [key: string]: unknown;
}
export interface MapArcEvent<T extends MapArcDatum = MapArcDatum> {
  arc: T;
  latitude: number;
  longitude: number;
  originalEvent: maplibregl.MapMouseEvent;
}
export interface MapArcProps<T extends MapArcDatum = MapArcDatum> {
  beforeId?: string;
  curvature?: number;
  data: T[];
  hoverPaint?: LineLayerSpecification['paint'];
  id?: string;
  interactive?: boolean;
  layout?: LineLayerSpecification['layout'];
  onClick?: (event: MapArcEvent<T>) => void;
  onHover?: (event: MapArcEvent<T> | null) => void;
  paint?: LineLayerSpecification['paint'];
  samples?: number;
}
const arcCoordinates = (
  from: [number, number],
  to: [number, number],
  curvature: number,
  samples: number,
): [number, number][] => {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  if (!distance || !curvature) return [from, to];
  const controlX = (x1 + x2) / 2 + (-dy / distance) * distance * curvature;
  const controlY = (y1 + y2) / 2 + (dx / distance) * distance * curvature;
  return Array.from(
    { length: Math.max(2, Math.floor(samples)) + 1 },
    (_, index) => {
      const t = index / Math.max(2, Math.floor(samples));
      const inverse = 1 - t;
      return [
        inverse * inverse * x1 + 2 * inverse * t * controlX + t * t * x2,
        inverse * inverse * y1 + 2 * inverse * t * controlY + t * t * y2,
      ];
    },
  );
};
export function MapArc<T extends MapArcDatum = MapArcDatum>({
  beforeId,
  curvature = 0.2,
  data,
  hoverPaint,
  id,
  interactive = true,
  layout,
  onClick,
  onHover,
  paint,
  samples = 64,
}: MapArcProps<T>): null {
  const { isLoaded, map } = useMapContext();
  const baseId = useLayerId('arc', id);
  const sourceId = `${baseId}-source`;
  const layerId = `${baseId}-layer`;
  const hitLayerId = `${baseId}-hit-layer`;
  const dataRef = useRef(data);
  dataRef.current = data;
  const callbacks = useRef({ onClick, onHover });
  callbacks.current = { onClick, onHover };
  const geojson = useMemo(
    () => ({
      features: data.map(({ from, id: arcId, to, ...properties }) => ({
        geometry: {
          coordinates: arcCoordinates(from, to, curvature, samples),
          type: 'LineString' as const,
        },
        properties: { id: arcId, ...properties },
        type: 'Feature' as const,
      })),
      type: 'FeatureCollection' as const,
    }),
    [curvature, data, samples],
  );
  const resolvedPaint = useMemo(() => {
    const base = {
      'line-color': '#4285F4',
      'line-opacity': 0.85,
      'line-width': 2,
      ...paint,
    } as NonNullable<LineLayerSpecification['paint']>;
    if (!hoverPaint) return base;
    const result = { ...base };
    for (const [key, value] of Object.entries(hoverPaint)) {
      if (value === undefined) continue;
      const normal = result[key as keyof typeof result];
      (result as Record<string, unknown>)[key] =
        normal === undefined
          ? value
          : [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              value,
              normal,
            ];
    }
    return result;
  }, [hoverPaint, paint]);
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        data: geojson,
        promoteId: 'id',
        type: 'geojson',
      });
    if (!map.getLayer(layerId))
      map.addLayer(
        {
          id: layerId,
          layout: { 'line-cap': 'round', 'line-join': 'round', ...layout },
          paint: resolvedPaint,
          source: sourceId,
          type: 'line',
        },
        beforeId,
      );
    if (!map.getLayer(hitLayerId))
      map.addLayer(
        {
          id: hitLayerId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': 'rgba(0,0,0,0)',
            'line-opacity': 1,
            'line-width': 12,
          },
          source: sourceId,
          type: 'line',
        },
        beforeId,
      );
    return () => {
      try {
        if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [
    beforeId,
    geojson,
    hitLayerId,
    isLoaded,
    layerId,
    layout,
    map,
    resolvedPaint,
    sourceId,
  ]);
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;
    let hoveredId: number | string | null = null;
    const findArc = (featureId: number | string | undefined) =>
      dataRef.current.find((arc) => String(arc.id) === String(featureId));
    const move = (event: maplibregl.MapLayerMouseEvent) => {
      const featureId = event.features?.[0]?.id;
      if (featureId === undefined) return;
      if (hoveredId !== null)
        map.setFeatureState(
          { id: hoveredId, source: sourceId },
          { hover: false },
        );
      hoveredId = featureId;
      map.setFeatureState({ id: featureId, source: sourceId }, { hover: true });
      map.getCanvas().style.cursor = 'pointer';
      const arc = findArc(featureId);
      if (arc)
        callbacks.current.onHover?.({
          arc,
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          originalEvent: event,
        });
    };
    const leave = () => {
      if (hoveredId !== null)
        map.setFeatureState(
          { id: hoveredId, source: sourceId },
          { hover: false },
        );
      hoveredId = null;
      map.getCanvas().style.cursor = '';
      callbacks.current.onHover?.(null);
    };
    const click = (event: maplibregl.MapLayerMouseEvent) => {
      const arc = findArc(event.features?.[0]?.id);
      if (arc)
        callbacks.current.onClick?.({
          arc,
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          originalEvent: event,
        });
    };
    map.on('mousemove', hitLayerId, move);
    map.on('mouseleave', hitLayerId, leave);
    map.on('click', hitLayerId, click);
    return () => {
      map.off('mousemove', hitLayerId, move);
      map.off('mouseleave', hitLayerId, leave);
      map.off('click', hitLayerId, click);
      leave();
    };
  }, [hitLayerId, interactive, isLoaded, map, sourceId]);
  return null;
}

export interface MapClusterLayerProps {
  clusterColors?: [string, string, string];
  clusterMaxZoom?: number;
  clusterRadius?: number;
  clusterThresholds?: [number, number];
  data: GeoJSONSourceSpecification['data'];
  id?: string;
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number,
  ) => void;
  onPointClick?: (
    feature: maplibregl.MapGeoJSONFeature,
    coordinates: [number, number],
  ) => void;
  pointColor?: string;
  pointPaint?: CircleLayerSpecification['paint'];
}
const defaultClusterColors: [string, string, string] = [
  '#22c55e',
  '#eab308',
  '#ef4444',
];
const defaultClusterThresholds: [number, number] = [100, 750];

export function MapClusterLayer({
  clusterColors = defaultClusterColors,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  clusterThresholds = defaultClusterThresholds,
  data,
  id,
  onClusterClick,
  onPointClick,
  pointColor = '#3b82f6',
  pointPaint,
}: MapClusterLayerProps): null {
  const { isLoaded, map } = useMapContext();
  const baseId = useLayerId('cluster', id);
  const sourceId = `${baseId}-source`;
  const clustersId = `${baseId}-clusters`;
  const countId = `${baseId}-cluster-count`;
  const pointsId = `${baseId}-unclustered-point`;
  const callbacks = useRef({ onClusterClick, onPointClick });
  callbacks.current = { onClusterClick, onPointClick };
  useEffect(() => {
    if (!isLoaded || !map) return;
    if (!map.getSource(sourceId))
      map.addSource(sourceId, {
        cluster: true,
        clusterMaxZoom,
        clusterRadius,
        data,
        type: 'geojson',
      });
    if (!map.getLayer(clustersId))
      map.addLayer({
        filter: ['has', 'point_count'],
        id: clustersId,
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            clusterColors[0],
            clusterThresholds[0],
            clusterColors[1],
            clusterThresholds[1],
            clusterColors[2],
          ],
          'circle-opacity': 0.85,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            clusterThresholds[0],
            30,
            clusterThresholds[1],
            40,
          ],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        },
        source: sourceId,
        type: 'circle',
      });
    if (!map.getLayer(countId))
      map.addLayer({
        filter: ['has', 'point_count'],
        id: countId,
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
        paint: { 'text-color': '#fff' },
        source: sourceId,
        type: 'symbol',
      });
    if (!map.getLayer(pointsId))
      map.addLayer({
        filter: ['!', ['has', 'point_count']],
        id: pointsId,
        paint: {
          'circle-color': pointColor,
          'circle-radius': 6,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          ...pointPaint,
        },
        source: sourceId,
        type: 'circle',
      });
    return () => {
      try {
        if (map.getLayer(countId)) map.removeLayer(countId);
        if (map.getLayer(pointsId)) map.removeLayer(pointsId);
        if (map.getLayer(clustersId)) map.removeLayer(clustersId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
  }, [
    clusterColors,
    clusterMaxZoom,
    clusterRadius,
    clusterThresholds,
    clustersId,
    countId,
    data,
    isLoaded,
    map,
    pointColor,
    pointPaint,
    pointsId,
    sourceId,
  ]);
  useEffect(() => {
    if (!isLoaded || !map) return;
    const clusterClick = async (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      const clusterId = Number(feature.properties?.['cluster_id']);
      const pointCount = Number(feature.properties?.['point_count']);
      const coordinates = feature.geometry.coordinates.slice(0, 2) as [
        number,
        number,
      ];
      if (callbacks.current.onClusterClick)
        callbacks.current.onClusterClick(clusterId, coordinates, pointCount);
      else {
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        const zoom = await source?.getClusterExpansionZoom(clusterId);
        if (zoom != null) map.easeTo({ center: coordinates, zoom });
      }
    };
    const pointClick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== 'Point') return;
      callbacks.current.onPointClick?.(
        feature,
        feature.geometry.coordinates.slice(0, 2) as [number, number],
      );
    };
    const enter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
    };
    map.on('click', clustersId, clusterClick);
    map.on('click', countId, clusterClick);
    map.on('click', pointsId, pointClick);
    map.on('mouseenter', clustersId, enter);
    map.on('mouseenter', countId, enter);
    map.on('mouseleave', clustersId, leave);
    map.on('mouseleave', countId, leave);
    return () => {
      map.off('click', clustersId, clusterClick);
      map.off('click', countId, clusterClick);
      map.off('click', pointsId, pointClick);
      map.off('mouseenter', clustersId, enter);
      map.off('mouseenter', countId, enter);
      map.off('mouseleave', clustersId, leave);
      map.off('mouseleave', countId, leave);
    };
  }, [clustersId, countId, isLoaded, map, pointsId, sourceId]);
  return null;
}

type MapComponent = typeof MapRoot & {
  Arc: typeof MapArc;
  ClusterLayer: typeof MapClusterLayer;
  CompassControl: typeof MapCompassControl;
  ControlButton: typeof MapControlButton;
  ControlGroup: typeof MapControlGroup;
  ControlSeparator: typeof MapControlSeparator;
  Controls: typeof MapControls;
  FullscreenControl: typeof MapFullscreenControl;
  LocateControl: typeof MapLocateControl;
  Marker: typeof MapMarker;
  MarkerContent: typeof MapMarkerContent;
  MarkerDot: typeof MapMarkerDot;
  MarkerLabel: typeof MapMarkerLabel;
  MarkerPopup: typeof MapMarkerPopup;
  MarkerTooltip: typeof MapMarkerTooltip;
  Popup: typeof MapPopup;
  Root: typeof MapRoot;
  Route: typeof MapRoute;
  ZoomControl: typeof MapZoomControl;
};
export const Map: MapComponent = Object.assign(MapRoot, {
  Arc: MapArc,
  ClusterLayer: MapClusterLayer,
  CompassControl: MapCompassControl,
  ControlButton: MapControlButton,
  ControlGroup: MapControlGroup,
  ControlSeparator: MapControlSeparator,
  Controls: MapControls,
  FullscreenControl: MapFullscreenControl,
  LocateControl: MapLocateControl,
  Marker: MapMarker,
  MarkerContent: MapMarkerContent,
  MarkerDot: MapMarkerDot,
  MarkerLabel: MapMarkerLabel,
  MarkerPopup: MapMarkerPopup,
  MarkerTooltip: MapMarkerTooltip,
  Popup: MapPopup,
  Root: MapRoot,
  Route: MapRoute,
  ZoomControl: MapZoomControl,
});
