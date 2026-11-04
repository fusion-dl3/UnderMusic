
const { ObjectId } = require('mongodb');
const { intentarNotificar, notificarInteraccion } = require('../services/notificacionesService');

const {
  getGuardadasCollection,
} = require('../models/guardadaModel');

const {
  getCancionesCollection,
} = require('../models/cancionModel');

// Guardar una canción.
async function guardarCancion(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido.',
      });
    }

    const usuarioId = new ObjectId(req.usuario.id);
    const cancionObjectId = new ObjectId(cancionId);

    const canciones = getCancionesCollection();

    const cancion = await canciones.findOne({
      _id: cancionObjectId,
    });

    if (!cancion) {
      return res.status(404).json({
        message: 'La canción no existe.',
      });
    }

    const guardadas = getGuardadasCollection();

    const resultadoOperacion = await guardadas.updateOne(
      {
        usuarioId,
        cancionId: cancionObjectId,
      },
      {
        $setOnInsert: {
          usuarioId,
          cancionId: cancionObjectId,
          fechaGuardado: new Date(),
        },
      },
      {
        upsert: true,
      }
    );

    if (resultadoOperacion.upsertedCount) {
      await intentarNotificar(async () => {
        const total = await guardadas.countDocuments({ cancionId: cancionObjectId });
        await notificarInteraccion(cancion, 'hito_guardados', total);
      });
    }

    return res.status(200).json({
      message: 'Canción guardada correctamente.',
      guardada: true,
    });
  } catch (error) {
    console.error('Error al guardar canción:', error);

    return res.status(500).json({
      message: 'No fue posible guardar la canción.',
    });
  }
}

// Quitar una canción de Guardadas.
async function quitarCancionGuardada(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido.',
      });
    }

    const usuarioId = new ObjectId(req.usuario.id);
    const cancionObjectId = new ObjectId(cancionId);

    const guardadas = getGuardadasCollection();

    await guardadas.deleteOne({
      usuarioId,
      cancionId: cancionObjectId,
    });

    return res.status(200).json({
      message: 'Canción eliminada de Guardadas.',
      guardada: false,
    });
  } catch (error) {
    console.error('Error al quitar canción guardada:', error);

    return res.status(500).json({
      message: 'No fue posible quitar la canción de Guardadas.',
    });
  }
}

// Obtener todas las canciones guardadas del usuario.
async function obtenerMisGuardadas(req, res) {
  try {
    const usuarioId = new ObjectId(req.usuario.id);

    const guardadas = getGuardadasCollection();
    const canciones = getCancionesCollection();

    const registros = await guardadas
      .find({ usuarioId })
      .sort({ fechaGuardado: -1 })
      .toArray();

    const idsCanciones = registros.map(
      (registro) => registro.cancionId
    );

    const cancionesEncontradas = await canciones
      .find({
        _id: { $in: idsCanciones },
      })
      .toArray();

    const cancionesPorId = new Map(
      cancionesEncontradas.map((cancion) => [
        cancion._id.toString(),
        cancion,
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
          album: cancion.album,
          generoPrincipal: cancion.generoPrincipal,
          generosSecundarios: cancion.generosSecundarios,
          audioId: cancion.audioId,
          portadaId: cancion.portadaId,
          fechaPublicacion: cancion.fechaPublicacion,
          fechaGuardado: registro.fechaGuardado,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      canciones: resultado,
    });
  } catch (error) {
    console.error('Error al obtener canciones guardadas:', error);

    return res.status(500).json({
      message: 'No fue posible obtener tus canciones guardadas.',
    });
  }
}

// Consultar si una canción está guardada.
async function obtenerEstadoGuardada(req, res) {
  try {
    const { cancionId } = req.params;

    if (!ObjectId.isValid(cancionId)) {
      return res.status(400).json({
        message: 'El identificador de la canción no es válido.',
      });
    }

    const usuarioId = new ObjectId(req.usuario.id);
    const cancionObjectId = new ObjectId(cancionId);

    const canciones = getCancionesCollection();

    const cancion = await canciones.findOne({
      _id: cancionObjectId,
    });

    if (!cancion) {
      return res.status(404).json({
        message: 'La canción no existe.',
      });
    }

    const guardadas = getGuardadasCollection();

    const registro = await guardadas.findOne({
      usuarioId,
      cancionId: cancionObjectId,
    });

    return res.status(200).json({
      cancionId,
      guardada: Boolean(registro),
    });
  } catch (error) {
    console.error('Error al consultar canción guardada:', error);

    return res.status(500).json({
      message: 'No fue posible consultar el estado de la canción.',
    });
  }
}

module.exports = {
  guardarCancion,
  quitarCancionGuardada,
  obtenerMisGuardadas,
  obtenerEstadoGuardada,
};
