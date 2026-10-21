
const express = require('express');

const {
  registrarReproduccion,
  obtenerEscuchadasRecientemente
} = require('../controllers/reproduccionController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Registrar una reproducción válida.
router.post(
  '/',
  verificarToken,
  registrarReproduccion
);

// Obtener las tres canciones distintas
// escuchadas recientemente.
router.get(
  '/recientes',
  verificarToken,
  obtenerEscuchadasRecientemente
);

module.exports = router;
