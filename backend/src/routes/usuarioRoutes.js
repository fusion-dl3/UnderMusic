const express = require('express');

const {
  registrarUsuario
} = require('../controllers/usuarioController');

const router = express.Router();

router.post('/registro', registrarUsuario);

module.exports = router;