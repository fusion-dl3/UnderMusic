const express = require('express');

const {
  publicarCancion,
  subirPortadaCancion,
  obtenerMisCanciones,
  obtenerCancionesArtista,
  obtenerPortadaCancion,
  obtenerAudioCancion
} = require('../controllers/cancionController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

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

module.exports = router;