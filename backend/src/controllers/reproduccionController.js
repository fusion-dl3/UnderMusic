
const { ObjectId } = require('mongodb');
const { intentarNotificar, notificarInteraccion } = require('../services/notificacionesService');

const {
  getReproduccionesCollection,
} = require('../models/reproduccionModel');

const {
  getCancionesCollection,
} = require('../models/cancionModel');

const {
  getPerfilesArtistaCollection,
} = require('../models/perfilArtistaModel');

// Registrar una reproducción válida de una canción.
async function registrarReproduccion(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { cancionId } = req.body || {};

    if (
      typeof cancionId !== 'string' ||
      !ObjectId.isValid(cancionId)
    ) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido',
      });
    }

    const cancion = await getCancionesCollection().findOne({
      _id: new ObjectId(cancionId),
    });

    if (!cancion) {
      return res.status(404).json({
        message: 'No se encontró la canción',
      });
    }

    const perfil = await getPerfilesArtistaCollection().findOne({
      usuarioId: cancion.usuarioId,
      perfilCompleto: true,
    });

    if (!perfil) {
      return res.status(404).json({
        message: 'La canción no está disponible',
      });
    }

    await getReproduccionesCollection().insertOne({
      usuarioId: new ObjectId(usuarioId),
      cancionId: cancion._id,
      artistaId: cancion.usuarioId,
      fechaEscucha: new Date(),
    });

    await intentarNotificar(async () => {
      const total = await getReproduccionesCollection().countDocuments({ cancionId: cancion._id });
      await notificarInteraccion(cancion, 'hito_reproducciones', total);
    });

    return res.status(201).json({
      message: 'Reproducción registrada correctamente',
    });
  } catch (error) {
    console.error('Error al registrar reproducción:', error);

    return res.status(500).json({
      message: 'No fue posible registrar la reproducción',
    });
  }
}

// Obtener las últimas cinco canciones distintas escuchadas.
async function obtenerEscuchadasRecientemente(req, res) {
  try {
    const usuarioId = new ObjectId(req.usuario.id);

    const historial = await getReproduccionesCollection()
      .aggregate([
        {
          $match: {
            usuarioId,
          },
        },
        {
          $sort: {
            fechaEscucha: -1,
            _id: -1,
          },
        },
        {
          $group: {
            _id: '$cancionId',
            fechaEscucha: {
              $first: '$fechaEscucha',
            },
            reproduccionId: {
              $first: '$_id',
            },
          },
        },
        {
          $sort: {
            fechaEscucha: -1,
            reproduccionId: -1,
          },
        },
        {
          $lookup: {
            from: 'canciones',
            localField: '_id',
            foreignField: '_id',
            as: 'cancion',
          },
        },
        {
          $unwind: '$cancion',
        },
        {
          $lookup: {
            from: 'perfilesArtista',
            localField: 'cancion.usuarioId',
            foreignField: 'usuarioId',
            as: 'perfilArtista',
          },
        },
        {
          $unwind: '$perfilArtista',
        },
        {
          $match: {
            'perfilArtista.perfilCompleto': true,
          },
        },
        {
          $sort: {
            fechaEscucha: -1,
            reproduccionId: -1,
          },
        },
        {
          $limit: 5,
        },
        {
          $project: {
            _id: 0,
            id: {
              $toString: '$cancion._id',
            },
            usuarioId: {
              $toString: '$cancion.usuarioId',
            },
            titulo: '$cancion.titulo',
            album: {
              $ifNull: ['$cancion.album', ''],
            },
            generoPrincipal: '$cancion.generoPrincipal',
            audioId: '$cancion.audioId',
            portadaId: '$cancion.portadaId',
            nombreArtistico: '$perfilArtista.nombreArtistico',
            fechaEscucha: 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      canciones: historial,
    });
  } catch (error) {
    console.error('Error al obtener historial de escucha:', error);

    return res.status(500).json({
      message: 'No fue posible obtener el historial de escucha',
    });
  }
}

module.exports = {
  registrarReproduccion,
  obtenerEscuchadasRecientemente,
};
