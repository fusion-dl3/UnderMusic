const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const { getUsuariosCollection } = require('../models/usuarioModel');
const {
  GENEROS_MUSICALES
} = require('../constants/generos');
const {
  esUbicacionValida
} = require('../constants/ubicaciones');
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
const paisNormalizado = pais.trim();
const regionNormalizada = region.trim();
const comunaNormalizada = comuna.trim();

if (
  !esUbicacionValida(
    paisNormalizado,
    regionNormalizada,
    comunaNormalizada
  )
) {
  return res.status(400).json({
    message: 'La ubicación seleccionada no es válida'
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

    const generosInvalidos = generosNormalizados.filter(
      (genero) => !GENEROS_MUSICALES.includes(genero)
    );

    if (generosInvalidos.length > 0) {
      return res.status(400).json({
        message: 'Uno o mas generos musicales no son validos'
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
  pais: paisNormalizado,
  region: regionNormalizada,
  comuna: comunaNormalizada
},

      generosFavoritos: generosNormalizados,
priorizarComuna,
mostrarUbicacion: false,

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
        mostrarUbicacion: nuevoUsuario.mostrarUbicacion,
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
        priorizarComuna: usuario.priorizarComuna,
        mostrarUbicacion: usuario.mostrarUbicacion === true
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
        mostrarUbicacion: usuario.mostrarUbicacion === true,
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

async function actualizarPerfilUsuario(req, res) {
  try {
    const {
      nombreUsuario,
      pais,
      region,
      comuna,
      generosFavoritos,
      priorizarComuna,
      mostrarUbicacion
    } = req.body;
    if (typeof mostrarUbicacion !== 'boolean') {
  return res.status(400).json({
    message: 'La preferencia de privacidad de ubicación no es válida'
  });
}

    if (
      typeof nombreUsuario !== 'string' ||
      typeof pais !== 'string' ||
      typeof region !== 'string' ||
      typeof comuna !== 'string'
    ) {
      return res.status(400).json({
        message: 'Los datos del perfil no son validos'
      });
    }

    if (
      !nombreUsuario.trim() ||
      !pais.trim() ||
      !region.trim() ||
      !comuna.trim()
    ) {
      return res.status(400).json({
        message: 'Nombre de usuario y ubicacion son obligatorios'
      });
    }
const paisNormalizado = pais.trim();
const regionNormalizada = region.trim();
const comunaNormalizada = comuna.trim();

if (
  !esUbicacionValida(
    paisNormalizado,
    regionNormalizada,
    comunaNormalizada
  )
) {
  return res.status(400).json({
    message: 'La ubicación seleccionada no es válida'
  });
}
    if (!Array.isArray(generosFavoritos)) {
      return res.status(400).json({
        message: 'Los generos favoritos deben enviarse como una lista'
      });
    }

    if (typeof priorizarComuna !== 'boolean') {
      return res.status(400).json({
        message: 'La preferencia de comuna no es valida'
      });
    }

    const nombreUsuarioNormalizado =
      normalizarNombreUsuario(nombreUsuario);

    if (!esNombreUsuarioValido(nombreUsuarioNormalizado)) {
      return res.status(400).json({
        message:
          'El nombre de usuario debe tener entre 1 y 30 caracteres y solo puede contener letras, numeros, ñ, punto, guion y guion bajo'
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

    const usuarioConMismoNombre = await usuarios.findOne({
      nombreUsuario: nombreUsuarioNormalizado,
      _id: {
        $ne: new ObjectId(req.usuario.id)
      }
    });

    if (usuarioConMismoNombre) {
      return res.status(409).json({
        message: 'El nombre de usuario ya esta registrado'
      });
    }

    const resultado = await usuarios.findOneAndUpdate(
      {
        _id: new ObjectId(req.usuario.id)
      },
      {
        $set: {
          nombreUsuario: nombreUsuarioNormalizado,
          ubicacion: {
  pais: paisNormalizado,
  region: regionNormalizada,
  comuna: comunaNormalizada
},
          generosFavoritos: generosNormalizados,
          priorizarComuna,
          mostrarUbicacion,
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
      message: 'Perfil actualizado correctamente',
      usuario: {
        id: resultado._id,
        nombreUsuario: resultado.nombreUsuario,
        correoCuenta: resultado.correoCuenta,
        rol: resultado.rol,
        fotoPerfil: resultado.fotoPerfil,
        ubicacion: resultado.ubicacion,
        generosFavoritos: resultado.generosFavoritos,
        priorizarComuna: resultado.priorizarComuna,
        mostrarUbicacion: resultado.mostrarUbicacion
      }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        message: 'El nombre de usuario ya esta registrado'
      });
    }

    console.error('Error al actualizar perfil:', error);

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}


// Cambios de credenciales de la cuenta (beta: sin verificación de correo).
async function cambiarCorreoCuenta(req, res) {
  try {
    const { correoCuenta, passwordActual } = req.body || {};
    if (typeof correoCuenta !== 'string' || typeof passwordActual !== 'string' || !passwordActual) {
      return res.status(400).json({ message: 'Nuevo correo y contraseña actual son obligatorios' });
    }
    const correoNormalizado = normalizarCorreo(correoCuenta);
    if (!esCorreoValido(correoNormalizado)) {
      return res.status(400).json({ message: 'El correo electrónico no es válido' });
    }
    const usuarios = getUsuariosCollection();
    const id = new ObjectId(req.usuario.id);
    const usuario = await usuarios.findOne({ _id: id });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!(await bcrypt.compare(passwordActual, usuario.passwordHash))) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }
    if (usuario.correoCuenta === correoNormalizado) {
      return res.status(400).json({ message: 'El correo nuevo debe ser distinto al actual' });
    }
    const duplicado = await usuarios.findOne({ correoCuenta: correoNormalizado, _id: { $ne: id } });
    if (duplicado) return res.status(409).json({ message: 'El correo electrónico ya está registrado' });
    await usuarios.updateOne({ _id: id }, { $set: { correoCuenta: correoNormalizado, fechaActualizacion: new Date() } });
    return res.status(200).json({ message: 'Correo actualizado correctamente', correoCuenta: correoNormalizado });
  } catch (error) {
    if (error && error.code === 11000) return res.status(409).json({ message: 'El correo electrónico ya está registrado' });
    console.error('Error al cambiar correo:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function cambiarPasswordCuenta(req, res) {
  try {
    const { passwordActual, passwordNueva } = req.body || {};
    if (typeof passwordActual !== 'string' || typeof passwordNueva !== 'string' || !passwordActual) {
      return res.status(400).json({ message: 'Contraseña actual y nueva son obligatorias' });
    }
    if (passwordNueva.length < 6) {
      return res.status(400).json({ message: 'La contraseña nueva debe tener al menos 6 caracteres' });
    }
    if (passwordActual === passwordNueva) {
      return res.status(400).json({ message: 'La contraseña nueva debe ser distinta a la actual' });
    }
    const usuarios = getUsuariosCollection();
    const id = new ObjectId(req.usuario.id);
    const usuario = await usuarios.findOne({ _id: id });
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!(await bcrypt.compare(passwordActual, usuario.passwordHash))) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
    }
    const passwordHash = await bcrypt.hash(passwordNueva, 10);
    await usuarios.updateOne({ _id: id }, { $set: { passwordHash, fechaActualizacion: new Date() } });
    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

module.exports = {
  registrarUsuario,
  iniciarSesion,
  obtenerUsuarioActual,
  actualizarPreferenciasMusicales,
  actualizarPerfilUsuario,
  cambiarCorreoCuenta,
  cambiarPasswordCuenta
};