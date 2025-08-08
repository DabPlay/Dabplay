// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Para JSON
app.use(express.urlencoded({ extended: true })); // Para formularios

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
const enviarRoute = require('./api/enviar'); // Calcula conversión
const comprobanteRoute = require('./api/comprobante'); // Guarda datos + imagen

app.use('/api/enviar', enviarRoute);
app.use('/api/comprobante', comprobanteRoute);

// Servir index.html en cualquier ruta que no sea API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
