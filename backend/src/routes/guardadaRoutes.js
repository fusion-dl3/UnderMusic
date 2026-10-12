
const express = require('express');

const {
  guardarCancion,
  quitarCancionGuardada,
  obtenerMisGuardadas,
  obtenerEstadoGuardada,
} = require('../controllers/guardadaController');

const {
  verificarToken,
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Obtener las canciones guardadas del usuario autenticado.
router.get(
  '/me',
  verificarToken,
  obtenerMisGuardadas
);

// Consultar si una canción está guardada.
router.get(
  '/:cancionId/estado',
  verificarToken,
  obtenerEstadoGuardada
);

// Guardar una canción.
router.post(
  '/:cancionId',
  verificarToken,
  guardarCancion
);

// Quitar una canción de Guardadas.
router.delete(
  '/:cancionId',
  verificarToken,
  quitarCancionGuardada
);

module.exports = router;
