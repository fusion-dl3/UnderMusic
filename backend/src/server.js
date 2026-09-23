const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API de UnderMusic funcionando correctamente'
  });
});

app.listen(PORT, () => {
  console.log(`Servidor de UnderMusic ejecutandose en http://localhost:${PORT}`);
});