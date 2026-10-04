const express = require('express');

const {
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista,
  obtenerPerfilArtistaPublico
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

router.get(
  '/:usuarioId',
  obtenerPerfilArtistaPublico
);

module.exports = router;