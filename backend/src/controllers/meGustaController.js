const { ObjectId } = require('mongodb');
const { intentarNotificar, notificarInteraccion } = require('../services/notificacionesService');

const {
  getMeGustasCollection
} = require('../models/meGustaModel');

const {
  getCancionesCollection
} = require('../models/cancionModel');

async function darMeGusta(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido'
      });
    }

    const usuarioId = new ObjectId(req.usuario.id);
    const cancionObjectId = new ObjectId(cancionId);

    const canciones = getCancionesCollection();

    const cancion = await canciones.findOne({
      _id: cancionObjectId
    });

    if (!cancion) {
      return res.status(404).json({
        message: 'No se encontró la canción'
      });
    }

    const meGustas = getMeGustasCollection();

    const resultadoOperacion = await meGustas.updateOne(
      {
        usuarioId,
        cancionId: cancionObjectId
      },
      {
        $setOnInsert: {
          usuarioId,
          cancionId: cancionObjectId,
          fechaCreacion: new Date()
        }
      },
      {
        upsert: true
      }
    );

    if (resultadoOperacion.upsertedCount) {
      await intentarNotificar(async () => {
        const total = await meGustas.countDocuments({ cancionId: cancionObjectId });
        await notificarInteraccion(cancion, 'hito_me_gusta', total);
      });
    }

    return res.status(200).json({
      message: 'Me gusta registrado correctamente',
      meGusta: true
    });

  } catch (error) {
    console.error('Error al dar Me gusta:', error);

    return res.status(500).json({
      message: 'No fue posible registrar Me gusta'
    });
  }
}

async function quitarMeGusta(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido'
      });
    }

    const usuarioId = new ObjectId(req.usuario.id);

    const meGustas = getMeGustasCollection();

    await meGustas.deleteOne({
      usuarioId,
      cancionId: new ObjectId(cancionId)
    });

    return res.status(200).json({
      message: 'Me gusta eliminado correctamente',
      meGusta: false
    });

  } catch (error) {
    console.error('Error al quitar Me gusta:', error);

    return res.status(500).json({
      message: 'No fue posible quitar Me gusta'
    });
  }
}

async function obtenerMisMeGustas(req, res) {
  try {
    const usuarioId = new ObjectId(req.usuario.id);

    const meGustas = getMeGustasCollection();
    const canciones = getCancionesCollection();

    const registros = await meGustas
      .find({ usuarioId })
      .sort({ fechaCreacion: -1 })
      .toArray();

    const cancionesEncontradas = await canciones
      .find({
        _id: {
          $in: registros.map((registro) => registro.cancionId)
        }
      })
      .toArray();

    const cancionesPorId = new Map(
      cancionesEncontradas.map((cancion) => [
        cancion._id.toString(),
        cancion
      ])
    );

    const resultado = registros
      .map((registro) => {
        const cancion = cancionesPorId.get(
          registro.cancionId.toString()
        );

        if (!cancion) {
          return null;
        }

        return {
          id: cancion._id.toString(),
          usuarioId: cancion.usuarioId.toString(),
          titulo: cancion.titulo,
          album: cancion.album || '',
          generoPrincipal: cancion.generoPrincipal,
          generosSecundarios: cancion.generosSecundarios || [],
          audioId: cancion.audioId || null,
          portadaId: cancion.portadaId || null,
          fechaPublicacion: cancion.fechaPublicacion,
          fechaMeGusta: registro.fechaCreacion
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      canciones: resultado
    });

  } catch (error) {
    console.error('Error al obtener Me gusta:', error);

    return res.status(500).json({
      message: 'No fue posible obtener tus Me gusta'
    });
  }
}

async function obtenerEstadoMeGusta(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido'
      });
    }

    const usuarioId = new ObjectId(req.usuario.id);
    const cancionObjectId = new ObjectId(cancionId);

    const canciones = getCancionesCollection();

    const cancion = await canciones.findOne({
      _id: cancionObjectId
    });

    if (!cancion) {
      return res.status(404).json({
        message: 'No se encontró la canción'
      });
    }

    const meGustas = getMeGustasCollection();

    const registro = await meGustas.findOne({
      usuarioId,
      cancionId: cancionObjectId
    });

    return res.status(200).json({
      cancionId,
      meGusta: Boolean(registro)
    });

  } catch (error) {
    console.error('Error al consultar Me gusta:', error);

    return res.status(500).json({
      message: 'No fue posible consultar Me gusta'
    });
  }
}

module.exports = {
  darMeGusta,
  quitarMeGusta,
  obtenerMisMeGustas,
  obtenerEstadoMeGusta
};