import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('kgh-offline-ready'));
    },
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('kgh-sw-update'));
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
