const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const { getUsuariosCollection } = require('../models/usuarioModel');
const {
  GENEROS_MUSICALES
} = require('../constants/generos');
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
      priorizarComuna,
      generosFavoritos = []
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

    if (!Array.isArray(generosFavoritos)) {
      return res.status(400).json({
        message: 'Los generos favoritos deben enviarse como una lista'
      });
    }

    const generosNormalizados = [
      ...new Set(
        generosFavoritos
          .filter((genero) => typeof genero === 'string')
          .map((genero) => genero.trim())
          .filter((genero) => genero.length > 0)
      )
    ];

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

      generosFavoritos: generosNormalizados,
      priorizarComuna,

      fechaCreacion: fechaActual,
      fechaActualizacion: fechaActual
    };

    const resultado = await usuarios.insertOne(nuevoUsuario);

    const token = jwt.sign(
      {
        id: resultado.insertedId.toString(),
        rol: nuevoUsuario.rol
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '30d'
      }
    );

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      token,
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
    if (error && error.code === 11000) {
      return res.status(409).json({
        message: 'El nombre de usuario o correo electronico ya esta registrado'
      });
    }

    console.error('Error al registrar usuario:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

async function iniciarSesion(req, res) {
  try {
    const {
      correoCuenta,
      password
    } = req.body;

    if (!correoCuenta || !password) {
      return res.status(400).json({
        message: 'Correo y contraseña son obligatorios'
      });
    }

    const correoNormalizado =
      normalizarCorreo(correoCuenta);

    const usuarios = getUsuariosCollection();

    const usuario = await usuarios.findOne({
      correoCuenta: correoNormalizado
    });

    if (!usuario) {
      return res.status(401).json({
        message: 'Correo o contraseña incorrectos'
      });
    }

    const passwordCorrecta = await bcrypt.compare(
      password,
      usuario.passwordHash
    );

    if (!passwordCorrecta) {
      return res.status(401).json({
        message: 'Correo o contraseña incorrectos'
      });
    }

    const token = jwt.sign(
      {
        id: usuario._id.toString(),
        rol: usuario.rol
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '30d'
      }
    );

    return res.status(200).json({
      message: 'Inicio de sesion correcto',
      token,
      usuario: {
        id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        correoCuenta: usuario.correoCuenta,
        rol: usuario.rol,
        fotoPerfil: usuario.fotoPerfil,
        ubicacion: usuario.ubicacion,
        generosFavoritos: usuario.generosFavoritos,
        priorizarComuna: usuario.priorizarComuna
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesion:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

async function obtenerUsuarioActual(req, res) {
  try {
    const usuarios = getUsuariosCollection();

    const usuario = await usuarios.findOne({
      _id: new ObjectId(req.usuario.id)
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      usuario: {
        id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        correoCuenta: usuario.correoCuenta,
        rol: usuario.rol,
        fotoPerfil: usuario.fotoPerfil,
        ubicacion: usuario.ubicacion,
        generosFavoritos: usuario.generosFavoritos,
        priorizarComuna: usuario.priorizarComuna,
        fechaCreacion: usuario.fechaCreacion
      }
    });
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}
async function actualizarPreferenciasMusicales(req, res) {
  try {
    const {
      generosFavoritos
    } = req.body;

    if (!Array.isArray(generosFavoritos)) {
      return res.status(400).json({
        message: 'Los generos favoritos deben enviarse como una lista'
      });
    }

    const generosNormalizados = [
      ...new Set(
        generosFavoritos
          .filter((genero) => typeof genero === 'string')
          .map((genero) => genero.trim())
          .filter((genero) => genero.length > 0)
      )
    ];

    const generosInvalidos = generosNormalizados.filter(
      (genero) => !GENEROS_MUSICALES.includes(genero)
    );

    if (generosInvalidos.length > 0) {
      return res.status(400).json({
        message: 'Uno o mas generos musicales no son validos'
      });
    }

    const usuarios = getUsuariosCollection();

    const resultado = await usuarios.findOneAndUpdate(
      {
        _id: new ObjectId(req.usuario.id)
      },
      {
        $set: {
          generosFavoritos: generosNormalizados,
          fechaActualizacion: new Date()
        }
      },
      {
        returnDocument: 'after'
      }
    );

    if (!resultado) {
      return res.status(404).json({
        message: 'Usuario no encontrado'
      });
    }

    return res.status(200).json({
      message: 'Preferencias musicales actualizadas correctamente',
      generosFavoritos: resultado.generosFavoritos
    });
  } catch (error) {
    console.error(
      'Error al actualizar preferencias musicales:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}
module.exports = {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual,
  actualizarPreferenciasMusicales
};