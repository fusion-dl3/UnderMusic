const express = require('express');

const {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual
} = require('../controllers/usuarioController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/registro', registrarUsuario);
router.post('/login', iniciarSesion);

router.get(
  '/me',
  verificarToken,
  obtenerUsuarioActual
);

module.exports = router;