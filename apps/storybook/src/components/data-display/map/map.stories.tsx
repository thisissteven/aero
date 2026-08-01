import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useMemo, useState } from 'react';

import { Avatar } from '@aero/ui/avatar';
import { Card } from '@aero/ui/card';
import {
  FirstAidKitIcon,
  GpsSignal01Icon,
  SecurityCheckIcon,
  StreetFoodIcon,
  TrafficLightIcon,
  UserGroupIcon,
} from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { Map, useMap } from './index';

const meta = {
  component: Map,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Data Display/Map',
} satisfies Meta<typeof Map>;
export default meta;
type Story = StoryObj<any>;

const styles = {
  dark: '/assets/maps/dark-matter.json',
  light: '/assets/maps/voyager.json',
};
const storeLocations = [
  {
    address: 'NW 13th Ave',
    color: '#4285f4',
    distance: '0.8 mi',
    latitude: 45.5265,
    longitude: -122.6842,
    name: 'Pearl pickup',
    orders: '31 ready',
    status: 'Open',
  },
  {
    address: 'SW 3rd Ave',
    color: '#22c55e',
    distance: '1.6 mi',
    latitude: 45.5181,
    longitude: -122.6765,
    name: 'Downtown desk',
    orders: '18 ready',
    status: 'Open',
  },
  {
    address: 'SE Hawthorne',
    color: '#f97316',
    distance: '2.4 mi',
    latitude: 45.5128,
    longitude: -122.6538,
    name: 'Hawthorne hub',
    orders: 'Queue full',
    status: 'Busy',
  },
  {
    address: 'NE Alberta',
    color: '#8b5cf6',
    distance: '3.1 mi',
    latitude: 45.5591,
    longitude: -122.6467,
    name: 'Alberta counter',
    orders: '9 ready',
    status: 'Open',
  },
];

const defaultRoute: [number, number][] = [
  [-122.39385, 37.79519],
  [-122.39412, 37.79548],
  [-122.39462, 37.79601],
  [-122.39475, 37.79603],
  [-122.39482, 37.79601],
  [-122.39483, 37.79588],
  [-122.39458, 37.79532],
  [-122.39435, 37.79502],
  [-122.39416, 37.79484],
  [-122.39367, 37.7945],
  [-122.3933, 37.79428],
  [-122.39325, 37.79425],
  [-122.39314, 37.79417],
  [-122.39271, 37.79382],
  [-122.39259, 37.7937],
  [-122.39225, 37.79339],
  [-122.39163, 37.79287],
  [-122.39134, 37.79255],
  [-122.39127, 37.79243],
  [-122.3911, 37.79204],
  [-122.39078, 37.79137],
  [-122.39051, 37.79105],
  [-122.39025, 37.79083],
  [-122.3899, 37.79056],
  [-122.38873, 37.78962],
  [-122.38853, 37.78939],
  [-122.38826, 37.78894],
  [-122.38803, 37.78805],
  [-122.38799, 37.78762],
  [-122.388, 37.78723],
  [-122.38802, 37.78699],
  [-122.38816, 37.78519],
  [-122.38819, 37.78489],
  [-122.38821, 37.78463],
  [-122.3884, 37.78232],
  [-122.38843, 37.78188],
  [-122.38846, 37.78135],
  [-122.38857, 37.78097],
  [-122.38886, 37.78059],
  [-122.38954, 37.78003],
  [-122.38978, 37.77985],
  [-122.39064, 37.77919],
  [-122.3908, 37.77907],
  [-122.39137, 37.77863],
  [-122.39186, 37.77823],
  [-122.39181, 37.77807],
  [-122.39161, 37.77791],
  [-122.39122, 37.7776],
  [-122.39107, 37.77749],
  [-122.39084, 37.77727],
  [-122.3907, 37.77716],
  [-122.39049, 37.77702],
  [-122.3901, 37.77652],
  [-122.39006, 37.77638],
  [-122.39003, 37.77614],
  [-122.38995, 37.77537],
  [-122.38995, 37.77468],
  [-122.38995, 37.77451],
  [-122.38995, 37.77443],
  [-122.38981, 37.77302],
  [-122.3898, 37.77286],
  [-122.38972, 37.77207],
  [-122.3897, 37.77181],
  [-122.38963, 37.77116],
  [-122.3896, 37.77076],
  [-122.38958, 37.77063],
  [-122.38945, 37.76919],
  [-122.38941, 37.76882],
  [-122.38919, 37.76884],
  [-122.38873, 37.76886],
  [-122.38779, 37.76892],
];
type DefaultStop = {
  kind: 'start' | 'stop' | 'finish';
  label: string;
  latitude: number;
  longitude: number;
  status: string;
  time: string;
};
const defaultStops: DefaultStop[] = [
  {
    kind: 'start',
    label: 'Ferry Building',
    latitude: 37.79519,
    longitude: -122.39385,
    status: 'Pickup ready',
    time: '9:12 AM',
  },
  {
    kind: 'stop',
    label: 'Market Street',
    latitude: 37.7896,
    longitude: -122.3887,
    status: 'Next stop',
    time: '9:19 AM',
  },
  {
    kind: 'finish',
    label: 'Chase Center',
    latitude: 37.76892,
    longitude: -122.38779,
    status: 'Dropoff',
    time: '9:27 AM',
  },
];

function DefaultMapDemo() {
  const [selected, setSelected] = useState<DefaultStop | null>(
    defaultStops[1]!,
  );
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map
        center={[-122.3927, 37.7816]}
        pitch={26}
        styles={styles}
        zoom={13.25}
      >
        <Map.Route coordinates={defaultRoute} />
        {defaultStops.map((stop) => (
          <Map.Marker
            key={stop.label}
            latitude={stop.latitude}
            longitude={stop.longitude}
            onClick={() => setSelected(stop)}
          >
            <Map.MarkerContent>
              <Map.MarkerDot
                color={stop.kind === 'start' ? '#22c55e' : undefined}
                ringColor={stop.kind === 'start' ? '#bbf7d0' : undefined}
              />
              <Map.MarkerLabel>
                {stop.kind === 'start' ? 'Start' : stop.label}
              </Map.MarkerLabel>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{stop.label}</span>
              <span className='text-background/70 ml-1'>{stop.time}</span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
        {selected ? (
          <Map.Popup
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            latitude={selected.latitude}
            longitude={selected.longitude}
            offset={18}
            onClose={() => setSelected(null)}
          >
            <div className='space-y-1 pr-4 text-xs'>
              <p className='font-medium'>{selected.label}</p>
              <p className='text-muted'>{selected.status}</p>
              <p className='text-muted'>Arrival {selected.time}</p>
            </div>
          </Map.Popup>
        ) : null}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.CompassControl />
          <Map.FullscreenControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[230px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Route planner</Card.Title>
          <Card.Description>Mission Bay dispatch</Card.Description>
        </Card.Header>
        <Card.Content className='grid grid-cols-3 gap-3 text-xs'>
          <span>
            <strong className='text-foreground block text-base'>7m</strong>ETA
          </span>
          <span>
            <strong className='text-foreground block text-base'>3</strong>Stops
          </span>
          <span>
            <strong className='text-foreground block text-base'>3.7</strong>Km
          </span>
        </Card.Content>
      </Card>
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultMapDemo />,
};

function StoreLocatorDemo() {
  const [selected, setSelected] = useState<
    (typeof storeLocations)[number] | null
  >(storeLocations[0]!);
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-122.678, 45.538]} pitch={18} styles={styles} zoom={12.25}>
        {storeLocations.map((location) => (
          <Map.Marker
            key={location.name}
            latitude={location.latitude}
            longitude={location.longitude}
            onClick={() => setSelected(location)}
          >
            <Map.MarkerContent>
              <Map.MarkerDot color={location.color} />
              <Map.MarkerLabel>{location.name}</Map.MarkerLabel>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{location.name}</span>
              <span className='text-background/70 ml-1'>{location.orders}</span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
        {selected ? (
          <Map.Popup
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            latitude={selected.latitude}
            longitude={selected.longitude}
            offset={18}
            onClose={() => setSelected(null)}
          >
            <div className='space-y-1 pr-4 text-xs'>
              <p className='font-medium'>{selected.name}</p>
              <p className='text-muted'>{selected.address}</p>
              <p className='text-muted'>
                {selected.status} · {selected.orders}
              </p>
            </div>
          </Map.Popup>
        ) : null}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.LocateControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[240px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Pickup network</Card.Title>
          <Card.Description>4 locations near Portland</Card.Description>
        </Card.Header>
        <Card.Content className='gap-2'>
          {storeLocations.slice(0, 3).map((location) => (
            <button
              className='hover:bg-surface-tertiary flex items-center justify-between rounded-md px-2 py-1 text-left transition'
              key={location.name}
              type='button'
              onClick={() => setSelected(location)}
            >
              <span className='flex items-center gap-2'>
                <span
                  className='size-2 rounded-full'
                  style={{ backgroundColor: location.color }}
                />
                <span className='text-xs font-medium'>{location.name}</span>
              </span>
              <span className='text-muted text-xs'>{location.distance}</span>
            </button>
          ))}
        </Card.Content>
      </Card>
    </div>
  );
}

export const StoreLocator: Story = {
  render: () => <StoreLocatorDemo />,
};

const fleetRoute = [
  [-122.3476, 47.6205],
  [-122.34763, 47.61974],
  [-122.34762, 47.61926],
  [-122.34762, 47.61858],
  [-122.3462, 47.61857],
  [-122.34566, 47.61857],
  [-122.34516, 47.61857],
  [-122.34404, 47.61856],
  [-122.34341, 47.61856],
  [-122.34263, 47.61856],
  [-122.34216, 47.61855],
  [-122.34146, 47.61851],
  [-122.34109, 47.61836],
  [-122.34054, 47.61806],
  [-122.33983, 47.61765],
  [-122.33889, 47.6171],
  [-122.33831, 47.61676],
  [-122.33806, 47.61637],
  [-122.33796, 47.61585],
  [-122.33785, 47.6153],
  [-122.33745, 47.61506],
  [-122.33628, 47.61436],
  [-122.3356, 47.61389],
  [-122.33512, 47.61351],
  [-122.33378, 47.61207],
  [-122.33323, 47.61167],
  [-122.33235, 47.61204],
  [-122.33208, 47.61198],
  [-122.33121, 47.61097],
  [-122.32998, 47.60955],
  [-122.32972, 47.6093],
  [-122.3289, 47.6084],
  [-122.32839, 47.60786],
  [-122.32788, 47.60731],
  [-122.32717, 47.60653],
  [-122.32626, 47.60691],
  [-122.32597, 47.60703],
  [-122.32505, 47.60741],
  [-122.32555, 47.60811],
  [-122.32461, 47.60857],
  [-122.32396, 47.60884],
  [-122.32226, 47.60957],
  [-122.32115, 47.61003],
  [-122.32081, 47.61012],
  [-122.32081, 47.61092],
  [-122.32082, 47.61126],
  [-122.32081, 47.61191],
  [-122.32081, 47.61271],
  [-122.32082, 47.61306],
  [-122.32083, 47.61385],
  [-122.32078, 47.61409],
  [-122.31958, 47.61409],
  [-122.31948, 47.61493],
  [-122.31941, 47.61523],
  [-122.31829, 47.61527],
  [-122.31751, 47.61528],
  [-122.31685, 47.61527],
  [-122.31687, 47.61637],
  [-122.31688, 47.61711],
  [-122.31689, 47.61767],
  [-122.31692, 47.61987],
  [-122.31692, 47.62095],
  [-122.31678, 47.62146],
  [-122.31675, 47.62307],
  [-122.31675, 47.62427],
  [-122.31561, 47.62427],
  [-122.31464, 47.62426],
  [-122.3141, 47.62426],
] as [number, number][];

const fleetVehicles = [
  {
    color: '#4285f4',
    driver: 'Maya',
    eta: '6 min',
    latitude: 47.6205,
    longitude: -122.3477,
    status: 'En route',
    unit: 'Bike 14',
  },
  {
    color: '#22c55e',
    driver: 'Noah',
    eta: 'Ready',
    latitude: 47.6112,
    longitude: -122.3314,
    status: 'At pickup',
    unit: 'Van 03',
  },
  {
    color: '#f97316',
    driver: 'Iris',
    eta: '11 min',
    latitude: 47.624,
    longitude: -122.3141,
    status: 'Rerouting',
    unit: 'Bike 22',
  },
];

function FleetDispatchDemo() {
  const [selected, setSelected] = useState<
    (typeof fleetVehicles)[number] | null
  >(fleetVehicles[0]!);
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-122.342, 47.628]} pitch={32} styles={styles} zoom={13}>
        <Map.Route
          color='#4285f4'
          coordinates={fleetRoute}
          opacity={0.78}
          width={4}
        />
        {fleetVehicles.map((vehicle) => (
          <Map.Marker
            key={vehicle.unit}
            latitude={vehicle.latitude}
            longitude={vehicle.longitude}
            onClick={() => setSelected(vehicle)}
          >
            <Map.MarkerContent>
              <Map.MarkerDot color={vehicle.color} />
              <Map.MarkerLabel>{vehicle.unit}</Map.MarkerLabel>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{vehicle.driver}</span>
              <span className='text-background/70 ml-1'>{vehicle.status}</span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
        {selected ? (
          <Map.Popup
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            latitude={selected.latitude}
            longitude={selected.longitude}
            offset={18}
            onClose={() => setSelected(null)}
          >
            <div className='space-y-1 pr-4 text-xs'>
              <p className='font-medium'>{selected.unit}</p>
              <p className='text-muted'>{selected.driver}</p>
              <p className='text-muted'>
                {selected.status} · {selected.eta}
              </p>
            </div>
          </Map.Popup>
        ) : null}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.CompassControl />
          <Map.FullscreenControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[230px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Fleet dispatch</Card.Title>
          <Card.Description>Seattle central zone</Card.Description>
        </Card.Header>
        <Card.Content className='grid grid-cols-3 gap-3 text-xs'>
          <span>
            <strong className='text-foreground block text-base'>18</strong>
            Active
          </span>
          <span>
            <strong className='text-foreground block text-base'>92%</strong>SLA
          </span>
          <span>
            <strong className='text-foreground block text-base'>4</strong>Holds
          </span>
        </Card.Content>
      </Card>
    </div>
  );
}

export const FleetDispatch: Story = {
  render: () => <FleetDispatchDemo />,
};

const eventStations = [
  {
    Icon: UserGroupIcon,
    color: '#4285f4',
    details: '2,400 guests checked in over the last 20 minutes.',
    id: 'gate',
    label: 'Main gate',
    latitude: 37.7693,
    longitude: -122.4862,
    metric: '78% flow',
    status: 'On pace',
  },
  {
    Icon: StreetFoodIcon,
    color: '#f97316',
    details:
      'North row is above forecast; two vendors are opening overflow lines.',
    id: 'food',
    label: 'Food row',
    latitude: 37.7672,
    longitude: -122.4818,
    metric: '14 min wait',
    status: 'High demand',
  },
  {
    Icon: FirstAidKitIcon,
    color: '#ef4444',
    details: 'Medical tent has two open teams and one active response.',
    id: 'medical',
    label: 'Medical tent',
    latitude: 37.7709,
    longitude: -122.4776,
    metric: '2 min SLA',
    status: 'Ready',
  },
  {
    Icon: SecurityCheckIcon,
    color: '#22c55e',
    details: 'Security check is staffed for both park entrances.',
    id: 'security',
    label: 'Security desk',
    latitude: 37.7726,
    longitude: -122.4827,
    metric: '6 teams',
    status: 'Covered',
  },
  {
    Icon: GpsSignal01Icon,
    color: '#8b5cf6',
    details: 'Temporary network mesh is healthy across the venue.',
    id: 'signal',
    label: 'Signal tower',
    latitude: 37.7686,
    longitude: -122.475,
    metric: '96% signal',
    status: 'Stable',
  },
  {
    Icon: TrafficLightIcon,
    color: '#14b8a6',
    details: 'Ride-share lane has a small backup near the west exit.',
    id: 'traffic',
    label: 'Exit lane',
    latitude: 37.7654,
    longitude: -122.4868,
    metric: '8 min clear',
    status: 'Watch',
  },
];

function EventOperationsDemo() {
  const [selected, setSelected] = useState<
    (typeof eventStations)[number] | null
  >(eventStations[0]!);
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map
        center={[-122.4817, 37.7689]}
        pitch={20}
        styles={styles}
        zoom={14.35}
      >
        {eventStations.map((station) => {
          const isSelected = selected?.id === station.id;
          return (
            <Map.Marker
              key={station.id}
              latitude={station.latitude}
              longitude={station.longitude}
              onClick={() => setSelected(station)}
            >
              <Map.MarkerContent>
                <span
                  className='shadow-overlay flex size-8 items-center justify-center rounded-full border-2 border-white/90 text-white transition data-[selected=true]:scale-110 data-[selected=true]:ring-2 data-[selected=true]:ring-white/70'
                  data-selected={isSelected || undefined}
                  style={{ backgroundColor: station.color }}
                >
                  <HugeiconsIcon
                    aria-hidden
                    className='size-4'
                    icon={station.Icon}
                  />
                </span>
                <Map.MarkerLabel>{station.label}</Map.MarkerLabel>
              </Map.MarkerContent>
              <Map.MarkerTooltip
                className='bg-overlay text-foreground shadow-overlay w-[320px] rounded-3xl p-4'
                offset={20}
              >
                <div className='space-y-2 text-xs'>
                  <div>
                    <p className='font-medium'>{station.label}</p>
                    <p className='text-muted'>{station.status}</p>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <span>
                      <strong className='text-foreground block'>Metric</strong>
                      {station.metric}
                    </span>
                    <span>
                      <strong className='text-foreground block'>Desk</strong>
                      Live ops
                    </span>
                  </div>
                  <p className='text-muted'>{station.details}</p>
                </div>
              </Map.MarkerTooltip>
            </Map.Marker>
          );
        })}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.CompassControl />
          <Map.FullscreenControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[260px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Event command</Card.Title>
          <Card.Description>Golden Gate Park live ops</Card.Description>
        </Card.Header>
        <Card.Content className='gap-3'>
          <div className='grid grid-cols-3 gap-3 text-xs'>
            <span>
              <strong className='text-foreground block text-base'>6</strong>
              Teams
            </span>
            <span>
              <strong className='text-foreground block text-base'>18k</strong>
              Guests
            </span>
            <span>
              <strong className='text-foreground block text-base'>94%</strong>
              Flow
            </span>
          </div>
          <div className='space-y-1'>
            {eventStations.slice(0, 4).map((station) => (
              <button
                className='hover:bg-surface-tertiary flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition'
                key={station.id}
                type='button'
                onClick={() => setSelected(station)}
              >
                <span className='flex items-center gap-2'>
                  <span
                    className='flex size-5 items-center justify-center rounded-full text-white'
                    style={{ backgroundColor: station.color }}
                  >
                    <HugeiconsIcon
                      aria-hidden
                      className='size-3'
                      icon={station.Icon}
                    />
                  </span>
                  <span className='text-xs font-medium'>{station.label}</span>
                </span>
                <span className='text-muted text-xs'>{station.metric}</span>
              </button>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

export const EventOperations: Story = {
  render: () => <EventOperationsDemo />,
};

const coverageSourceId = 'coverage-zones-source';
const coverageFillId = 'coverage-zones-fill';
const coverageLineId = 'coverage-zones-line';
const coverageData = {
  features: [
    {
      geometry: {
        coordinates: [
          [
            [-97.764, 30.295],
            [-97.735, 30.3],
            [-97.723, 30.276],
            [-97.752, 30.267],
            [-97.773, 30.277],
            [-97.764, 30.295],
          ],
        ],
        type: 'Polygon' as const,
      },
      properties: {
        fill: '#4285f4',
        name: 'North same-day',
        stroke: '#2563eb',
        volume: '84% covered',
      },
      type: 'Feature' as const,
    },
    {
      geometry: {
        coordinates: [
          [
            [-97.752, 30.267],
            [-97.723, 30.276],
            [-97.714, 30.247],
            [-97.744, 30.238],
            [-97.769, 30.25],
            [-97.752, 30.267],
          ],
        ],
        type: 'Polygon' as const,
      },
      properties: {
        fill: '#22c55e',
        name: 'Core express',
        stroke: '#16a34a',
        volume: '96% covered',
      },
      type: 'Feature' as const,
    },
    {
      geometry: {
        coordinates: [
          [
            [-97.769, 30.25],
            [-97.744, 30.238],
            [-97.734, 30.212],
            [-97.771, 30.207],
            [-97.792, 30.226],
            [-97.769, 30.25],
          ],
        ],
        type: 'Polygon' as const,
      },
      properties: {
        fill: '#f97316',
        name: 'South scheduled',
        stroke: '#ea580c',
        volume: '71% covered',
      },
      type: 'Feature' as const,
    },
  ],
  type: 'FeatureCollection' as const,
};
const coverageZones = [
  {
    color: '#4285f4',
    latitude: 30.284,
    longitude: -97.748,
    name: 'North same-day',
    volume: '84%',
  },
  {
    color: '#22c55e',
    latitude: 30.255,
    longitude: -97.738,
    name: 'Core express',
    volume: '96%',
  },
  {
    color: '#f97316',
    latitude: 30.225,
    longitude: -97.766,
    name: 'South scheduled',
    volume: '71%',
  },
];

function CoverageLayer() {
  const { isLoaded, map } = useMap();
  useEffect(() => {
    if (!isLoaded || !map) return;
    const addLayers = () => {
      if (map.getSource(coverageSourceId)) return;
      const beforeId = map
        .getStyle()
        .layers?.find((layer) => layer.type === 'symbol')?.id;
      map.addSource(coverageSourceId, { data: coverageData, type: 'geojson' });
      map.addLayer(
        {
          id: coverageFillId,
          paint: { 'fill-color': ['get', 'fill'], 'fill-opacity': 0.18 },
          source: coverageSourceId,
          type: 'fill',
        },
        beforeId,
      );
      map.addLayer(
        {
          id: coverageLineId,
          paint: {
            'line-color': ['get', 'stroke'],
            'line-opacity': 0.9,
            'line-width': 2,
          },
          source: coverageSourceId,
          type: 'line',
        },
        beforeId,
      );
    };
    if (map.isStyleLoaded()) addLayers();
    else map.once('idle', addLayers);
    return () => {
      map.off('idle', addLayers);
      if (map.getLayer(coverageLineId)) map.removeLayer(coverageLineId);
      if (map.getLayer(coverageFillId)) map.removeLayer(coverageFillId);
      if (map.getSource(coverageSourceId)) map.removeSource(coverageSourceId);
    };
  }, [isLoaded, map]);
  return null;
}
export const CoverageZones: Story = {
  render: () => (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-97.748, 30.254]} pitch={18} styles={styles} zoom={10.9}>
        <CoverageLayer />
        {coverageZones.map((zone) => (
          <Map.Marker
            key={zone.name}
            latitude={zone.latitude}
            longitude={zone.longitude}
          >
            <Map.MarkerContent>
              <Map.MarkerDot color={zone.color} />
              <Map.MarkerLabel>{zone.volume}</Map.MarkerLabel>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{zone.name}</span>
              <span className='text-background/70 ml-1'>
                {zone.volume} covered
              </span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.CompassControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[240px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Coverage zones</Card.Title>
          <Card.Description>Austin delivery capacity</Card.Description>
        </Card.Header>
        <Card.Content className='gap-2'>
          {coverageZones.map((zone) => (
            <div
              className='flex items-center justify-between text-xs'
              key={zone.name}
            >
              <span className='flex items-center gap-2'>
                <span
                  className='size-2 rounded-full'
                  style={{ backgroundColor: zone.color }}
                />
                {zone.name}
              </span>
              <span className='text-muted'>{zone.volume}</span>
            </div>
          ))}
        </Card.Content>
      </Card>
    </div>
  ),
};

const airports = [
  {
    code: 'SFO',
    latitude: 37.6213,
    longitude: -122.379,
    name: 'San Francisco',
  },
  { code: 'JFK', latitude: 40.6413, longitude: -73.7781, name: 'New York' },
  { code: 'LHR', latitude: 51.47, longitude: -0.4543, name: 'London' },
  { code: 'CDG', latitude: 49.0097, longitude: 2.5479, name: 'Paris' },
  { code: 'DXB', latitude: 25.2532, longitude: 55.3657, name: 'Dubai' },
  { code: 'SIN', latitude: 1.3644, longitude: 103.9915, name: 'Singapore' },
  { code: 'HND', latitude: 35.5494, longitude: 139.7798, name: 'Tokyo' },
  { code: 'SYD', latitude: -33.9399, longitude: 151.1753, name: 'Sydney' },
];
const airportByCode = Object.fromEntries(
  airports.map((airport) => [airport.code, airport]),
);
const flightOperations = [
  {
    color: '#4285f4',
    from: 'SFO',
    load: '82%',
    seats: '187',
    status: 'Boarding',
    to: 'HND',
  },
  {
    color: '#4285f4',
    from: 'HND',
    load: '76%',
    seats: '144',
    status: 'On time',
    to: 'SIN',
  },
  {
    color: '#22c55e',
    from: 'JFK',
    load: '91%',
    seats: '212',
    status: 'Priority',
    to: 'LHR',
  },
  {
    color: '#22c55e',
    from: 'CDG',
    load: '68%',
    seats: '126',
    status: 'Open',
    to: 'DXB',
  },
  {
    color: '#f97316',
    from: 'DXB',
    load: '94%',
    seats: '231',
    status: 'Gate hold',
    to: 'SYD',
  },
  {
    color: '#8b5cf6',
    from: 'LHR',
    load: '73%',
    seats: '158',
    status: 'Connection',
    to: 'SFO',
  },
];
const flights = flightOperations.map((flight) => {
  const from = airportByCode[flight.from]!;
  const to = airportByCode[flight.to]!;
  return {
    color: flight.color,
    from: [from.longitude, from.latitude] as [number, number],
    id: `${flight.from}-${flight.to}`,
    load: flight.load,
    route: `${flight.from} → ${flight.to}`,
    seats: flight.seats,
    status: flight.status,
    to: [to.longitude, to.latitude] as [number, number],
    width: flight.status === 'Gate hold' ? 3.5 : 2.5,
  };
});
export const FlightPaths: Story = {
  render: () => (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map
        center={[24, 28]}
        projection={{ type: 'globe' }}
        styles={styles}
        zoom={1.9}
      >
        <Map.Arc
          curvature={0.34}
          data={flights}
          hoverPaint={{ 'line-opacity': 1, 'line-width': 5 }}
          paint={{
            'line-color': ['get', 'color'],
            'line-opacity': 0.74,
            'line-width': ['get', 'width'],
          }}
        />
        {airports.map((airport) => (
          <Map.Marker
            key={airport.code}
            latitude={airport.latitude}
            longitude={airport.longitude}
          >
            <Map.MarkerContent>
              <Map.MarkerDot color='#4285f4' />
              <Map.MarkerLabel>{airport.code}</Map.MarkerLabel>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{airport.code}</span>
              <span className='text-background/70 ml-1'>{airport.name}</span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.CompassControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[260px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Flight operations</Card.Title>
          <Card.Description>Long-haul capacity desk</Card.Description>
        </Card.Header>
        <Card.Content className='gap-3'>
          <div className='grid grid-cols-3 gap-3 text-xs'>
            <span>
              <strong className='text-foreground block text-base'>6</strong>
              Routes
            </span>
            <span>
              <strong className='text-foreground block text-base'>1.1k</strong>
              Seats
            </span>
            <span>
              <strong className='text-foreground block text-base'>94%</strong>
              Peak
            </span>
          </div>
          <div className='space-y-1'>
            {flights.slice(0, 3).map((flight) => (
              <div
                className='flex items-center justify-between text-xs'
                key={flight.id}
              >
                <span className='flex items-center gap-2'>
                  <span
                    className='h-0.5 w-4 rounded-full'
                    style={{ backgroundColor: flight.color }}
                  />
                  {flight.route}
                </span>
                <span className='text-muted'>{flight.load}</span>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  ),
};

const newsroomStories = [
  {
    audience: '2.4m',
    city: 'Vancouver',
    country: 'Canada',
    desk: 'Environment',
    headline: 'Coastal cities prepare for a record king tide',
    latitude: 49.2827,
    longitude: -123.1207,
    reporter: 'Mira Chen',
    status: 'Editing',
    updated: '4 min ago',
  },
  {
    audience: '3.1m',
    city: 'Mexico City',
    country: 'Mexico',
    desk: 'Culture',
    headline: 'Night markets turn old rail yards into public stages',
    latitude: 19.4326,
    longitude: -99.1332,
    reporter: 'Leo Vargas',
    status: 'Filed',
    updated: '11 min ago',
  },
  {
    audience: '5.6m',
    city: 'New York',
    country: 'United States',
    desk: 'Business',
    headline: 'Publishers test subscriber bundles for local coverage',
    latitude: 40.7128,
    longitude: -74.006,
    reporter: 'Ari Bloom',
    status: 'Live',
    updated: '2 min ago',
  },
  {
    audience: '1.9m',
    city: 'Bogota',
    country: 'Colombia',
    desk: 'Policy',
    headline: 'Mayors coordinate new transit safety pledges',
    latitude: 4.711,
    longitude: -74.0721,
    reporter: 'Sofia Rojas',
    status: 'Review',
    updated: '18 min ago',
  },
  {
    audience: '2.7m',
    city: 'Sao Paulo',
    country: 'Brazil',
    desk: 'Markets',
    headline: 'Coffee futures climb as exporters hedge rainfall risk',
    latitude: -23.5558,
    longitude: -46.6396,
    reporter: 'Nina Costa',
    status: 'Editing',
    updated: '7 min ago',
  },
  {
    audience: '4.8m',
    city: 'London',
    country: 'United Kingdom',
    desk: 'Politics',
    headline: 'Parliament opens hearings on campaign transparency',
    latitude: 51.5072,
    longitude: -0.1276,
    reporter: 'Theo Marsh',
    status: 'Live',
    updated: 'Now',
  },
  {
    audience: '1.8m',
    city: 'Paris',
    country: 'France',
    desk: 'Culture',
    headline: 'Museum nights draw a younger crowd across the city',
    latitude: 48.8566,
    longitude: 2.3522,
    reporter: 'Camille Laurent',
    status: 'Filed',
    updated: '22 min ago',
  },
  {
    audience: '3.3m',
    city: 'Berlin',
    country: 'Germany',
    desk: 'Technology',
    headline: 'Open-source maintainers form a regional funding pact',
    latitude: 52.52,
    longitude: 13.405,
    reporter: 'Jonas Weber',
    status: 'Review',
    updated: '15 min ago',
  },
  {
    audience: '2.2m',
    city: 'Cairo',
    country: 'Egypt',
    desk: 'Heritage',
    headline: 'Restoration teams reopen a long-closed archive wing',
    latitude: 30.0444,
    longitude: 31.2357,
    reporter: 'Mona Saleh',
    status: 'Editing',
    updated: '9 min ago',
  },
  {
    audience: '2.6m',
    city: 'Lagos',
    country: 'Nigeria',
    desk: 'Business',
    headline: 'Fintech founders shift focus toward merchant tools',
    latitude: 6.5244,
    longitude: 3.3792,
    reporter: 'Tomi Adeyemi',
    status: 'Live',
    updated: '5 min ago',
  },
  {
    audience: '1.5m',
    city: 'Nairobi',
    country: 'Kenya',
    desk: 'Science',
    headline: 'Conservation labs publish a new migration forecast',
    latitude: -1.2921,
    longitude: 36.8219,
    reporter: 'Iris Kamau',
    status: 'Filed',
    updated: '30 min ago',
  },
  {
    audience: '3.8m',
    city: 'Dubai',
    country: 'United Arab Emirates',
    desk: 'Travel',
    headline: 'Airlines add capacity ahead of winter conference season',
    latitude: 25.2048,
    longitude: 55.2708,
    reporter: 'Rami Haddad',
    status: 'Review',
    updated: '13 min ago',
  },
  {
    audience: '4.1m',
    city: 'Mumbai',
    country: 'India',
    desk: 'Film',
    headline: 'Streaming studios bet on shorter theatrical windows',
    latitude: 19.076,
    longitude: 72.8777,
    reporter: 'Anika Rao',
    status: 'Editing',
    updated: '6 min ago',
  },
  {
    audience: '5.2m',
    city: 'Singapore',
    country: 'Singapore',
    desk: 'Finance',
    headline: 'Regional exchanges align rules for carbon contracts',
    latitude: 1.3521,
    longitude: 103.8198,
    reporter: 'Kai Tan',
    status: 'Live',
    updated: '3 min ago',
  },
  {
    audience: '3.6m',
    city: 'Seoul',
    country: 'South Korea',
    desk: 'Technology',
    headline: 'Chip suppliers report stronger demand for smart devices',
    latitude: 37.5665,
    longitude: 126.978,
    reporter: 'Min Seo',
    status: 'Review',
    updated: '17 min ago',
  },
  {
    audience: '4.4m',
    city: 'Tokyo',
    country: 'Japan',
    desk: 'Transport',
    headline: 'Rail operators trial crowd forecasting at major stations',
    latitude: 35.6762,
    longitude: 139.6503,
    reporter: 'Ren Sato',
    status: 'Editing',
    updated: '8 min ago',
  },
  {
    audience: '2.9m',
    city: 'Sydney',
    country: 'Australia',
    desk: 'Sports',
    headline: 'Harbor venues release plans for a summer finals week',
    latitude: -33.8688,
    longitude: 151.2093,
    reporter: 'Elena Brooks',
    status: 'Filed',
    updated: '26 min ago',
  },
  {
    audience: '1.7m',
    city: 'Auckland',
    country: 'New Zealand',
    desk: 'Climate',
    headline: 'Island councils compare emergency alert upgrades',
    latitude: -36.8509,
    longitude: 174.7645,
    reporter: 'Talia Reed',
    status: 'Review',
    updated: '20 min ago',
  },
];
const newsroomData = {
  features: newsroomStories.map(({ latitude, longitude, ...story }) => ({
    geometry: { coordinates: [longitude, latitude], type: 'Point' as const },
    properties: { ...story, id: `${story.city}-${story.headline}` },
    type: 'Feature' as const,
  })),
  type: 'FeatureCollection' as const,
};
const newsroomPointColor = [
  'match',
  ['get', 'status'],
  'Live',
  '#22c55e',
  'Editing',
  '#4285f4',
  'Review',
  '#f97316',
  'Filed',
  '#8b5cf6',
  '#4285f4',
];

function GlobalNewsroomDemo() {
  const [selected, setSelected] = useState(
    newsroomData.features[5]!.properties,
  );
  const pointPaint = useMemo(
    () => ({
      'circle-radius': ['case', ['==', ['get', 'id'], selected.id], 8, 6],
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'id'], selected.id],
        '#111827',
        '#ffffff',
      ],
      'circle-stroke-width': 2,
    }),
    [selected.id],
  );
  return (
    <div className='relative h-[500px] w-full overflow-hidden rounded-lg border'>
      <Map
        center={[-58, 13]}
        projection={{ type: 'globe' }}
        styles={styles}
        zoom={2.1}
      >
        <Map.ClusterLayer
          clusterColors={['#4285f4', '#8b5cf6', '#f97316']}
          clusterRadius={58}
          clusterThresholds={[4, 8]}
          data={newsroomData}
          pointColor={newsroomPointColor}
          pointPaint={pointPaint}
          onPointClick={(feature) =>
            setSelected(feature.properties as typeof selected)
          }
        />
      </Map>
      <Card className='bg-overlay shadow-overlay absolute bottom-3 left-1/2 z-10 w-[calc(100%-24px)] max-w-[380px] -translate-x-1/2 gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>{selected.headline}</Card.Title>
          <Card.Description>
            {selected.city}, {selected.country} · {selected.desk}
          </Card.Description>
        </Card.Header>
        <Card.Content className='grid grid-cols-2 gap-3 text-xs'>
          <span>
            <strong className='text-foreground block text-base'>
              {selected.status}
            </strong>
            Status
          </span>
          <span>
            <strong className='text-foreground block text-base'>
              {selected.audience}
            </strong>
            Reach
          </span>
          <span>
            <strong className='text-foreground block text-base'>
              {selected.updated}
            </strong>
            Updated
          </span>
          <span>
            <strong className='text-foreground block text-base'>
              {selected.reporter}
            </strong>
            Reporter
          </span>
        </Card.Content>
      </Card>
    </div>
  );
}

export const GlobalNewsroom: Story = { render: () => <GlobalNewsroomDemo /> };

const incidents = [
  {
    assignee: 'NOC',
    id: 'INC-2048',
    latitude: 40.758,
    longitude: -73.9855,
    service: 'Payments',
    severity: 'critical',
    status: 'Investigating',
    title: 'Checkout errors',
  },
  {
    assignee: 'Edge',
    id: 'INC-2049',
    latitude: 40.7505,
    longitude: -73.9934,
    service: 'CDN',
    severity: 'warning',
    status: 'Mitigating',
    title: 'Elevated latency',
  },
  {
    assignee: 'Data',
    id: 'INC-2050',
    latitude: 40.7306,
    longitude: -73.9866,
    service: 'Analytics',
    severity: 'info',
    status: 'Monitoring',
    title: 'Queue backlog',
  },
  {
    assignee: 'Ops',
    id: 'INC-2051',
    latitude: 40.7061,
    longitude: -74.0086,
    service: 'Auth',
    severity: 'warning',
    status: 'Assigned',
    title: 'Login retries',
  },
  {
    assignee: 'Mobile',
    id: 'INC-2052',
    latitude: 40.7182,
    longitude: -73.9571,
    service: 'Push',
    severity: 'info',
    status: 'Triaged',
    title: 'Notification delay',
  },
  {
    assignee: 'NOC',
    id: 'INC-2053',
    latitude: 40.6782,
    longitude: -73.9442,
    service: 'Search',
    severity: 'critical',
    status: 'Investigating',
    title: 'Index shard down',
  },
  {
    assignee: 'Infra',
    id: 'INC-2054',
    latitude: 40.7484,
    longitude: -73.956,
    service: 'Compute',
    severity: 'warning',
    status: 'Mitigating',
    title: 'Host pressure',
  },
  {
    assignee: 'Support',
    id: 'INC-2055',
    latitude: 40.7411,
    longitude: -74.0039,
    service: 'Tickets',
    severity: 'info',
    status: 'Monitoring',
    title: 'Webhook retries',
  },
  {
    assignee: 'Infra',
    id: 'INC-2056',
    latitude: 40.7128,
    longitude: -74.006,
    service: 'API',
    severity: 'critical',
    status: 'Paging',
    title: 'Error budget burn',
  },
  {
    assignee: 'Data',
    id: 'INC-2057',
    latitude: 40.7295,
    longitude: -74.0324,
    service: 'Warehouse',
    severity: 'warning',
    status: 'Assigned',
    title: 'Sync delayed',
  },
  {
    assignee: 'Edge',
    id: 'INC-2058',
    latitude: 40.6892,
    longitude: -74.0445,
    service: 'DNS',
    severity: 'info',
    status: 'Resolved',
    title: 'Failover complete',
  },
  {
    assignee: 'Mobile',
    id: 'INC-2059',
    latitude: 40.7516,
    longitude: -73.9755,
    service: 'App',
    severity: 'warning',
    status: 'Monitoring',
    title: 'Crash spike',
  },
];
const incidentColors = {
  critical: '#ef4444',
  info: '#4285f4',
  warning: '#f97316',
};
const incidentPointColor = [
  'match',
  ['get', 'severity'],
  'critical',
  incidentColors.critical,
  'warning',
  incidentColors.warning,
  'info',
  incidentColors.info,
  '#4285f4',
];
const incidentData = {
  features: incidents.map(({ latitude, longitude, ...incident }) => ({
    geometry: { coordinates: [longitude, latitude], type: 'Point' as const },
    properties: incident,
    type: 'Feature' as const,
  })),
  type: 'FeatureCollection' as const,
};

function IncidentMonitorDemo() {
  const [selected, setSelected] = useState<{
    coordinates: [number, number];
    properties: (typeof incidentData.features)[number]['properties'];
  } | null>(null);
  const critical = incidents.filter(
    (incident) => incident.severity === 'critical',
  ).length;
  const warning = incidents.filter(
    (incident) => incident.severity === 'warning',
  ).length;
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-73.985, 40.728]} pitch={18} styles={styles} zoom={10.7}>
        <Map.ClusterLayer
          clusterColors={['#4285f4', '#f97316', '#ef4444']}
          clusterRadius={42}
          clusterThresholds={[4, 8]}
          data={incidentData}
          pointColor={incidentPointColor}
          onPointClick={(feature, coordinates) =>
            setSelected({
              coordinates,
              properties:
                feature.properties as (typeof incidentData.features)[number]['properties'],
            })
          }
        />
        {selected ? (
          <Map.Popup
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            latitude={selected.coordinates[1]}
            longitude={selected.coordinates[0]}
            onClose={() => setSelected(null)}
          >
            <div className='space-y-2 pr-4 text-xs'>
              <div>
                <p className='font-medium'>{selected.properties.title}</p>
                <p className='text-muted'>{selected.properties.id}</p>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <span>
                  <strong className='text-foreground block'>Service</strong>
                  {selected.properties.service}
                </span>
                <span>
                  <strong className='text-foreground block'>Owner</strong>
                  {selected.properties.assignee}
                </span>
              </div>
              <p className='text-muted'>
                {selected.properties.severity} · {selected.properties.status}
              </p>
            </div>
          </Map.Popup>
        ) : null}
        <Map.Controls>
          <Map.ZoomControl />
          <Map.FullscreenControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[250px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Incident monitor</Card.Title>
          <Card.Description>New York operations</Card.Description>
        </Card.Header>
        <Card.Content className='gap-3'>
          <div className='grid grid-cols-3 gap-3 text-xs'>
            <span>
              <strong className='text-foreground block text-base'>
                {incidents.length}
              </strong>
              Open
            </span>
            <span>
              <strong className='text-foreground block text-base'>
                {critical}
              </strong>
              Critical
            </span>
            <span>
              <strong className='text-foreground block text-base'>
                {warning}
              </strong>
              Warning
            </span>
          </div>
          <div className='space-y-1'>
            {(['critical', 'warning', 'info'] as const).map((severity) => (
              <div
                className='flex items-center justify-between text-xs'
                key={severity}
              >
                <span className='flex items-center gap-2 capitalize'>
                  <span
                    className='size-2 rounded-full'
                    style={{ backgroundColor: incidentColors[severity] }}
                  />
                  {severity}
                </span>
                <span className='text-muted'>
                  {
                    incidents.filter(
                      (incident) => incident.severity === severity,
                    ).length
                  }
                </span>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

export const IncidentMonitor: Story = { render: () => <IncidentMonitorDemo /> };

const avatarRoot = '/assets/avatars';
const visitors = [
  {
    avatar: `${avatarRoot}/blue.jpg`,
    city: 'London',
    fallback: 'LN',
    latitude: 51.5072,
    longitude: -0.1276,
    name: 'Visitor from London',
  },
  {
    avatar: `${avatarRoot}/red.jpg`,
    city: 'Paris',
    fallback: 'PA',
    latitude: 48.8566,
    longitude: 2.3522,
    name: 'Visitor from Paris',
  },
  {
    avatar: `${avatarRoot}/purple.jpg`,
    city: 'Berlin',
    fallback: 'BE',
    latitude: 52.52,
    longitude: 13.405,
    name: 'Visitor from Berlin',
  },
  {
    avatar: `${avatarRoot}/green.jpg`,
    city: 'Madrid',
    fallback: 'MA',
    latitude: 40.4168,
    longitude: -3.7038,
    name: 'Visitor from Madrid',
  },
  {
    avatar: `${avatarRoot}/orange.jpg`,
    city: 'Rome',
    fallback: 'RO',
    latitude: 41.9028,
    longitude: 12.4964,
    name: 'Visitor from Rome',
  },
  {
    avatar: `${avatarRoot}/white.jpg`,
    city: 'Kyiv',
    fallback: 'KY',
    latitude: 50.4501,
    longitude: 30.5234,
    name: 'Visitor from Kyiv',
  },
  {
    avatar: `${avatarRoot}/blue-light.jpg`,
    city: 'Cairo',
    fallback: 'CA',
    latitude: 30.0444,
    longitude: 31.2357,
    name: 'Visitor from Cairo',
  },
  {
    avatar: `${avatarRoot}/red.jpg`,
    city: 'Istanbul',
    fallback: 'IS',
    latitude: 41.0082,
    longitude: 28.9784,
    name: 'Visitor from Istanbul',
  },
  {
    avatar: `${avatarRoot}/purple.jpg`,
    city: 'Dubai',
    fallback: 'DU',
    latitude: 25.2048,
    longitude: 55.2708,
    name: 'Visitor from Dubai',
  },
  {
    avatar: `${avatarRoot}/green.jpg`,
    city: 'Riyadh',
    fallback: 'RI',
    latitude: 24.7136,
    longitude: 46.6753,
    name: 'Visitor from Riyadh',
  },
  {
    avatar: `${avatarRoot}/blue.jpg`,
    city: 'New York',
    fallback: 'NY',
    latitude: 40.7128,
    longitude: -74.006,
    name: 'Visitor from New York',
  },
  {
    avatar: `${avatarRoot}/orange.jpg`,
    city: 'San Francisco',
    fallback: 'SF',
    latitude: 37.7749,
    longitude: -122.4194,
    name: 'Visitor from San Francisco',
  },
  {
    avatar: `${avatarRoot}/green.jpg`,
    city: 'Mexico City',
    fallback: 'MX',
    latitude: 19.4326,
    longitude: -99.1332,
    name: 'Visitor from Mexico City',
  },
  {
    avatar: `${avatarRoot}/purple.jpg`,
    city: 'Bogota',
    fallback: 'BO',
    latitude: 4.711,
    longitude: -74.0721,
    name: 'Visitor from Bogota',
  },
  {
    avatar: `${avatarRoot}/red.jpg`,
    city: 'Sao Paulo',
    fallback: 'SP',
    latitude: -23.5558,
    longitude: -46.6396,
    name: 'Visitor from Sao Paulo',
  },
  {
    avatar: `${avatarRoot}/white.jpg`,
    city: 'Buenos Aires',
    fallback: 'BA',
    latitude: -34.6037,
    longitude: -58.3816,
    name: 'Visitor from Buenos Aires',
  },
];
const visitorClusters = [
  { count: 5, latitude: 53.3498, longitude: -6.2603 },
  { count: 3, latitude: 38.7223, longitude: -9.1393 },
  { count: 4, latitude: 43.6532, longitude: -79.3832 },
];
export const LiveVisitors: Story = {
  render: () => (
    <div className='relative h-[500px] w-full overflow-hidden rounded-lg border'>
      <Map
        center={[18, 34]}
        projection={{ type: 'globe' }}
        styles={styles}
        zoom={2.5}
      >
        {visitors.map((visitor) => (
          <Map.Marker
            key={visitor.city}
            latitude={visitor.latitude}
            longitude={visitor.longitude}
          >
            <Map.MarkerContent>
              <Avatar className='ring-2 ring-white' size='sm'>
                <Avatar.Image alt={visitor.name} src={visitor.avatar} />
                <Avatar.Fallback>{visitor.fallback}</Avatar.Fallback>
              </Avatar>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{visitor.city}</span>
              <span className='text-background/70 ml-1'>Active now</span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
        {visitorClusters.map((cluster) => (
          <Map.Marker
            key={`${cluster.latitude}-${cluster.longitude}`}
            latitude={cluster.latitude}
            longitude={cluster.longitude}
          >
            <Map.MarkerContent>
              <span className='flex size-6 items-center justify-center rounded-full bg-[#8b5cf6] text-xs font-medium text-white ring-2 ring-white'>
                {cluster.count}
              </span>
            </Map.MarkerContent>
            <Map.MarkerTooltip>
              <span className='font-medium'>{cluster.count} visitors</span>
            </Map.MarkerTooltip>
          </Map.Marker>
        ))}
      </Map>
      <div className='bg-foreground text-background absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg'>
        <span className='relative flex size-2'>
          <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75' />
          <span className='relative inline-flex size-2 rounded-full bg-[#22c55e]' />
        </span>
        28 visitors online
      </div>
    </div>
  ),
};

const properties = [
  {
    baths: 2,
    beds: 3,
    id: 'noe-valley',
    latitude: 37.7502,
    longitude: -122.4337,
    name: 'Noe Valley Victorian',
    neighborhood: 'Noe Valley',
    price: '$1.28m',
    sqft: '1,850',
  },
  {
    baths: 1,
    beds: 2,
    id: 'mission-loft',
    latitude: 37.7599,
    longitude: -122.4148,
    name: 'Mission District loft',
    neighborhood: 'Mission',
    price: '$895k',
    sqft: '1,120',
  },
  {
    baths: 2,
    beds: 2,
    id: 'hayes-valley',
    latitude: 37.7759,
    longitude: -122.4245,
    name: 'Hayes Valley condo',
    neighborhood: 'Hayes Valley',
    price: '$1.05m',
    sqft: '1,340',
  },
  {
    baths: 3,
    beds: 4,
    id: 'marina-view',
    latitude: 37.8021,
    longitude: -122.4382,
    name: 'Marina view home',
    neighborhood: 'Marina',
    price: '$2.4m',
    sqft: '2,600',
  },
  {
    baths: 1,
    beds: 1,
    id: 'soma-studio',
    latitude: 37.7785,
    longitude: -122.395,
    name: 'SoMa studio',
    neighborhood: 'SoMa',
    price: '$650k',
    sqft: '780',
  },
  {
    baths: 2,
    beds: 3,
    id: 'inner-sunset',
    latitude: 37.7644,
    longitude: -122.4692,
    name: 'Inner Sunset flat',
    neighborhood: 'Inner Sunset',
    price: '$1.12m',
    sqft: '1,540',
  },
];

function PropertyListingsDemo() {
  const [selectedId, setSelectedId] = useState<string | null>(
    properties[1]!.id,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selected =
    properties.find((property) => property.id === selectedId) ?? null;
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-122.431, 37.773]} styles={styles} zoom={12}>
        {properties.map((property) => {
          const active =
            property.id === selectedId || property.id === hoveredId;
          return (
            <Map.Marker
              key={property.id}
              latitude={property.latitude}
              longitude={property.longitude}
              onClick={() => setSelectedId(property.id)}
            >
              <Map.MarkerContent>
                <span
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-semibold shadow-md transition ${active ? 'bg-foreground text-background border-foreground' : 'bg-overlay text-foreground'}`}
                >
                  {property.price}
                </span>
              </Map.MarkerContent>
            </Map.Marker>
          );
        })}
        {selected ? (
          <Map.Popup
            closeButton
            closeOnClick={false}
            focusAfterOpen={false}
            latitude={selected.latitude}
            longitude={selected.longitude}
            offset={22}
            onClose={() => setSelectedId(null)}
          >
            <div className='space-y-1 pr-4 text-xs'>
              <p className='font-medium'>{selected.name}</p>
              <p className='text-muted'>{selected.neighborhood}</p>
              <p className='text-muted'>
                {selected.beds} bd · {selected.baths} ba · {selected.sqft} sqft
              </p>
              <p className='text-foreground font-semibold'>{selected.price}</p>
            </div>
          </Map.Popup>
        ) : null}
        <Map.Controls>
          <Map.ZoomControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[250px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>For sale</Card.Title>
          <Card.Description>
            {properties.length} homes in San Francisco
          </Card.Description>
        </Card.Header>
        <Card.Content className='gap-1'>
          {properties.map((property) => (
            <button
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left transition ${property.id === selectedId ? 'bg-surface-tertiary' : 'hover:bg-surface-tertiary'}`}
              key={property.id}
              type='button'
              onClick={() => setSelectedId(property.id)}
              onMouseEnter={() => setHoveredId(property.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className='min-w-0'>
                <span className='block truncate text-xs font-medium'>
                  {property.name}
                </span>
                <span className='text-muted block text-xs'>
                  {property.beds} bd · {property.baths} ba
                </span>
              </span>
              <span className='text-xs font-semibold'>{property.price}</span>
            </button>
          ))}
        </Card.Content>
      </Card>
    </div>
  );
}

export const PropertyListings: Story = {
  render: () => <PropertyListingsDemo />,
};

const trackingDuration = 45_000;
const trackingMinutes = 9;
const trackingRoute = [
  [-122.3937, 37.7955],
  [-122.3963, 37.7935],
  [-122.4008, 37.79],
  [-122.4055, 37.7862],
  [-122.4102, 37.7825],
  [-122.4148, 37.7788],
  [-122.4195, 37.7751],
  [-122.4216, 37.7724],
  [-122.4213, 37.7692],
  [-122.4211, 37.7659],
  [-122.4208, 37.7626],
  [-122.4206, 37.7593],
  [-122.4204, 37.7561],
] as [number, number][];
const trackingDestination = trackingRoute[trackingRoute.length - 1]!;
const trackingSegments = trackingRoute
  .slice(1)
  .map((point, index) =>
    Math.hypot(
      point[0] - trackingRoute[index]![0],
      point[1] - trackingRoute[index]![1],
    ),
  );
const trackingDistance = trackingSegments.reduce(
  (total, distance) => total + distance,
  0,
);
const trackingPosition = (progress: number) => {
  let remaining = progress * trackingDistance;
  for (let index = 0; index < trackingSegments.length; index++) {
    const distance = trackingSegments[index]!;
    if (remaining <= distance) {
      const ratio = distance === 0 ? 0 : remaining / distance;
      const from = trackingRoute[index]!;
      const to = trackingRoute[index + 1]!;
      return {
        index,
        point: [
          from[0] + (to[0] - from[0]) * ratio,
          from[1] + (to[1] - from[1]) * ratio,
        ] as [number, number],
      };
    }
    remaining -= distance;
  }
  return { index: trackingRoute.length - 2, point: trackingDestination };
};

function TrackingDemo() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame: number;
    let startedAt: number | null = null;
    const update = (time: number) => {
      if (startedAt === null) startedAt = time;
      setProgress(((time - startedAt) % trackingDuration) / trackingDuration);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  const { index, point } = trackingPosition(progress);
  const completedRoute = [...trackingRoute.slice(0, index + 1), point];
  const eta = Math.max(1, Math.ceil((1 - progress) * trackingMinutes));
  return (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-122.4085, 37.776]} pitch={30} styles={styles} zoom={13.1}>
        <Map.Route
          color='#94a3b8'
          coordinates={trackingRoute}
          dashArray={[1.5, 1.5]}
          opacity={0.6}
          width={3}
        />
        <Map.Route
          color='#4285f4'
          coordinates={completedRoute}
          opacity={0.9}
          width={4}
        />
        <Map.Marker latitude={point[1]} longitude={point[0]}>
          <Map.MarkerContent>
            <Map.MarkerDot color='#4285f4' />
            <Map.MarkerLabel>Courier</Map.MarkerLabel>
          </Map.MarkerContent>
        </Map.Marker>
        <Map.Marker
          latitude={trackingDestination[1]}
          longitude={trackingDestination[0]}
        >
          <Map.MarkerContent>
            <Map.MarkerDot color='#22c55e' />
            <Map.MarkerLabel>Drop-off</Map.MarkerLabel>
          </Map.MarkerContent>
        </Map.Marker>
        <Map.Controls>
          <Map.ZoomControl />
          <Map.CompassControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[250px] gap-3 p-4'>
        <Card.Header className='flex-row items-center gap-3'>
          <Avatar size='sm'>
            <Avatar.Image
              alt='Noah the courier'
              src={`${avatarRoot}/green.jpg`}
            />
            <Avatar.Fallback>NO</Avatar.Fallback>
          </Avatar>
          <div className='min-w-0'>
            <Card.Title className='text-sm'>Noah is on the way</Card.Title>
            <Card.Description>Order #4128 · 2 items</Card.Description>
          </div>
        </Card.Header>
        <Card.Content className='gap-2'>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted'>Estimated arrival</span>
            <span className='font-semibold'>{eta} min</span>
          </div>
          <div className='bg-surface-tertiary h-1.5 w-full overflow-hidden rounded-full'>
            <div
              className='h-full rounded-full bg-[#4285f4] transition-[width] duration-150 ease-linear'
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
export const LiveTracking: Story = { render: () => <TrackingDemo /> };

const heatmapSourceId = 'pickup-heatmap-source';
const heatmapLayerId = 'pickup-heatmap-layer';
const demandCenters = [
  { intensity: 1, latitude: 40.758, longitude: -73.9855, name: 'Midtown' },
  { intensity: 0.9, latitude: 40.723, longitude: -74, name: 'SoHo' },
  {
    intensity: 0.75,
    latitude: 40.7265,
    longitude: -73.9815,
    name: 'East Village',
  },
  {
    intensity: 0.7,
    latitude: 40.7081,
    longitude: -73.9571,
    name: 'Williamsburg',
  },
  {
    intensity: 0.8,
    latitude: 40.7549,
    longitude: -73.9707,
    name: 'Midtown East',
  },
  { intensity: 0.55, latitude: 40.8116, longitude: -73.9465, name: 'Harlem' },
];
const seededFraction = (seed: number) => {
  const value = Math.sin(seed) * 10_000;
  return value - Math.floor(value);
};
const heatmapData = {
  features: demandCenters.flatMap((center, centerIndex) =>
    Array.from({ length: 36 }, (_, pointIndex) => {
      const seed = centerIndex * 100 + pointIndex;
      const angle = seededFraction(seed) * Math.PI * 2;
      const distance = seededFraction(seed + 0.5) * 0.016;
      return {
        geometry: {
          coordinates: [
            center.longitude + Math.cos(angle) * distance,
            center.latitude + Math.sin(angle) * distance * 0.75,
          ],
          type: 'Point' as const,
        },
        properties: {
          weight: 0.3 + seededFraction(seed + 0.25) * 0.7 * center.intensity,
        },
        type: 'Feature' as const,
      };
    }),
  ),
  type: 'FeatureCollection' as const,
};

function HeatLayer() {
  const { isLoaded, map } = useMap();
  useEffect(() => {
    if (!isLoaded || !map) return;
    const addLayer = () => {
      if (map.getSource(heatmapSourceId)) return;
      const beforeId = map
        .getStyle()
        .layers?.find((layer) => layer.type === 'symbol')?.id;
      map.addSource(heatmapSourceId, { data: heatmapData, type: 'geojson' });
      map.addLayer(
        {
          id: heatmapLayerId,
          source: heatmapSourceId,
          type: 'heatmap',
          paint: {
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(66, 133, 244, 0)',
              0.25,
              'rgba(66, 133, 244, 0.4)',
              0.5,
              'rgba(34, 197, 94, 0.55)',
              0.75,
              'rgba(249, 115, 22, 0.7)',
              1,
              'rgba(239, 68, 68, 0.85)',
            ],
            'heatmap-intensity': 0.9,
            'heatmap-opacity': 0.8,
            'heatmap-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              18,
              14,
              40,
            ],
            'heatmap-weight': ['get', 'weight'],
          },
        },
        beforeId,
      );
    };
    if (map.isStyleLoaded()) addLayer();
    else map.once('idle', addLayer);
    return () => {
      map.off('idle', addLayer);
      if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
      if (map.getSource(heatmapSourceId)) map.removeSource(heatmapSourceId);
    };
  }, [isLoaded, map]);
  return null;
}
export const Heatmap: Story = {
  render: () => (
    <div className='relative h-[420px] w-full overflow-hidden rounded-lg border'>
      <Map center={[-73.975, 40.752]} styles={styles} zoom={11.4}>
        <HeatLayer />
        <Map.Controls>
          <Map.ZoomControl />
        </Map.Controls>
      </Map>
      <Card className='bg-overlay shadow-overlay absolute top-3 left-3 z-10 w-[240px] gap-3 p-4'>
        <Card.Header>
          <Card.Title className='text-sm'>Pickup demand</Card.Title>
          <Card.Description>New York · last hour</Card.Description>
        </Card.Header>
        <Card.Content className='gap-2'>
          <div
            className='h-2 w-full rounded-full'
            style={{
              background:
                'linear-gradient(to right, rgba(66, 133, 244, 0.4), rgba(34, 197, 94, 0.55), rgba(249, 115, 22, 0.7), rgba(239, 68, 68, 0.85))',
            }}
          />
          <div className='text-muted flex items-center justify-between text-xs'>
            <span>Low</span>
            <span>High</span>
          </div>
        </Card.Content>
      </Card>
    </div>
  ),
};
