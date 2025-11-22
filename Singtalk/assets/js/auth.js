// Funciones de utilidad para hash y encriptación
function hex(buffer) {
  const view = new Uint8Array(buffer);
  let hexString = '';
  for (let i = 0; i < view.length; i++) {
    hexString += view[i].toString(16).padStart(2, '0');
  }
  return hexString;
}

function crearSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return hex(array.buffer);
}

async function hashClave(clave, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(clave + '|' + salt);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return hex(digest);
}

// Funciones de gestión de usuarios
function leerUsuarios() {
  try {
    return JSON.parse(localStorage.getItem('singtalk_users') || '[]');
  } catch (e) {
    return [];
  }
}

function guardarUsuarios(users) {
  localStorage.setItem('singtalk_users', JSON.stringify(users));
}

function usuarioActual() {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setUsuarioActual(user) {
  localStorage.setItem('currentUser', JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name
  }));
}

function limpiarUsuarioActual() {
  localStorage.removeItem('currentUser');
}

// Funciones de autenticación
async function registrar(nombre, email, clave, clave2) {
  const alertEl = document.getElementById('register-alert');

  if (clave !== clave2) {
    if (alertEl) {
      alertEl.textContent = 'Las contraseñas no coinciden';
      alertEl.style.display = 'block';
    }
    return;
  }

  if (clave.length < 8) {
    if (alertEl) {
      alertEl.textContent = 'La contraseña debe tener al menos 8 caracteres';
      alertEl.style.display = 'block';
    }
    return;
  }

  const users = leerUsuarios();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    if (alertEl) {
      alertEl.textContent = 'Este correo ya está registrado';
      alertEl.style.display = 'block';
    }
    return;
  }

  const salt = crearSalt();
  const hash = await hashClave(clave, salt);

  const user = {
    id: email.toLowerCase(),
    email: email.toLowerCase(),
    name: nombre,
    salt: salt,
    hash: hash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  guardarUsuarios(users);
  setUsuarioActual(user);

  if (alertEl) {
    alertEl.classList.add('success');
    alertEl.textContent = 'Cuenta creada, redirigiendo...';
    alertEl.style.display = 'block';
  }

  setTimeout(() => {
    window.location.href = 'pagina-principal.html';
  }, 600);
}

async function iniciarSesion(email, clave) {
  const alertEl = document.getElementById('login-alert');
  const users = leerUsuarios();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    if (alertEl) {
      alertEl.textContent = 'Usuario no encontrado';
      alertEl.style.display = 'block';
    }
    return;
  }

  const hash = await hashClave(clave, user.salt);
  if (hash !== user.hash) {
    if (alertEl) {
      alertEl.textContent = 'Contraseña incorrecta';
      alertEl.style.display = 'block';
    }
    return;
  }

  setUsuarioActual(user);
  if (alertEl) {
    alertEl.classList.add('success');
    alertEl.textContent = 'Bienvenido, redirigiendo...';
    alertEl.style.display = 'block';
  }

  setTimeout(() => {
    window.location.href = 'pagina-principal.html';
  }, 600);
}

// Funciones de renderizado
function renderizarAcciones() {
  const el = document.getElementById('auth-actions');
  if (!el) return;

  const user = usuarioActual();
  if (user) {
    el.innerHTML = `
      <span class="game-badge">${user.name || user.email}</span>
      <button id="logout-btn" class="btn">Cerrar sesión</button>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        limpiarUsuarioActual();
        window.location.href = 'login.html';
      });
    }
  } else {
    el.innerHTML = `
      <a class="btn" href="login.html">Iniciar sesión</a>
      <a class="btn" href="registro.html">Registrarse</a>
    `;
  }
}

// Inicialización
function iniciarAuth() {
  renderizarAcciones();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      await iniciarSesion(email, password);
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value;
      const password2 = document.getElementById('register-password2').value;
      await registrar(nombre, email, password, password2);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarAuth();
});
