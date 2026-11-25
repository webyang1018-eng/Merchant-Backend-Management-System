import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { PetCompanionView } from './PetCompanionView';

// Ensure transparent canvas inside frameless Tauri pet window
document.documentElement.style.background = 'transparent';
document.body.style.background = 'transparent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PetCompanionView />
  </StrictMode>
);
