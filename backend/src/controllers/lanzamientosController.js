
const { ObjectId } = require('mongodb');

const { getUsuariosCollection } = require('../models/usuarioModel');
const { getPerfilesArtistaCollection } = require('../models/perfilArtistaModel');
const { getCancionesCollection } = require('../models/cancionModel');
const { obtenerGenerosEscuchados } = require('../services/estadisticasMusicalesService');

// Devuelve hasta cinco canciones nuevas, priorizando los gustos del usuario.
async function obtenerLanzamientosRecientes(req, res) {
  try {
    const usuarioId = req.usuario?.id;

    if (!usuarioId || !ObjectId.isValid(usuarioId)) {
      return res.status(401).json({
        message: 'Debes iniciar sesión para ver lanzamientos recientes'
      });
    }

    const usuarios = getUsuariosCollection();

    const usuario = await usuarios.findOne({
      _id: new ObjectId(usuarioId)
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'No se encontró el usuario'
      });
    }

    // Prioridad 1: géneros que realmente escucha el usuario.
    const generosEscuchados = await obtenerGenerosEscuchados(
      usuarioId,
      5
    );

    let generosPreferidos = generosEscuchados.map(
      (item) => item.genero
    );

    let criterio = 'historial';

    // Prioridad 2: géneros seleccionados durante el registro.
    if (generosPreferidos.length === 0) {
      generosPreferidos = Array.isArray(usuario.generosFavoritos)
        ? usuario.generosFavoritos.filter(
            (genero) =>
              typeof genero === 'string' &&
              genero.trim()
          )
        : [];

      criterio = generosPreferidos.length
        ? 'preferencias'
        : 'general';
    }

    generosPreferidos = [...new Set(generosPreferidos)];

    // Considerar únicamente artistas con perfiles completos.
    const perfiles = await getPerfilesArtistaCollection()
      .find(
        { perfilCompleto: true },
        {
          projection: {
            usuarioId: 1,
            nombreArtistico: 1
          }
        }
      )
      .toArray();

    const idsPerfiles = perfiles
      .map((perfil) => perfil.usuarioId)
      .filter(Boolean);

    if (!idsPerfiles.length) {
      return res.status(200).json({
        canciones: [],
        criterio,
        generos: generosPreferidos
      });
    }

    // Verificar que los usuarios sigan siendo artistas.
    const artistas = await usuarios.find(
      {
        _id: { $in: idsPerfiles },
        rol: 'artista'
      },
      {
        projection: {
          _id: 1,
          fotoPerfil: 1
        }
      }
    ).toArray();

    const artistasPorId = new Map(
      artistas.map((artista) => [
        artista._id.toString(),
        artista
      ])
    );

    const perfilesPorId = new Map(
      perfiles
        .filter((perfil) =>
          artistasPorId.has(perfil.usuarioId.toString())
        )
        .map((perfil) => [
          perfil.usuarioId.toString(),
          perfil
        ])
    );

    const idsValidos = perfiles
      .filter((perfil) =>
        perfilesPorId.has(perfil.usuarioId.toString())
      )
      .map((perfil) => perfil.usuarioId);

    if (!idsValidos.length) {
      return res.status(200).json({
        canciones: [],
        criterio,
        generos: generosPreferidos
      });
    }

    const cancionesCollection = getCancionesCollection();

    const filtroBase = {
      usuarioId: { $in: idsValidos }
    };

    // Más recientes primero.
    const orden = {
      fechaPublicacion: -1,
      _id: -1
    };

    let seleccionadas = [];

    // Buscar primero canciones que coincidan con los gustos.
    if (generosPreferidos.length) {
      seleccionadas = await cancionesCollection
        .find({
          ...filtroBase,
          $or: [
            {
              generoPrincipal: {
                $in: generosPreferidos
              }
            },
            {
              generosSecundarios: {
                $in: generosPreferidos
              }
            }
          ]
        })
        .sort(orden)
        .limit(5)
        .toArray();
    }

    // Completar los espacios restantes con otros lanzamientos.
    if (seleccionadas.length < 5) {
      const otras = await cancionesCollection
        .find({
          ...filtroBase,
          _id: {
            $nin: seleccionadas.map(
              (cancion) => cancion._id
            )
          }
        })
        .sort(orden)
        .limit(5 - seleccionadas.length)
        .toArray();

      seleccionadas = [...seleccionadas, ...otras];
    }

    // Preparar los datos que necesita el reproductor.
    const canciones = seleccionadas.map((cancion) => {
      const idArtista = cancion.usuarioId.toString();

      const perfil = perfilesPorId.get(idArtista);
      const artista = artistasPorId.get(idArtista);

      return {
        id: cancion._id.toString(),
        usuarioId: idArtista,
        titulo: cancion.titulo,
        album: cancion.album || '',
        generoPrincipal: cancion.generoPrincipal,
        generosSecundarios: cancion.generosSecundarios || [],
        audioId: cancion.audioId || null,
        portadaId: cancion.portadaId || null,
        nombreArtistico: perfil.nombreArtistico,
        fotoArtista: artista.fotoPerfil || null,
        fechaPublicacion: cancion.fechaPublicacion
      };
    });

    return res.status(200).json({
      canciones,
      criterio,
      generos: generosPreferidos
    });

  } catch (error) {
    console.error(
      'Error al obtener lanzamientos recientes:',
      error
    );

    return res.status(500).json({
      message:
        'No fue posible obtener los lanzamientos recientes'
    });
  }
}

module.exports = {
  obtenerLanzamientosRecientes
};
