
const express = require('express');

const {
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista,
  actualizarCancionesDestacadas,
  obtenerPerfilArtistaPublico,
  buscarArtistas,
} = require('../controllers/perfilArtistaController');

const {
  obtenerArtistasDestacados,
} = require('../controllers/destacadosController');

const {
  obtenerArtistasRecomendados,
} = require('../controllers/recomendadosController');

const {
  obtenerArtistasCercanos,
} = require('../controllers/cercanosController');

const {
  verificarToken,
} = require('../middlewares/authMiddleware');

const { obtenerEstadisticasArtista } = require('../controllers/estadisticasArtistaController');

const router = express.Router();

// Perfil del artista autenticado.
router.get(
  '/me',
  verificarToken,
  obtenerMiPerfilArtista
);

router.patch(
  '/me',
  verificarToken,
  actualizarMiPerfilArtista
);

// Canciones fijadas manualmente en el Top 3 del perfil.
router.patch(
  '/me/canciones-destacadas',
  verificarToken,
  actualizarCancionesDestacadas
);

// Artistas destacados personalizados.
router.get(
  '/destacados',
  verificarToken,
  obtenerArtistasDestacados
);

// Artistas recomendados según crecimiento reciente.
router.get(
  '/recomendados',
  verificarToken,
  obtenerArtistasRecomendados
);

// Artistas cercanos según la ubicación del usuario.
router.get(
  '/cercanos',
  verificarToken,
  obtenerArtistasCercanos
);

// Búsqueda de artistas.
router.get('/buscar', buscarArtistas);

// Estadísticas públicas del artista. Registrar antes de /:usuarioId.
router.get('/:usuarioId/estadisticas', obtenerEstadisticasArtista);

// Perfil público de un artista.
// Esta ruta debe permanecer después de las rutas específicas.
router.get('/:usuarioId', obtenerPerfilArtistaPublico);

module.exports = router;
