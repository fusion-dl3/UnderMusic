const { getDatabase } = require('../config/database');
const getNotificacionesCollection = () => getDatabase().collection('notificaciones');
async function crearIndicesNotificaciones() {
  const col = getNotificacionesCollection();
  await col.createIndex({ usuarioId: 1, fechaCreacion: -1 });
  await col.createIndex({ fechaExpiracion: 1 }, { expireAfterSeconds: 0 });
  await col.createIndex({ claveUnica: 1 }, { unique: true, partialFilterExpression: { claveUnica: { $type: 'string' } } });
}
module.exports = { getNotificacionesCollection, crearIndicesNotificaciones };
