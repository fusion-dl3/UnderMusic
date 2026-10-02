const express = require('express');

const {
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista
} = require('../controllers/perfilArtistaController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const router = express.Router();

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

module.exports = router;