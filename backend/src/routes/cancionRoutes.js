const express = require('express');

const {
  publicarCancion,
  editarCancion,
  eliminarCancion,
  subirPortadaCancion,
  obtenerMisCanciones,
  obtenerCancionesArtista,
  obtenerCancionPublica,
  obtenerPortadaCancion,
  obtenerAudioCancion,
  obtenerGenerosDisponibles,
  obtenerArtistasPorGenero
} = require('../controllers/cancionController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const {
  obtenerLanzamientosRecientes
} = require('../controllers/lanzamientosController');

const {
  subirArchivosCancion
} = require('../middlewares/uploadCancionMiddleware');

const router = express.Router();

router.post(
  '/',
  verificarToken,
  subirArchivosCancion,
  publicarCancion
);

router.get(
  '/me',
  verificarToken,
  obtenerMisCanciones
);

router.get(
  '/artista/:usuarioId',
  obtenerCancionesArtista
);

router.get(
  '/portadas/:portadaId',
  obtenerPortadaCancion
);

router.get(
  '/audio/:audioId',
  obtenerAudioCancion
);

router.patch(
  '/:cancionId/portada',
  verificarToken,
  subirArchivosCancion,
  subirPortadaCancion
);

router.get(
  '/generos/disponibles',
  obtenerGenerosDisponibles
);

router.get(
  '/generos/artistas',
  obtenerArtistasPorGenero
);

// Lanzamientos recientes personalizados para el usuario.
router.get(
  '/lanzamientos-recientes',
  verificarToken,
  obtenerLanzamientosRecientes
);

router.patch('/:cancionId', verificarToken, editarCancion);
router.delete('/:cancionId', verificarToken, eliminarCancion);

router.get(
  '/:cancionId',
  obtenerCancionPublica
);

module.exports = router;