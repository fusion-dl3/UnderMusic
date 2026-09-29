const express = require('express');

const {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual,
  actualizarPreferenciasMusicales
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
router.patch(
  '/me/preferencias-musicales',
  verificarToken,
  actualizarPreferenciasMusicales
);

module.exports = router;