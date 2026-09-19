import { Markdown } from '@aero/ui';
import { createFileRoute } from '@tanstack/react-router';

const text = `
continue with the task please.\n\nElement from http://localhost:59099/\r\n- Selector: \`body.dark-mode > main.main-content.container > div.editorial-grid:nth-of-type(2) > section.feed-section\`\r\n- Tag: <section>\r\n- Classes: feed-section\r\n- Text: "Latest Stories SHOWING ALL 9 AVAILABLE STORIES SCIENCE NASA Exoplanet Explorer Confirms Water Vapor in Atmosphere of Kepler-186f In a groundbreaking cosmic revelation, astronomical spectrographic analysis has identified definitive atmospheric water signatures on an Earth-sized planet orbiting in a distant habitable zone. Dr. Elena Rostova • Sept 11, 2026 • 6 min read TECH The Silicon Renaissance: Quantum Computing Enters Commercial Cloud Frameworks Top technology providers are rolling out standa..."\r\n- Mode: element\r\n- Bounds: 24, 336 - 427 x 5110\r\n- Note: "also display in grids of two on larger screens"
`;

export const Route = createFileRoute('/_app/plugins/')({
  component: () => <Markdown id='text'>{text}</Markdown>,
});
