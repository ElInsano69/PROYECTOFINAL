// Funciones para manejo de usuarios en localStorage
function getUsuarios() {
    const usuariosJSON = localStorage.getItem('usuarios');
    return usuariosJSON ? JSON.parse(usuariosJSON) : [];
}

function saveUsuarios(usuarios) {
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

// Mostrar sección de registro o login
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const welcomeSection = document.getElementById('welcome-section');
const userNameSpan = document.getElementById('user-name');

const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');

showRegisterBtn.addEventListener('click', () => {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
    clearMessages();
});

showLoginBtn.addEventListener('click', () => {
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
    clearMessages();
});

function clearMessages() {
    document.getElementById('login-error').textContent = '';
    document.getElementById('register-error').textContent = '';
    document.getElementById('register-success').textContent = '';
}

// Registro
const registerForm = document.getElementById('register-form');
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const password2 = document.getElementById('register-password2').value.trim();

    clearMessages();

    if (password !== password2) {
        document.getElementById('register-error').textContent = 'Las contraseñas no coinciden.';
        return;
    }

    const usuarios = getUsuarios();
    const existeEmail = usuarios.some(u => u.email === email);

    if (existeEmail) {
        document.getElementById('register-error').textContent = 'Este email ya está registrado.';
        return;
    }

    usuarios.push({ nombre, email, password });
    saveUsuarios(usuarios);

    document.getElementById('register-success').textContent = 'Registro exitoso, ya puedes iniciar sesión.';
    registerForm.reset();
});

// Login
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    clearMessages();

    const usuarios = getUsuarios();
    const usuario = usuarios.find(u => u.email === email && u.password === password);

    if (!usuario) {
        document.getElementById('login-error').textContent = 'Email o contraseña incorrectos.';
        return;
    }

    // Guardar usuario logueado
    localStorage.setItem('logueado', 'si');
    localStorage.setItem('usuario_actual', JSON.stringify(usuario));

    mostrarBienvenida();
});

// Mostrar bienvenida y ocultar formularios
function mostrarBienvenida() {
    const usuarioActual = JSON.parse(localStorage.getItem('usuario_actual'));
    if (!usuarioActual) return;

    userNameSpan.textContent = usuarioActual.nombre;

    loginSection.style.display = 'none';
    registerSection.style.display = 'none';
    welcomeSection.style.display = 'block';
}

// Logout
const logoutBtn = document.getElementById('logout-button');
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('logueado');
    localStorage.removeItem('usuario_actual');
    welcomeSection.style.display = 'none';
    loginSection.style.display = 'block';
});

// Al cargar la página, mostrar bienvenida si ya está logueado
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('logueado') === 'si') {
        mostrarBienvenida();
    } else {
        loginSection.style.display = 'block';
        registerSection.style.display = 'none';
        welcomeSection.style.display = 'none';
    }
});
