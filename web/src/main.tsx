
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Inicio from './pages/Inicio'
import PerfilArtistaPublico from './pages/PerfilArtistaPublico'
import CancionPublica from './pages/CancionPublica'
import './index.css'
import Descargar from './pages/Descargar'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/descargar" element={<Descargar />} />
        <Route
          path="/artista/:usuarioId"
          element={<PerfilArtistaPublico />}
        />
        <Route
          path="/cancion/:cancionId"
          element={<CancionPublica />}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
