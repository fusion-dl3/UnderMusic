const { getNotificacionesCollection } = require('../models/notificacionModel');
const { getSeguimientosCollection } = require('../models/seguimientoModel');
const { getUsuariosCollection } = require('../models/usuarioModel');
const DIAS = 14;
function siguienteHito(total, tipo) {
  if (tipo === 'interaccion') {
    if (total < 5) return null;
    if (total === 5 || total === 20 || total === 50) return total;
    if (total >= 100 && total % 50 === 0) return total;
    return null;
  }
  if ([100, 500, 1000, 2000, 3000, 4000].includes(total)) return total;
  if (total >= 5000 && total % 5000 === 0) return total;
  return null;
}
async function crearNotificacion({ usuarioId, tipo, titulo, mensaje, accion = null, claveUnica = null }) {
  const ahora = new Date();
  const doc = { usuarioId, tipo, titulo, mensaje, accion, leida: false, fechaCreacion: ahora,
    fechaExpiracion: new Date(ahora.getTime() + DIAS * 86400000) };
  if (claveUnica) doc.claveUnica = claveUnica;
  try {
    if (claveUnica) await getNotificacionesCollection().updateOne({ claveUnica }, { $setOnInsert: doc }, { upsert: true });
    else await getNotificacionesCollection().insertOne(doc);
  } catch (e) { if (e.code !== 11000) throw e; }
}
async function intentarNotificar(tarea) {
  try { await tarea(); } catch (e) { console.error('[notificaciones] No se pudo generar aviso:', e); }
}
async function notificarHito({ usuarioId, tipo, entidadId, total, titulo, mensaje, accion, categoria }) {
  const hito = siguienteHito(total, categoria);
  if (!hito) return;
  await crearNotificacion({ usuarioId, tipo, titulo, mensaje: mensaje(hito), accion,
    claveUnica: `hito:${tipo}:${entidadId}:${hito}` });
}
async function notificarNuevoSeguidor(artistaId, seguidorId, total) {
  const seguidor = await getUsuariosCollection().findOne({ _id: seguidorId }, { projection: { nombreUsuario: 1 } });
  const nombre = seguidor?.nombreUsuario || 'Un usuario';
  await crearNotificacion({ usuarioId: artistaId, tipo: 'nuevo_seguidor', titulo: 'Nuevo seguidor',
    mensaje: `¡${nombre} comenzó a seguirte!`, accion: { tipo: 'ver_perfil', usuarioId: seguidorId.toString() } });
  await notificarHito({ usuarioId: artistaId, tipo: 'hito_seguidores', entidadId: artistaId, total,
    titulo: '¡Nuevo logro de seguidores!', mensaje: n => `¡Felicidades! Tu perfil artístico alcanzó ${n.toLocaleString('es-CL')} seguidores. En UnderMusic celebramos tu crecimiento.`, categoria: 'crecimiento' });
}
async function notificarLanzamiento(artistaId, cancionId, tituloCancion) {
  const artista = await getUsuariosCollection().findOne({ _id: artistaId }, { projection: { nombreUsuario: 1 } });
  const nombre = artista?.nombreUsuario || 'Un artista que sigues';
  const cursor = getSeguimientosCollection().find({ artistaId }, { projection: { seguidorId: 1 } });
  for await (const seg of cursor) {
    await crearNotificacion({ usuarioId: seg.seguidorId, tipo: 'nuevo_lanzamiento', titulo: 'Nuevo lanzamiento',
      mensaje: `¡${nombre} publicó «${tituloCancion}»!`, accion: { tipo: 'escuchar_cancion', cancionId: cancionId.toString(), artistaId: artistaId.toString() },
      claveUnica: `lanzamiento:${cancionId}:${seg.seguidorId}` });
  }
}
async function notificarInteraccion(cancion, tipo, total) {
  const etiquetas = { hito_me_gusta: 'Me gusta', hito_guardados: 'guardados', hito_reproducciones: 'reproducciones' };
  await notificarHito({ usuarioId: cancion.usuarioId, tipo, entidadId: cancion._id, total,
    titulo: '¡Nuevo logro musical!', categoria: tipo === 'hito_reproducciones' ? 'crecimiento' : 'interaccion',
    mensaje: n => `¡Felicidades! Tu canción «${cancion.titulo}» alcanzó ${n.toLocaleString('es-CL')} ${etiquetas[tipo]}. ¡Sigue compartiendo tu música en UnderMusic!`,
    accion: { tipo: 'escuchar_cancion', cancionId: cancion._id.toString(), artistaId: cancion.usuarioId.toString() } });
}
module.exports = { crearNotificacion, intentarNotificar, notificarNuevoSeguidor, notificarLanzamiento, notificarInteraccion, siguienteHito };
