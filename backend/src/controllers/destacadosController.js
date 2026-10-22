
const { ObjectId } = require('mongodb');

const {
  getUsuariosCollection,
} = require('../models/usuarioModel');

const {
  getPerfilesArtistaCollection,
} = require('../models/perfilArtistaModel');

const {
  obtenerGenerosEscuchados,
  obtenerRankingOyentesArtistas,
} = require('../services/estadisticasMusicalesService');

// Devuelve hasta tres artistas destacados para el usuario autenticado.
async function obtenerArtistasDestacados(req, res) {
  try {
    const usuarioId = req.usuario?.id;

    if (!usuarioId || !ObjectId.isValid(usuarioId)) {
      return res.status(401).json({
        message: 'Debes iniciar sesión para ver artistas destacados',
      });
    }

    const usuario = await getUsuariosCollection().findOne({
      _id: new ObjectId(usuarioId),
    });

    if (!usuario) {
      return res.status(404).json({
        message: 'No se encontró el usuario',
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

    // Prioridad 2: géneros declarados durante el registro.
    if (generosPreferidos.length === 0) {
      generosPreferidos = Array.isArray(usuario.generosFavoritos)
        ? usuario.generosFavoritos.filter(
            (genero) =>
              typeof genero === 'string' &&
              genero.trim().length > 0
          )
        : [];

      criterio = generosPreferidos.length > 0
        ? 'preferencias'
        : 'general';
    }

    // Solo consideramos perfiles públicos completos.
    const perfiles = await getPerfilesArtistaCollection()
      .find(
        { perfilCompleto: true },
        {
          projection: {
            usuarioId: 1,
            nombreArtistico: 1,
            generoPrincipal: 1,
            generosAdicionales: 1,
          },
        }
      )
      .toArray();

    if (perfiles.length === 0) {
      return res.status(200).json({
        artistas: [],
        criterio,
        generos: generosPreferidos,
      });
    }

    const ids = perfiles
      .filter((perfil) => perfil.usuarioId)
      .map((perfil) => perfil.usuarioId);

    // Consultamos únicamente usuarios que siguen siendo artistas.
    const usuariosArtistas = await getUsuariosCollection()
      .find(
        {
          _id: { $in: ids },
          rol: 'artista',
        },
        {
          projection: {
            nombreUsuario: 1,
            fotoPerfil: 1,
            ubicacion: 1,
          },
        }
      )
      .toArray();

    const usuariosPorId = new Map(
      usuariosArtistas.map((artista) => [
        artista._id.toString(),
        artista,
      ])
    );

    const perfilesValidos = perfiles.filter((perfil) =>
      usuariosPorId.has(perfil.usuarioId.toString())
    );

    const coincideGenero = (perfil) => {
      if (generosPreferidos.length === 0) {
        return true;
      }

      const generosArtista = [
        perfil.generoPrincipal,
        ...(Array.isArray(perfil.generosAdicionales)
          ? perfil.generosAdicionales
          : []),
      ];

      return generosArtista.some((genero) =>
        generosPreferidos.includes(genero)
      );
    };

    // Primero priorizamos los géneros relevantes.
    const perfilesRelacionados = perfilesValidos.filter(
      coincideGenero
    );

    // Si faltan artistas, completamos con otros perfiles.
    const relacionadosIds = new Set(
      perfilesRelacionados.map((perfil) =>
        perfil.usuarioId.toString()
      )
    );

    const otrosPerfiles = perfilesValidos.filter(
      (perfil) =>
        !relacionadosIds.has(perfil.usuarioId.toString())
    );

    const todosLosIds = perfilesValidos.map(
      (perfil) => perfil.usuarioId
    );

    // Obtenemos estadísticas para todos los candidatos.
    // Así podemos incluir artistas con cero reproducciones.
    const ranking = await obtenerRankingOyentesArtistas(
      todosLosIds,
      todosLosIds.length
    );

    const estadisticasPorId = new Map(
      ranking.map((item) => [item.artistaId, item])
    );

    const ordenarPorOyentes = (a, b) => {
      const estadisticasA = estadisticasPorId.get(
        a.usuarioId.toString()
      );

      const estadisticasB = estadisticasPorId.get(
        b.usuarioId.toString()
      );

      const oyentesA = estadisticasA?.oyentesTotales || 0;
      const oyentesB = estadisticasB?.oyentesTotales || 0;

      if (oyentesB !== oyentesA) {
        return oyentesB - oyentesA;
      }

      const reproduccionesA =
        estadisticasA?.reproduccionesTotales || 0;

      const reproduccionesB =
        estadisticasB?.reproduccionesTotales || 0;

      if (reproduccionesB !== reproduccionesA) {
        return reproduccionesB - reproduccionesA;
      }

      return (a.nombreArtistico || '').localeCompare(
        b.nombreArtistico || '',
        'es'
      );
    };

    const seleccionados = [
      ...perfilesRelacionados.sort(ordenarPorOyentes),
      ...otrosPerfiles.sort(ordenarPorOyentes),
    ].slice(0, 3);

    const artistas = seleccionados.map((perfil) => {
      const id = perfil.usuarioId.toString();
      const usuarioArtista = usuariosPorId.get(id);
      const estadisticas = estadisticasPorId.get(id);

      return {
        usuarioId: id,
        nombreUsuario: usuarioArtista.nombreUsuario,
        nombreArtistico: perfil.nombreArtistico,
        fotoPerfil: usuarioArtista.fotoPerfil || null,
        generoPrincipal: perfil.generoPrincipal,
        generosAdicionales:
          perfil.generosAdicionales || [],
        ubicacion: usuarioArtista.ubicacion || null,
        oyentesTotales: estadisticas?.oyentesTotales || 0,
        reproduccionesTotales:
          estadisticas?.reproduccionesTotales || 0,
      };
    });

    return res.status(200).json({
      artistas,
      criterio,
      generos: generosPreferidos,
    });
  } catch (error) {
    console.error(
      'Error al obtener artistas destacados:',
      error
    );

    return res.status(500).json({
      message: 'No fue posible obtener artistas destacados',
    });
  }
}

module.exports = {
  obtenerArtistasDestacados,
};
