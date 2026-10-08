const express = require('express');

const {
  seguirArtista,
  dejarDeSeguirArtista,
  obtenerEstadoSeguimiento,
  obtenerMisArtistasSeguidos
} = require('../controllers/seguimientoController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const router = express.Router();

router.get(
  '/me/artistas',
  verificarToken,
  obtenerMisArtistasSeguidos
);

router.post(
  '/artistas/:artistaId',
  verificarToken,
  seguirArtista
);

router.delete(
  '/artistas/:artistaId',
  verificarToken,
  dejarDeSeguirArtista
);

router.get(
  '/artistas/:artistaId/estado',
  verificarToken,
  obtenerEstadoSeguimiento
);

module.exports = router;