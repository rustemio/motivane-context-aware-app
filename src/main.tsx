import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/young-serif/400.css';
import '@fontsource-variable/shantell-sans/index.css';
import '@fontsource-variable/instrument-sans/index.css';
import './styles.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
