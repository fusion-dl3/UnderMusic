
const { ObjectId } = require('mongodb');
const { getNotificacionesCollection } = require('../models/notificacionModel');
const { getUsuariosCollection } = require('../models/usuarioModel');
const { getCancionesCollection } = require('../models/cancionModel');

const filtroUsuario = req => ({
  usuarioId: new ObjectId(req.usuario.id),
  fechaExpiracion: { $gt: new Date() }
});

// Agregar imágenes y datos del usuario sin modificar
// las notificaciones almacenadas en MongoDB.
async function agregarImagenes(notificaciones) {
  const usuariosIds = new Set();
  const cancionesIds = new Set();

  for (const n of notificaciones) {
    if (
      n.tipo === 'nuevo_seguidor' &&
      n.accion?.usuarioId &&
      ObjectId.isValid(n.accion.usuarioId)
    ) {
      usuariosIds.add(n.accion.usuarioId.toString());
    }

    if (
      ['nuevo_lanzamiento', 'hito_me_gusta', 'hito_guardados', 'hito_reproducciones'].includes(n.tipo) &&
      n.accion?.cancionId &&
      ObjectId.isValid(n.accion.cancionId)
    ) {
      cancionesIds.add(n.accion.cancionId.toString());

      if (
        n.accion.artistaId &&
        ObjectId.isValid(n.accion.artistaId)
      ) {
        usuariosIds.add(n.accion.artistaId.toString());
      }
    }
  }

  const [usuarios, canciones] = await Promise.all([
    usuariosIds.size
      ? getUsuariosCollection()
          .find(
            {
              _id: {
                $in: [...usuariosIds].map(id => new ObjectId(id))
              }
            },
            {
              projection: {
                nombreUsuario: 1,
                fotoPerfil: 1
              }
            }
          )
          .toArray()
      : [],

    cancionesIds.size
      ? getCancionesCollection()
          .find(
            {
              _id: {
                $in: [...cancionesIds].map(id => new ObjectId(id))
              }
            },
            {
              projection: {
                portadaId: 1
              }
            }
          )
          .toArray()
      : []
  ]);

  const usuariosPorId = new Map(
    usuarios.map(u => [u._id.toString(), u])
  );

  const cancionesPorId = new Map(
    canciones.map(c => [c._id.toString(), c])
  );

  return notificaciones.map(n => {
    let imagen = null;
    let actor = null;

    if (
      n.tipo === 'nuevo_seguidor' &&
      n.accion?.usuarioId
    ) {
      const usuario = usuariosPorId.get(
        n.accion.usuarioId.toString()
      );

      if (usuario?.fotoPerfil) {
        imagen = {
          tipo: 'perfil',
          id: usuario.fotoPerfil.toString()
        };
      }

      if (usuario?.nombreUsuario) {
        actor = {
          usuarioId: usuario._id.toString(),
          nombre: usuario.nombreUsuario
        };
      }
    } else if (
      n.accion?.cancionId &&
      ['nuevo_lanzamiento', 'hito_me_gusta', 'hito_guardados', 'hito_reproducciones'].includes(n.tipo)
    ) {
      const cancion = cancionesPorId.get(
        n.accion.cancionId.toString()
      );

      const artista = n.accion.artistaId
        ? usuariosPorId.get(n.accion.artistaId.toString())
        : null;

      // Prioridad 1: portada de la canción.
      if (cancion?.portadaId) {
        imagen = {
          tipo: 'portada',
          id: cancion.portadaId.toString()
        };
      }
      // Prioridad 2: fotografía del artista.
      else if (cancion && artista?.fotoPerfil) {
        imagen = {
          tipo: 'perfil',
          id: artista.fotoPerfil.toString()
        };
      }

      if (
        n.tipo === 'nuevo_lanzamiento' &&
        artista?.nombreUsuario
      ) {
        actor = {
          usuarioId: artista._id.toString(),
          nombre: artista.nombreUsuario
        };
      }
    }

    return {
      ...n,
      imagen,
      actor
    };
  });
}

async function listar(req, res) {
  try {
    const limite = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limite, 10) || 30)
    );

    const pagina = Math.min(
      1000,
      Math.max(1, Number.parseInt(req.query.pagina, 10) || 1)
    );

    const filtro = filtroUsuario(req);
    const col = getNotificacionesCollection();

    const [notificaciones, noLeidas] = await Promise.all([
      col.find(filtro)
        .sort({ fechaCreacion: -1, _id: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .toArray(),

      col.countDocuments({
        ...filtro,
        leida: false
      })
    ]);

    let notificacionesConImagenes;

    try {
      notificacionesConImagenes = await agregarImagenes(
        notificaciones
      );
    } catch (e) {
      console.error(
        '[notificaciones] Error al consultar imágenes:',
        e
      );

      notificacionesConImagenes = notificaciones.map(n => ({
        ...n,
        imagen: null,
        actor: null
      }));
    }

    res.json({
      notificaciones: notificacionesConImagenes,
      noLeidas,
      pagina,
      limite
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      message: 'No se pudieron consultar las notificaciones'
    });
  }
}

async function contador(req, res) {
  try {
    res.json({
      noLeidas: await getNotificacionesCollection()
        .countDocuments({
          ...filtroUsuario(req),
          leida: false
        })
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      message: 'No se pudo consultar el contador'
    });
  }
}

async function marcarLeida(req, res) {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      message: 'ID inválido'
    });
  }

  try {
    const r = await getNotificacionesCollection().updateOne(
      {
        ...filtroUsuario(req),
        _id: new ObjectId(req.params.id)
      },
      {
        $set: { leida: true }
      }
    );

    res.status(r.matchedCount ? 200 : 404).json({
      message: r.matchedCount
        ? 'Notificación leída'
        : 'Notificación no encontrada'
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      message: 'No se pudo marcar la notificación'
    });
  }
}

async function marcarTodas(req, res) {
  try {
    const r = await getNotificacionesCollection().updateMany(
      {
        ...filtroUsuario(req),
        leida: false
      },
      {
        $set: { leida: true }
      }
    );

    res.json({
      actualizadas: r.modifiedCount
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      message: 'No se pudieron marcar las notificaciones'
    });
  }
}

async function eliminar(req, res) {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      message: 'ID inválido'
    });
  }

  try {
    const r = await getNotificacionesCollection().deleteOne({
      ...filtroUsuario(req),
      _id: new ObjectId(req.params.id)
    });

    res.status(r.deletedCount ? 200 : 404).json({
      message: r.deletedCount
        ? 'Notificación eliminada'
        : 'Notificación no encontrada'
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      message: 'No se pudo eliminar la notificación'
    });
  }
}

module.exports = {
  listar,
  contador,
  marcarLeida,
  marcarTodas,
  eliminar
};
