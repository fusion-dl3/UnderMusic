const { ObjectId } = require('mongodb');

const {
  getSeguimientosCollection
} = require('../models/seguimientoModel');

const {
  getUsuariosCollection
} = require('../models/usuarioModel');

const {
  getPerfilesArtistaCollection
} = require('../models/perfilArtistaModel');

async function seguirArtista(req, res) {
  try {
    const { artistaId } = req.params;

    if (!ObjectId.isValid(artistaId)) {
      return res.status(400).json({
        message:
          'El identificador del artista no es válido'
      });
    }

    const seguidorId =
      new ObjectId(req.usuario.id);

    const artistaObjectId =
      new ObjectId(artistaId);

    if (
      seguidorId.equals(artistaObjectId)
    ) {
      return res.status(400).json({
        message:
          'No puedes seguirte a ti mismo'
      });
    }

    const usuarios =
      getUsuariosCollection();

    const perfilesArtista =
      getPerfilesArtistaCollection();

    const seguimientos =
      getSeguimientosCollection();

    const artista = await usuarios.findOne({
      _id: artistaObjectId,
      rol: 'artista'
    });

    if (!artista) {
      return res.status(404).json({
        message:
          'No se encontró el artista'
      });
    }

    const perfilArtista =
      await perfilesArtista.findOne({
        usuarioId: artistaObjectId,
        perfilCompleto: true
      });

    if (!perfilArtista) {
      return res.status(404).json({
        message:
          'El perfil artístico no está disponible'
      });
    }

    const seguimientoExistente =
      await seguimientos.findOne({
        seguidorId,
        artistaId: artistaObjectId
      });

    if (seguimientoExistente) {
      return res.status(200).json({
        message:
          'Ya sigues a este artista',
        siguiendo: true
      });
    }

    await seguimientos.insertOne({
      seguidorId,
      artistaId: artistaObjectId,
      fechaCreacion: new Date()
    });

    const cantidadSeguidores =
      await seguimientos.countDocuments({
        artistaId: artistaObjectId
      });

    return res.status(201).json({
      message:
        'Ahora sigues a este artista',
      siguiendo: true,
      cantidadSeguidores
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({
        message:
          'Ya sigues a este artista',
        siguiendo: true
      });
    }

    console.error(
      'Error al seguir artista:',
      error
    );

    return res.status(500).json({
      message:
        'Error interno del servidor'
    });
  }
}

async function dejarDeSeguirArtista(req, res) {
  try {
    const { artistaId } = req.params;

    if (!ObjectId.isValid(artistaId)) {
      return res.status(400).json({
        message:
          'El identificador del artista no es válido'
      });
    }

    const seguidorId =
      new ObjectId(req.usuario.id);

    const artistaObjectId =
      new ObjectId(artistaId);

    const seguimientos =
      getSeguimientosCollection();

    const resultado =
      await seguimientos.deleteOne({
        seguidorId,
        artistaId: artistaObjectId
      });

    const cantidadSeguidores =
      await seguimientos.countDocuments({
        artistaId: artistaObjectId
      });

    if (resultado.deletedCount === 0) {
      return res.status(200).json({
        message:
          'No seguías a este artista',
        siguiendo: false,
        cantidadSeguidores
      });
    }

    return res.status(200).json({
      message:
        'Dejaste de seguir a este artista',
      siguiendo: false,
      cantidadSeguidores
    });
  } catch (error) {
    console.error(
      'Error al dejar de seguir artista:',
      error
    );

    return res.status(500).json({
      message:
        'Error interno del servidor'
    });
  }
}

async function obtenerEstadoSeguimiento(req, res) {
  try {
    const { artistaId } = req.params;

    if (!ObjectId.isValid(artistaId)) {
      return res.status(400).json({
        message:
          'El identificador del artista no es válido'
      });
    }

    const seguidorId =
      new ObjectId(req.usuario.id);

    const artistaObjectId =
      new ObjectId(artistaId);

    const seguimientos =
      getSeguimientosCollection();

    const seguimiento =
      await seguimientos.findOne({
        seguidorId,
        artistaId: artistaObjectId
      });

    const cantidadSeguidores =
      await seguimientos.countDocuments({
        artistaId: artistaObjectId
      });

    return res.status(200).json({
      siguiendo: Boolean(seguimiento),
      cantidadSeguidores
    });
  } catch (error) {
    console.error(
      'Error al obtener estado de seguimiento:',
      error
    );

    return res.status(500).json({
      message:
        'Error interno del servidor'
    });
  }
}

async function obtenerMisArtistasSeguidos(req, res) {
  try {
    const seguidorId =
      new ObjectId(req.usuario.id);

    const seguimientos =
      getSeguimientosCollection();

    const usuarios =
      getUsuariosCollection();

    const perfilesArtista =
      getPerfilesArtistaCollection();

    const listaSeguimientos =
      await seguimientos
        .find({
          seguidorId
        })
        .sort({
          fechaCreacion: -1
        })
        .toArray();

    if (listaSeguimientos.length === 0) {
      return res.status(200).json({
        artistas: []
      });
    }

    const artistas = [];

    for (const seguimiento of listaSeguimientos) {
      const usuarioArtista =
        await usuarios.findOne({
          _id: seguimiento.artistaId,
          rol: 'artista'
        });

      if (!usuarioArtista) {
        continue;
      }

      const perfilArtista =
        await perfilesArtista.findOne({
          usuarioId: seguimiento.artistaId,
          perfilCompleto: true
        });

      if (!perfilArtista) {
        continue;
      }

      artistas.push({
        usuarioId:
          usuarioArtista._id,

        nombreUsuario:
          usuarioArtista.nombreUsuario,

        fotoPerfil:
          usuarioArtista.fotoPerfil || null,

        nombreArtistico:
          perfilArtista.nombreArtistico,

        generoPrincipal:
          perfilArtista.generoPrincipal,

        generosAdicionales:
          perfilArtista.generosAdicionales || [],

        ubicacion: {
          pais:
            usuarioArtista.ubicacion?.pais || '',
          region:
            usuarioArtista.ubicacion?.region || '',
          comuna:
            usuarioArtista.ubicacion?.comuna || ''
        },

        fechaSeguimiento:
          seguimiento.fechaCreacion
      });
    }

    return res.status(200).json({
      artistas
    });
  } catch (error) {
    console.error(
      'Error al obtener artistas seguidos:',
      error
    );

    return res.status(500).json({
      message:
        'Error interno del servidor'
    });
  }
}

module.exports = {
  seguirArtista,
  dejarDeSeguirArtista,
  obtenerEstadoSeguimiento,
  obtenerMisArtistasSeguidos
};