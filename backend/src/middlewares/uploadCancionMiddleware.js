const multer = require('multer');

const almacenamiento = multer.memoryStorage();

const TAMANO_MAXIMO_MP3 = 20 * 1024 * 1024;
const TAMANO_MAXIMO_PORTADA = 5 * 1024 * 1024;

const tiposImagenPermitidos = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const tiposMp3Permitidos = [
  'audio/mpeg',
  'audio/mp3'
];

const filtroArchivosCancion = (req, file, callback) => {
  if (file.fieldname === 'audio') {
    const nombreEnMinusculas =
      file.originalname.toLowerCase();

    const extensionValida =
      nombreEnMinusculas.endsWith('.mp3');

    const tipoValido =
      tiposMp3Permitidos.includes(file.mimetype);

    if (!extensionValida || !tipoValido) {
      return callback(
        new Error(
          'El archivo de audio debe estar en formato MP3'
        )
      );
    }

    return callback(null, true);
  }

  if (file.fieldname === 'portada') {
    if (!tiposImagenPermitidos.includes(file.mimetype)) {
      return callback(
        new Error(
          'La portada debe estar en formato JPG, PNG o WEBP'
        )
      );
    }

    return callback(null, true);
  }

  return callback(
    new Error('Campo de archivo no permitido')
  );
};

const subirArchivosCancion = multer({
  storage: almacenamiento,
  limits: {
    fileSize: TAMANO_MAXIMO_MP3,
    files: 2
  },
  fileFilter: filtroArchivosCancion
}).fields([
  {
    name: 'audio',
    maxCount: 1
  },
  {
    name: 'portada',
    maxCount: 1
  }
]);

module.exports = {
  subirArchivosCancion,
  TAMANO_MAXIMO_MP3,
  TAMANO_MAXIMO_PORTADA
};