const express = require('express');

const {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual,
  actualizarPreferenciasMusicales,
  actualizarPerfilUsuario
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

router.patch(
  '/me/perfil',
  verificarToken,
  actualizarPerfilUsuario
);

module.exports = router;