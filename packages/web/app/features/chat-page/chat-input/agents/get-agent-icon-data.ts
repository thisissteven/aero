import {
  Bulb,
  FaceRobot,
  Magnifier,
  PersonWorker,
  PlanetEarth,
} from '@gravity-ui/icons';

export function getAgentIconData(name?: string) {
  switch (name?.toLowerCase()) {
    case 'build':
      return PersonWorker;
    case 'plan':
      return Bulb;
    case 'explore':
      return Magnifier;
    case 'general':
      return PlanetEarth;
    default:
      return FaceRobot;
  }
}
