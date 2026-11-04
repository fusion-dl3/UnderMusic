const express = require('express');

const {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual,
  obtenerUsuarioPublico,
  actualizarPreferenciasMusicales,
  actualizarPerfilUsuario,
  cambiarCorreoCuenta,
  cambiarPasswordCuenta
} = require('../controllers/usuarioController');

const {
  subirFotoPerfil,
  obtenerFotoPerfil
} = require('../controllers/fotoPerfilController');

const {
  verificarToken
} = require('../middlewares/authMiddleware');

const {
  subirImagenPerfil
} = require('../middlewares/uploadImagenMiddleware');

const router = express.Router();

router.post('/registro', registrarUsuario);
router.post('/login', iniciarSesion);

router.get(
  '/publico/:usuarioId',
  verificarToken,
  obtenerUsuarioPublico
);

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

router.patch(
  '/me/foto-perfil',
  verificarToken,
  subirImagenPerfil.single('foto'),
  subirFotoPerfil
);

router.get(
  '/foto-perfil/:fotoId',
  obtenerFotoPerfil
);

router.patch('/me/correo', verificarToken, cambiarCorreoCuenta);
router.patch('/me/password', verificarToken, cambiarPasswordCuenta);

module.exports = router;