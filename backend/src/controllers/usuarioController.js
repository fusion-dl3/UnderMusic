const bcrypt = require('bcryptjs');

const { getUsuariosCollection } = require('../models/usuarioModel');

const {
  normalizarNombreUsuario,
  normalizarCorreo,
  esNombreUsuarioValido,
  esCorreoValido
} = require('../utils/usuarioUtils');

async function registrarUsuario(req, res) {
  try {
    const {
      nombreUsuario,
      correoCuenta,
      password,
      rol,
      pais,
      region,
      comuna,
      priorizarComuna
    } = req.body;

    if (
      !nombreUsuario ||
      !correoCuenta ||
      !password ||
      !rol ||
      !pais ||
      !region ||
      !comuna
    ) {
      return res.status(400).json({
        message: 'Todos los campos obligatorios deben ser completados'
      });
    }

    const nombreUsuarioNormalizado =
      normalizarNombreUsuario(nombreUsuario);

    const correoNormalizado =
      normalizarCorreo(correoCuenta);

    if (!esNombreUsuarioValido(nombreUsuarioNormalizado)) {
      return res.status(400).json({
        message:
          'El nombre de usuario debe tener entre 1 y 30 caracteres y solo puede contener letras, numeros, ñ, punto, guion y guion bajo'
      });
    }

    if (!esCorreoValido(correoNormalizado)) {
      return res.status(400).json({
        message: 'El correo electronico no es valido'
      });
    }

    if (rol !== 'oyente' && rol !== 'artista') {
      return res.status(400).json({
        message: 'El rol debe ser oyente o artista'
      });
    }
    if (typeof priorizarComuna !== 'boolean') {
     return res.status(400).json({
        message: 'Debes indicar si deseas priorizar artistas de tu comuna'
    });
    }
    if (password.length < 6) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const usuarios = getUsuariosCollection();

    const usuarioExistente = await usuarios.findOne({
      $or: [
        { nombreUsuario: nombreUsuarioNormalizado },
        { correoCuenta: correoNormalizado }
      ]
    });

    if (usuarioExistente) {
      if (
        usuarioExistente.nombreUsuario ===
        nombreUsuarioNormalizado
      ) {
        return res.status(409).json({
          message: 'El nombre de usuario ya esta registrado'
        });
      }

      return res.status(409).json({
        message: 'El correo electronico ya esta registrado'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const fechaActual = new Date();

    const nuevoUsuario = {
      nombreUsuario: nombreUsuarioNormalizado,
      correoCuenta: correoNormalizado,
      passwordHash,
      rol,
      fotoPerfil: null,

      ubicacion: {
        pais: pais.trim(),
        region: region.trim(),
        comuna: comuna.trim()
      },

      generosFavoritos: [],
      priorizarComuna,

      fechaCreacion: fechaActual,
      fechaActualizacion: fechaActual
    };

    const resultado = await usuarios.insertOne(nuevoUsuario);

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      usuario: {
        id: resultado.insertedId,
        nombreUsuario: nuevoUsuario.nombreUsuario,
        correoCuenta: nuevoUsuario.correoCuenta,
        rol: nuevoUsuario.rol,
        fotoPerfil: nuevoUsuario.fotoPerfil,
        ubicacion: nuevoUsuario.ubicacion,
        generosFavoritos: nuevoUsuario.generosFavoritos,
        priorizarComuna: nuevoUsuario.priorizarComuna,
        fechaCreacion: nuevoUsuario.fechaCreacion
      }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

module.exports = {
  registrarUsuario
};