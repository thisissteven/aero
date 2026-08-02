import { RouterProvider } from '@tanstack/react-router';
import ReactDOM from 'react-dom/client';

import './index.css';

import { router } from './router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />,
);
