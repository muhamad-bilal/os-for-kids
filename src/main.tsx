import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PSV from './pages/psv.tsx'
import MAS from './pages/mas.tsx'
import MSV from './pages/msv.tsx'
import Dead from './pages/dead.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/psv" element={<PSV />} />
        <Route path="/mas" element={<MAS />} />
        <Route path="/msv" element={<MSV />} />
        <Route path="/dead" element={<Dead />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
