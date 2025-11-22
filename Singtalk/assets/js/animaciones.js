// Constantes
const SESSIONS_KEY = "singtalk_sessions";
const nivelNombres = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil"
};

// Variables globales
let camaraStream = null;

// Detección de nivel actual
const nivelActual = (function() {
  const path = (window.location.pathname || '').toLowerCase();
  if (path.includes('facil.html')) return 'facil';
  if (path.includes('medio.html')) return 'medio';
  if (path.includes('dificil.html')) return 'dificil';
  return null;
})();

// Palabras por nivel
const palabrasPorNivel = {
  facil: ["casa", "pelota", "vaso", "libro"],
  medio: ["agua", "comida", "trabajo", "escuela"],
  dificil: ["reloj", "llave", "teléfono", "computadora"]
};

// Función utilitaria compartida
function usuarioActual() {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Funciones de cámara
function activarCamara() {
  if (camaraStream) return;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        camaraStream = stream;
        const video = document.getElementById('camara');
        if (video) {
          video.srcObject = camaraStream;
          video.play();
        }
      })
      .catch(() => {
        alert('No se pudo activar la cámara');
      });
  }
}

function detenerCamara() {
  if (!camaraStream) return;

  camaraStream.getTracks().forEach(track => track.stop());
  camaraStream = null;

  const video = document.getElementById('camara');
  if (video) {
    video.srcObject = null;
  }
}

// Funciones de palabras
function mostrarNuevaPalabra() {
  const el = document.getElementById('palabra');
  if (!el || !nivelActual) return;

  const arr = palabrasPorNivel[nivelActual];
  if (!arr) return;

  const index = Math.floor(Math.random() * arr.length);
  el.textContent = arr[index];
}

// Estado del juego
const estadoJuego = {
  enCurso: false,
  intentos: 0,
  resultados: [],
  duracion: 90,
  cuenta: 3,
  idTimer: null,
  idCuenta: null,
  inicio: null,
  fin: null
};

// Funciones del juego
function tiempoFormateado(segundos) {
  const minutos = Math.floor(segundos / 60).toString().padStart(2, '0');
  const segs = (segundos % 60).toString().padStart(2, '0');
  return `${minutos}:${segs}`;
}

function setControlesDeshabilitados(deshabilitado) {
  const icons = document.querySelectorAll('.icon-btn');
  icons.forEach(btn => {
    btn.disabled = deshabilitado;
  });

  const btnWord = document.getElementById('btn-palabra');
  if (btnWord) {
    btnWord.disabled = deshabilitado;
  }
}

function actualizarProgreso() {
  const el = document.getElementById('game-progress');
  if (el) {
    el.textContent = `${estadoJuego.intentos}/10`;
  }
}

function tickTimer() {
  const el = document.getElementById('game-timer');
  if (!el || !estadoJuego.enCurso) return;

  const elapsed = Math.floor((Date.now() - estadoJuego.inicio) / 1000);
  const remaining = Math.max(0, estadoJuego.duracion - elapsed);
  el.textContent = tiempoFormateado(remaining);

  if (remaining <= 0) {
    terminarJuego();
  }
}

function iniciarJuego() {
  estadoJuego.enCurso = true;
  estadoJuego.intentos = 0;
  estadoJuego.resultados = [];
  estadoJuego.inicio = Date.now();

  setControlesDeshabilitados(false);
  mostrarNuevaPalabra();
  actualizarProgreso();

  const el = document.getElementById('game-timer');
  if (el) {
    el.textContent = tiempoFormateado(estadoJuego.duracion);
  }

  estadoJuego.idTimer = setInterval(tickTimer, 250);
}

function iniciarCuenta() {
  const overlay = document.createElement('div');
  overlay.className = 'countdown-overlay';
  document.body.appendChild(overlay);

  let count = estadoJuego.cuenta;
  overlay.textContent = count;
  setControlesDeshabilitados(true);

  estadoJuego.idCuenta = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(estadoJuego.idCuenta);
      overlay.remove();
      iniciarJuego();
    } else {
      overlay.textContent = count;
    }
  }, 1000);
}

function guardarSesion() {
  if (!nivelActual) return;

  try {
    const user = usuarioActual();
    const now = new Date(estadoJuego.fin || Date.now());
    const fecha = now.toISOString().slice(0, 10);
    const hora = now.toTimeString().slice(0, 8);

    const record = {
      user: user ? user.id : null,
      fecha,
      hora,
      nivel: nivelActual,
      aciertos: estadoJuego.resultados.filter(Boolean).length,
      incorrectas: estadoJuego.resultados.filter(v => !v).length,
      resultados: estadoJuego.resultados.slice(),
      inicio: new Date(estadoJuego.inicio).toISOString(),
      fin: now.toISOString()
    };

    const arr = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
    arr.push(record);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
  } catch (e) {
    // Error al guardar, silencioso
  }
}

function terminarJuego() {
  if (estadoJuego.idTimer) {
    clearInterval(estadoJuego.idTimer);
    estadoJuego.idTimer = null;
  }

  setControlesDeshabilitados(true);
  estadoJuego.enCurso = false;
  estadoJuego.fin = Date.now();
  guardarSesion();
}

function mostrarFlash(ok) {
  const overlay = document.createElement('div');
  overlay.className = 'flash-overlay ' + (ok ? 'ok' : 'bad');
  document.body.appendChild(overlay);

  overlay.addEventListener('animationend', () => {
    overlay.remove();
  });
}

function evaluarSeleccion(seleccion) {
  if (!estadoJuego.enCurso) return;

  const el = document.getElementById('palabra');
  if (!el) return;

  const palabra = el.textContent.trim().toLowerCase();
  const ok = palabra === seleccion;

  mostrarFlash(ok);
  estadoJuego.resultados.push(ok);
  estadoJuego.intentos++;
  actualizarProgreso();
  mostrarNuevaPalabra();

  if (estadoJuego.intentos >= 10) {
    terminarJuego();
  }
}

// Funciones de rachas y estadísticas
function renderizarRachas() {
  const containers = {
    facil: document.getElementById('streak-list-facil'),
    medio: document.getElementById('streak-list-medio'),
    dificil: document.getElementById('streak-list-dificil')
  };

  if (!containers.facil && !containers.medio && !containers.dificil) {
    return;
  }

  // Limpiar contenedores
  Object.values(containers).forEach(container => {
    if (container) {
      container.innerHTML = '';
    }
  });

  // Cargar sesiones
  let sessions = [];
  try {
    sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch (e) {
    sessions = [];
  }

  // Obtener usuario actual
  const user = usuarioActual();
  const userId = user ? user.id : null;

  // Agrupar por nivel
  const grouped = {
    facil: [],
    medio: [],
    dificil: []
  };

  sessions.forEach(session => {
    if (userId && session.user !== userId) return;
    if (grouped[session.nivel]) {
      grouped[session.nivel].push(session);
    }
  });

  // Renderizar cada nivel
  Object.keys(grouped).forEach(level => {
    const container = containers[level];
    if (!container) return;

    const list = grouped[level];

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'streak-card';
      empty.innerHTML = `
        <div class="day">Sin resultados en ${nivelNombres[level]}</div>
        <div class="score-line">Juega este nivel para ver tus sesiones</div>
      `;
      container.appendChild(empty);
      return;
    }

    list.forEach(session => {
      const card = document.createElement('div');
      card.className = 'streak-card';

      const squares = (session.resultados || [])
        .map(result => `<span class="square ${result ? 'ok' : 'bad'}"></span>`)
        .join('');

      card.innerHTML = `
        <div class="day">${session.fecha} ${session.hora}</div>
        <div class="level">${nivelNombres[level]}</div>
        <div class="session-squares">${squares}</div>
      `;

      container.appendChild(card);
    });
  });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Botones de cámara
  const btnCam = document.getElementById('btn-camara');
  if (btnCam) {
    btnCam.addEventListener('click', activarCamara);
  }

  const btnStop = document.getElementById('btn-stop');
  if (btnStop) {
    btnStop.addEventListener('click', detenerCamara);
  }

  // Botón de nueva palabra
  const btnWord = document.getElementById('btn-palabra');
  if (btnWord) {
    btnWord.addEventListener('click', mostrarNuevaPalabra);
  }

  // Botones de iconos
  const icons = document.querySelectorAll('.icon-btn');
  if (icons && icons.length) {
    icons.forEach(btn => {
      btn.addEventListener('click', () => {
        const word = (btn.dataset.word || '').toLowerCase();
        evaluarSeleccion(word);
      });
    });
  }

  // Inicializar juego si estamos en una página de nivel
  if (nivelActual) {
    const timer = document.getElementById('game-timer');
    if (timer) {
      timer.textContent = '01:30';
    }

    const progress = document.getElementById('game-progress');
    if (progress) {
      progress.textContent = '0/10';
    }

    iniciarCuenta();
  }

  // Renderizar estadísticas
  renderizarRachas();
});
