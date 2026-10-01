import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { splitFromPath } from './split/splits';
import { initSplit, startSplitClient } from './split/store';
import './styles/index.css';

// The split comes from the address alone, so the first client render matches the prerendered HTML.
initSplit(splitFromPath(location.pathname));

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Built pages arrive prerendered and are hydrated; the dev server sends an empty root.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);

startSplitClient();
