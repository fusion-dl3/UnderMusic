const express = require('express');

const {
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista,
  obtenerPerfilArtistaPublico,
  buscarArtistas
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
  '/buscar',
  buscarArtistas
);

router.get(
  '/:usuarioId',
  obtenerPerfilArtistaPublico
);

module.exports = router;