import type { Schema } from 'hast-util-sanitize';

export const svgSanitizeSchema: Schema = {
  tagNames: [
    'svg',
    'g',
    'path',
    'circle',
    'ellipse',
    'rect',
    'line',
    'polyline',
    'polygon',
    'text',
    'tspan',
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
    'clipPath',
    'mask',
    'use',
    'title',
    'desc',
  ],
  attributes: {
    '*': [
      'className',
      'style',
      'id',
      'transform',
      'fill',
      'stroke',
      'strokeWidth',
      'opacity',
    ],
    svg: ['viewBox', 'width', 'height', 'xmlns', 'preserveAspectRatio'],
    path: ['d'],
    circle: ['cx', 'cy', 'r'],
    ellipse: ['cx', 'cy', 'rx', 'ry'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
    line: ['x1', 'y1', 'x2', 'y2'],
    polyline: ['points'],
    polygon: ['points'],
    text: ['x', 'y', 'textAnchor', 'dominantBaseline'],
    linearGradient: ['x1', 'y1', 'x2', 'y2', 'gradientUnits'],
    radialGradient: ['cx', 'cy', 'r', 'gradientUnits'],
    stop: ['offset', 'stopColor', 'stopOpacity'],
    use: ['href', 'xlinkHref'],
  },
  // no `script`, no `foreignObject`, no event-handler attrs (on*) anywhere —
  // this is intentionally narrower than the defaultSchema-merged version
  // used for inline <svg> in prose, since fenced svg blocks are more likely
  // to carry attacker- or model-hallucinated content wholesale
};
