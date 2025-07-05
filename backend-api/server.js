// server.js
require('dotenv').config(); // Carga las variables de entorno desde .env

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cors = require('cors'); // Para permitir peticiones desde tu frontend (otro origen)

const app = express();
const port = process.env.PORT || 3000; // El puerto que Render te asignará, o 3000 localmente

// Middleware
app.use(express.json()); // Para parsear el body de las peticiones JSON

// Configuración de CORS: permite solicitudes desde cualquier origen por ahora (*)
// Para producción, esto debería ser más restrictivo y apuntar a la URL de tu frontend.
// La variable FRONTEND_URL de .env o Render puede ser utilizada aquí.
// Si en Render usaste '*' en FRONTEND_URL, aquí también se aplicará.
app.use(cors({
  origin: process.env.FRONTEND_URL // Usará la variable de entorno FRONTEND_URL, que puede ser '*'
}));

// Configuración de la base de datos PostgreSQL
// Render inyectará DATABASE_URL como variable de entorno
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Esto es común y a menudo necesario para Render
  }
});

// Ruta de prueba para verificar conexión a DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ message: 'Conexión a DB exitosa', time: result.rows[0].now });
  } catch (err) {
    console.error('Error al conectar o consultar DB:', err);
    res.status(500).json({ message: 'Error en la conexión a la base de datos', error: err.message });
  }
});

// Ruta de Registro de Usuarios
app.post('/api/register', async (req, res) => {
  const { nombre, apellido, email, clave } = req.body;

  if (!nombre || !apellido || !email || !clave) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  try {
    // 1. Verificar si el email ya existe
    const existingUser = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Este email ya está registrado.' }); // 409 Conflict
    }

    // 2. Hashear la contraseña antes de guardar
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(clave, saltRounds);

    // 3. Insertar nuevo usuario en la base de datos con rol 'user' por defecto
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, apellido, email, clave_hash, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, apellido, email, rol',
      [nombre, apellido, email, hashedPassword, 'user'] // Rol 'user' por defecto
    );

    const newUser = result.rows[0];
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        rol: newUser.rol
      }
    });

  } catch (err) {
    console.error('Error en el registro:', err);
    res.status(500).json({ message: 'Error interno del servidor durante el registro.' });
  }
});

// Ruta de Login de Usuarios
app.post('/api/login', async (req, res) => {
  const { email, clave } = req.body;

  if (!email || !clave) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios.' });
  }

  try {
    // 1. Buscar usuario por email, incluyendo el rol
    const result = await pool.query('SELECT id, nombre, apellido, email, clave_hash, rol FROM usuarios WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos.' }); // 401 Unauthorized
    }

    // 2. Comparar la contraseña proporcionada con la clave hasheada
    const match = await bcrypt.compare(clave, user.clave_hash);

    if (!match) {
      return res.status(401).json({ message: 'Email o contraseña incorrectos.' });
    }

    // 3. Login exitoso
    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol // ¡Añadimos el rol aquí!
      }
    });

  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ message: 'Error interno del servidor durante el login.' });
  }
});

// Middleware para verificar si el usuario es admin (básico y SOLO para este ejemplo)
function isAdmin(req, res, next) {
  // En un sistema real, usarías tokens JWT para verificar el rol del usuario autenticado.
  // Aquí, simulamos enviando el email del admin desde el frontend en el body de la petición POST.
  // ESTO NO ES SEGURO PARA PRODUCCIÓN. Es solo para demostrar la funcionalidad.
  const { userEmail } = req.body; // El frontend enviará el email del usuario logueado
  if (userEmail && userEmail === process.env.ADMIN_EMAIL) { // Compara con un email de admin predefinido en .env/Render
    next(); // Si es admin, continúa
  } else {
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
}

// Ruta para obtener todos los usuarios (solo para administradores)
app.post('/api/users', isAdmin, async (req, res) => { // Usamos POST y pasamos el email en el body para la simulación
  try {
    // Selecciona todos los usuarios, pero EXCLUYE la clave_hash por seguridad
    const result = await pool.query('SELECT id, nombre, apellido, email, rol, created_at FROM usuarios ORDER BY created_at DESC');
    res.status(200).json({ users: result.rows });
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor backend escuchando en http://localhost:${port}`);
  console.log('Intento de conexión a PostgreSQL...');
  pool.query('SELECT 1 + 1 AS solution')
    .then(res => console.log('PostgreSQL conectado y funcionando. Resultado:', res.rows[0].solution))
    .catch(err => console.error('Error al conectar PostgreSQL en el inicio:', err));
});