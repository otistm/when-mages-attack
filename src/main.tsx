import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initAccessibilityPrefs, subscribeAccessibilitySync } from '@/stores/preferencesStore';

// Detect OS preferences and apply stored settings before first render
initAccessibilityPrefs();
subscribeAccessibilitySync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
