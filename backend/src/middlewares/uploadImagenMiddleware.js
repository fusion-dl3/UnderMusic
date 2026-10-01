const multer = require('multer');

const almacenamiento = multer.memoryStorage();

const tiposPermitidos = [
  'image/jpeg',
  'image/png',
  'image/webp'
];

const filtroImagen = (req, file, callback) => {
  if (!tiposPermitidos.includes(file.mimetype)) {
    return callback(
      new Error(
        'La imagen debe estar en formato JPG, PNG o WEBP'
      )
    );
  }

  callback(null, true);
};

const subirImagenPerfil = multer({
  storage: almacenamiento,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: filtroImagen
});

module.exports = {
  subirImagenPerfil
};