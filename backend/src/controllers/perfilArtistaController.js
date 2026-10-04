const { ObjectId } = require('mongodb');

const {
  getPerfilesArtistaCollection
} = require('../models/perfilArtistaModel');

const {
  getUsuariosCollection
} = require('../models/usuarioModel');

const {
  GENEROS_MUSICALES
} = require('../constants/generos');
async function obtenerMiPerfilArtista(req, res) {
  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message: 'Esta función está disponible solo para artistas'
      });
    }

    const perfilesArtista = getPerfilesArtistaCollection();

    const perfilArtista = await perfilesArtista.findOne({
      usuarioId: new ObjectId(req.usuario.id)
    });

    if (!perfilArtista) {
      return res.status(200).json({
        perfilArtista: null,
        perfilCompleto: false
      });
    }

    return res.status(200).json({
      perfilArtista: {
        id: perfilArtista._id,
        usuarioId: perfilArtista.usuarioId,
        nombreArtistico: perfilArtista.nombreArtistico,
        biografia: perfilArtista.biografia,
        generoPrincipal: perfilArtista.generoPrincipal,
        generosAdicionales:
          perfilArtista.generosAdicionales || [],
        correoContacto: perfilArtista.correoContacto || '',
        instagram: perfilArtista.instagram || '',
        facebook: perfilArtista.facebook || '',
        twitter: perfilArtista.twitter || '',
        perfilCompleto: perfilArtista.perfilCompleto === true
      }
    });
  } catch (error) {
    console.error(
      'Error al obtener perfil de artista:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}
async function actualizarMiPerfilArtista(req, res) {
  try {
    if (req.usuario.rol !== 'artista') {
      return res.status(403).json({
        message: 'Esta función está disponible solo para artistas'
      });
    }

    const {
      nombreArtistico = '',
      biografia = '',
      generoPrincipal = '',
      generosAdicionales = [],
      correoContacto = '',
      instagram = '',
      facebook = '',
      twitter = ''
    } = req.body;

    if (
      typeof nombreArtistico !== 'string' ||
      typeof biografia !== 'string' ||
      typeof generoPrincipal !== 'string' ||
      typeof correoContacto !== 'string' ||
      typeof instagram !== 'string' ||
      typeof facebook !== 'string' ||
      typeof twitter !== 'string'
    ) {
      return res.status(400).json({
        message: 'Los datos del perfil artístico no son válidos'
      });
    }

    if (!Array.isArray(generosAdicionales)) {
      return res.status(400).json({
        message: 'Los géneros adicionales deben enviarse como una lista'
      });
    }

    const nombreArtisticoNormalizado = nombreArtistico.trim();
    const biografiaNormalizada = biografia.trim();
    const generoPrincipalNormalizado = generoPrincipal.trim();
    if (biografiaNormalizada.length > 500) {
  return res.status(400).json({
    message: 'La biografía no puede superar los 500 caracteres'
  });
}

    const generosAdicionalesNormalizados = [
      ...new Set(
        generosAdicionales
          .filter((genero) => typeof genero === 'string')
          .map((genero) => genero.trim())
          .filter((genero) => genero.length > 0)
      )
    ];

    if (
      generoPrincipalNormalizado &&
      !GENEROS_MUSICALES.includes(generoPrincipalNormalizado)
    ) {
      return res.status(400).json({
        message: 'El género principal no es válido'
      });
    }

    const generosInvalidos = generosAdicionalesNormalizados.filter(
      (genero) => !GENEROS_MUSICALES.includes(genero)
    );

    if (generosInvalidos.length > 0) {
      return res.status(400).json({
        message: 'Uno o más géneros adicionales no son válidos'
      });
    }

    if (generosAdicionalesNormalizados.length > 3) {
      return res.status(400).json({
        message: 'Puedes seleccionar como máximo 3 géneros adicionales'
      });
    }

    if (
      generoPrincipalNormalizado &&
      generosAdicionalesNormalizados.includes(
        generoPrincipalNormalizado
      )
    ) {
      return res.status(400).json({
        message:
          'El género principal no puede repetirse como género adicional'
      });
    }

    const perfilCompleto = Boolean(
      nombreArtisticoNormalizado &&
      biografiaNormalizada &&
      generoPrincipalNormalizado
    );

    const fechaActual = new Date();

    const perfilesArtista = getPerfilesArtistaCollection();

    const perfilArtista = await perfilesArtista.findOneAndUpdate(
      {
        usuarioId: new ObjectId(req.usuario.id)
      },
      {
        $set: {
          nombreArtistico: nombreArtisticoNormalizado,
          biografia: biografiaNormalizada,
          generoPrincipal: generoPrincipalNormalizado,
          generosAdicionales: generosAdicionalesNormalizados,
          correoContacto: correoContacto.trim(),
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          twitter: twitter.trim(),
          perfilCompleto,
          fechaActualizacion: fechaActual
        },
        $setOnInsert: {
          usuarioId: new ObjectId(req.usuario.id),
          fechaCreacion: fechaActual
        }
      },
      {
        upsert: true,
        returnDocument: 'after'
      }
    );

    return res.status(200).json({
      message: perfilCompleto
        ? 'Perfil artístico actualizado correctamente'
        : 'Perfil artístico guardado como incompleto',
      perfilArtista: {
        id: perfilArtista._id,
        usuarioId: perfilArtista.usuarioId,
        nombreArtistico: perfilArtista.nombreArtistico,
        biografia: perfilArtista.biografia,
        generoPrincipal: perfilArtista.generoPrincipal,
        generosAdicionales: perfilArtista.generosAdicionales || [],
        correoContacto: perfilArtista.correoContacto || '',
        instagram: perfilArtista.instagram || '',
        facebook: perfilArtista.facebook || '',
        twitter: perfilArtista.twitter || '',
        perfilCompleto: perfilArtista.perfilCompleto === true
      }
    });
  } catch (error) {
    console.error(
      'Error al actualizar perfil de artista:',
      error
    );

    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

async function obtenerPerfilArtistaPublico(req, res) {
  try {
    const { usuarioId } = req.params;

    if (!ObjectId.isValid(usuarioId)) {
      return res.status(400).json({
        message:
          'El identificador del artista no es válido'
      });
    }

    const usuarios =
      getUsuariosCollection();

    const perfilesArtista =
      getPerfilesArtistaCollection();

    const usuario = await usuarios.findOne({
      _id: new ObjectId(usuarioId),
      rol: 'artista'
    });

    if (!usuario) {
      return res.status(404).json({
        message:
          'No se encontró el artista'
      });
    }

    const perfilArtista =
      await perfilesArtista.findOne({
        usuarioId: usuario._id,
        perfilCompleto: true
      });

    if (!perfilArtista) {
      return res.status(404).json({
        message:
          'El perfil artístico no está disponible'
      });
    }

    return res.status(200).json({
      artista: {
        usuarioId: usuario._id,

        nombreUsuario:
          usuario.nombreUsuario,

        fotoPerfil:
          usuario.fotoPerfil || null,

        ubicacion: {
          pais:
            usuario.ubicacion?.pais || '',
          region:
            usuario.ubicacion?.region || '',
          comuna:
            usuario.ubicacion?.comuna || ''
        },

        nombreArtistico:
          perfilArtista.nombreArtistico,

        biografia:
          perfilArtista.biografia,

        generoPrincipal:
          perfilArtista.generoPrincipal,

        generosAdicionales:
          perfilArtista.generosAdicionales || [],

        correoContacto:
          perfilArtista.correoContacto || '',

        instagram:
          perfilArtista.instagram || '',

        facebook:
          perfilArtista.facebook || '',

        twitter:
          perfilArtista.twitter || ''
      }
    });
  } catch (error) {
    console.error(
      'Error al obtener perfil público de artista:',
      error
    );

    return res.status(500).json({
      message:
        'Error interno del servidor'
    });
  }
}

module.exports = {
  obtenerMiPerfilArtista,
  actualizarMiPerfilArtista,
  obtenerPerfilArtistaPublico
};