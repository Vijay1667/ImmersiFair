import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { msalConfig } from './components/AuthConfig.tsx';

import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MainCharacter from './characters/mainCharacter.tsx';

const msalInstance = new PublicClientApplication(msalConfig);

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <MsalProvider instance={msalInstance}>
    <BrowserRouter>
      <Routes>
        <Route index element={<App />}/>
        <Route path='/ImmersiFair' element={<MainCharacter/>}/>
      </Routes>
    </BrowserRouter>
  </MsalProvider>
  // </StrictMode>,
)
