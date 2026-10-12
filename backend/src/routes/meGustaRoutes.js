const express = require('express');

const {
  darMeGusta,
  quitarMeGusta,
  obtenerMisMeGustas,
  obtenerEstadoMeGusta
} = require('../controllers/meGustaController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Obtener las canciones que le gustan al usuario.
router.get(
  '/me',
  verificarToken,
  obtenerMisMeGustas
);

// Consultar si una canción tiene Me gusta del usuario.
router.get(
  '/:cancionId/estado',
  verificarToken,
  obtenerEstadoMeGusta
);

// Dar Me gusta a una canción.
router.post(
  '/:cancionId',
  verificarToken,
  darMeGusta
);

// Quitar Me gusta de una canción.
router.delete(
  '/:cancionId',
  verificarToken,
  quitarMeGusta
);

module.exports = router;