/**
 * SullanaShield — JavaScript principal
 * Gestión de reportes de inundaciones, alertas en tiempo real y mapa interactivo
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'sullanashield_reportes';

  const TIPO_CONFIG = {
    inundacion: { label: 'Inundación', color: '#c0392b', riesgo: 'alto', icon: '🌊' },
    desague:    { label: 'Desagüe colapsado', color: '#e67e22', riesgo: 'medio', icon: '⚠️' },
    zancudos:   { label: 'Zancudos', color: '#27ae60', riesgo: 'bajo', icon: '🦟' },
    calle:      { label: 'Calle bloqueada', color: '#8e44ad', riesgo: 'medio', icon: '🚧' },
    otro:       { label: 'Otro', color: '#6c757d', riesgo: 'bajo', icon: '📋' }
  };

  const ALERTAS_INICIALES = [
    { id: 1, zona: 'Bellavista', tipo: 'inundacion', direccion: 'Av. Grau cuadra 5', descripcion: 'Agua a nivel de rodillas', haceMinutos: 15 },
    { id: 2, zona: 'Centro', tipo: 'desague', direccion: 'Jr. Lima 200', descripcion: 'Desagüe colapsado', haceMinutos: 32 },
    { id: 3, zona: 'El Porvenir', tipo: 'inundacion', direccion: 'Av. Panamericana', descripcion: 'Inundación en vía principal', haceMinutos: 48 },
    { id: 4, zona: 'San Martín', tipo: 'calle', direccion: 'Calle Los Olivos', descripcion: 'Calle bloqueada por derrumbe', haceMinutos: 65 },
    { id: 5, zona: 'Quintana', tipo: 'zancudos', direccion: 'Asentamiento humano', descripcion: 'Agua estancada', haceMinutos: 90 },
    { id: 6, zona: 'La Florida', tipo: 'inundacion', direccion: 'Av. Sánchez Cerro', descripcion: 'Inundación severa', haceMinutos: 120 }
  ];

  let mapZoom = 1;

  // ========== UTILIDADES ==========

  function getReportes() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveReportes(reportes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reportes));
  }

  function generarId() {
    return Date.now() + Math.random().toString(36).slice(2, 7);
  }

  function tiempoRelativo(minutos) {
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${Math.round(minutos)} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    return `Hace ${Math.floor(horas / 24)} d`;
  }

  function extraerZona(direccion) {
    const zonas = ['Bellavista', 'Centro', 'El Porvenir', 'San Martín', 'Quintana', 'La Florida', 'Sullana'];
    for (const z of zonas) {
      if (direccion.toLowerCase().includes(z.toLowerCase())) return z;
    }
    const partes = direccion.split(',').map(p => p.trim());
    return partes[0] || 'Sullana';
  }

  function getAllAlertas() {
    const reportes = getReportes();
    const ahora = Date.now();

    const alertasUsuario = reportes.map(r => ({
      ...r,
      haceMinutos: (ahora - new Date(r.fecha).getTime()) / 60000,
      zona: extraerZona(r.direccion),
      esUsuario: true
    }));

    const alertasDemo = ALERTAS_INICIALES.map(a => ({ ...a, esUsuario: false }));

    return [...alertasUsuario, ...alertasDemo]
      .sort((a, b) => a.haceMinutos - b.haceMinutos);
  }

  function getBadgeClass(riesgo) {
    const map = { alto: 'badge--alto', medio: 'badge--medio', bajo: 'badge--bajo' };
    return map[riesgo] || 'badge--bajo';
  }

  function getRiesgoLabel(riesgo) {
    const map = { alto: 'RIESGO ALTO', medio: 'RIESGO MEDIO', bajo: 'RIESGO BAJO' };
    return map[riesgo] || 'RIESGO BAJO';
  }

  // ========== RENDER ALERTAS ==========

  function renderAlertas(filtro) {
    const container = document.getElementById('alertsList');
    if (!container) return;

    let alertas = getAllAlertas();

    if (filtro) {
      const q = filtro.toLowerCase();
      alertas = alertas.filter(a =>
        a.zona.toLowerCase().includes(q) ||
        a.direccion.toLowerCase().includes(q) ||
        (TIPO_CONFIG[a.tipo]?.label || '').toLowerCase().includes(q)
      );
    }

    if (alertas.length === 0) {
      container.innerHTML = '<p class="alerts-empty">No se encontraron alertas. Sé el primero en reportar una inundación.</p>';
      return;
    }

    container.innerHTML = alertas.slice(0, 12).map(alerta => {
      const cfg = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.otro;
      const badgeClass = getBadgeClass(cfg.riesgo);
      const riesgoLabel = getRiesgoLabel(cfg.riesgo);
      const nuevo = alerta.esUsuario && alerta.haceMinutos < 5
        ? ' <span style="color:#27ae60;font-weight:700">· NUEVO</span>' : '';

      return `
        <article class="alert-item" data-tipo="${alerta.tipo}">
          <span class="alert-item__icon">${cfg.icon}</span>
          <div class="alert-item__body">
            <div class="alert-item__zone">${alerta.zona}${nuevo}</div>
            <div class="alert-item__type">${cfg.label} — ${alerta.direccion}</div>
            <div class="alert-item__time">${tiempoRelativo(alerta.haceMinutos)}</div>
            <span class="alert-item__badge ${badgeClass}">${riesgoLabel}</span>
          </div>
        </article>
      `;
    }).join('');
  }

  // ========== ESTADÍSTICAS ==========

  function updateStats() {
    const reportes = getReportes();
    const hoy = new Date().toDateString();
    const reportesHoy = reportes.filter(r => new Date(r.fecha).toDateString() === hoy);

    const elReportes = document.getElementById('statReportes');
    const elReportesHoy = document.getElementById('statReportesHoy');
    const elAlertas = document.getElementById('statAlertas');

    if (elReportes) {
      elReportes.textContent = 126 + reportes.length;
    }
    if (elReportesHoy) {
      elReportesHoy.textContent = `+${12 + reportesHoy.length} hoy`;
    }
    if (elAlertas) {
      const inundaciones = getAllAlertas().filter(a => a.tipo === 'inundacion').length;
      elAlertas.textContent = Math.min(inundaciones, 99);
    }
  }

  // ========== MAPA ==========

  function renderMapPins() {
    const container = document.getElementById('mapPins');
    if (!container) return;

    const alertas = getAllAlertas().slice(0, 15);
    const posiciones = [
      { top: '18%', left: '42%' }, { top: '28%', left: '58%' }, { top: '35%', left: '35%' },
      { top: '22%', left: '68%' }, { top: '45%', left: '52%' }, { top: '38%', left: '48%' },
      { top: '30%', left: '45%' }, { top: '50%', left: '40%' }, { top: '55%', left: '55%' },
      { top: '42%', left: '62%' }, { top: '62%', left: '48%' }, { top: '48%', left: '38%' },
      { top: '58%', left: '58%' }, { top: '25%', left: '52%' }, { top: '70%', left: '50%' }
    ];

    container.innerHTML = alertas.map((alerta, i) => {
      const cfg = TIPO_CONFIG[alerta.tipo] || TIPO_CONFIG.otro;
      const pos = posiciones[i % posiciones.length];
      return `<span class="map-pin" style="top:${pos.top};left:${pos.left};background:${cfg.color}" title="${alerta.zona}: ${cfg.label}"></span>`;
    }).join('');
  }

  function setMapZoom(level) {
    mapZoom = Math.min(Math.max(level, 0.8), 2);
    const img = document.querySelector('.map-container__img');
    if (img) img.style.transform = `scale(${mapZoom})`;
  }

  // ========== FORMULARIO ==========

  function showFormMessage(text, type) {
    const el = document.getElementById('formMessage');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    el.className = `form-message form-message--${type}`;
    setTimeout(() => { el.hidden = true; }, 5000);
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const direccion = form.direccion.value.trim();
    const descripcion = form.descripcion.value.trim();
    const tipo = form.querySelector('input[name="tipo"]:checked')?.value;

    if (!direccion || !descripcion) {
      showFormMessage('Por favor completa la dirección y la descripción.', 'error');
      return;
    }

    const reporte = {
      id: generarId(),
      tipo: tipo || 'inundacion',
      direccion,
      descripcion,
      nombre: form.nombre.value.trim() || 'Ciudadano anónimo',
      lat: form.lat.value || null,
      lng: form.lng.value || null,
      fecha: new Date().toISOString()
    };

    const fotoInput = document.getElementById('foto');
    if (fotoInput?.files?.[0]) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        reporte.foto = ev.target.result;
        guardarReporte(reporte, form, tipo);
      };
      reader.readAsDataURL(fotoInput.files[0]);
    } else {
      guardarReporte(reporte, form, tipo);
    }
  }

  function guardarReporte(reporte, form, tipo) {
    const reportes = getReportes();
    reportes.unshift(reporte);
    saveReportes(reportes);

    form.reset();
    resetPhotoPreview();

    const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.inundacion;
    const mensaje = tipo === 'inundacion'
      ? '🌊 ¡Alerta de inundación registrada! Tu reporte ya aparece en las alertas en tiempo real.'
      : `✅ Reporte enviado correctamente (${cfg.label}). Gracias por ayudar a la comunidad.`;

    showFormMessage(mensaje, 'success');
    renderAlertas();
    updateStats();
    renderMapPins();

    document.getElementById('alertas')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetPhotoPreview() {
    const preview = document.getElementById('photoPreview');
    const content = document.getElementById('uploadContent');
    if (preview) { preview.hidden = true; preview.src = ''; }
    if (content) content.hidden = false;
  }

  // ========== GEOLOCALIZACIÓN ==========

  function obtenerUbicacion() {
    const status = document.getElementById('locationStatus');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    const dirInput = document.getElementById('direccion');

    if (!navigator.geolocation) {
      status.textContent = 'Geolocalización no disponible en este navegador.';
      status.className = 'location-status location-status--error';
      return;
    }

    status.textContent = 'Obteniendo ubicación...';
    status.className = 'location-status';

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        latInput.value = lat;
        lngInput.value = lng;
        status.textContent = `📍 Ubicación obtenida (${lat}, ${lng})`;
        status.className = 'location-status';

        if (!dirInput.value.trim()) {
          dirInput.value = `Coordenadas GPS: ${lat}, ${lng} — Sullana, Piura`;
        }
      },
      function () {
        status.textContent = 'No se pudo obtener la ubicación. Ingresa la dirección manualmente.';
        status.className = 'location-status location-status--error';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // ========== FOTO PREVIEW ==========

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('photoPreview');
    const content = document.getElementById('uploadContent');

    if (!file || !preview) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
      preview.src = ev.target.result;
      preview.hidden = false;
      if (content) content.hidden = true;
    };
    reader.readAsDataURL(file);
  }

  // ========== NAVEGACIÓN ==========

  function initNavigation() {
    const toggle = document.getElementById('navToggle');
    const nav = document.querySelector('.nav');

    toggle?.addEventListener('click', () => {
      nav?.classList.toggle('nav--open');
    });

    document.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        nav?.classList.remove('nav--open');
        document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('nav__link--active'));
        link.classList.add('nav__link--active');
      });
    });

    const sections = document.querySelectorAll('section[id], main section[id]');
    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(section => {
        const top = section.offsetTop - 120;
        if (window.scrollY >= top) current = section.getAttribute('id');
      });
      document.querySelectorAll('.nav__link').forEach(link => {
        link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${current}`);
      });
    });
  }

  // ========== BÚSQUEDA ==========

  function initSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.querySelector('.search-box__btn');

    function buscar() {
      const q = input?.value.trim();
      renderAlertas(q);
      document.getElementById('alertas')?.scrollIntoView({ behavior: 'smooth' });
    }

    btn?.addEventListener('click', buscar);
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter') buscar();
    });
  }

  // ========== MODAL MAPA ==========

  function initMapModal() {
    const modal = document.getElementById('mapModal');
    const openBtn = document.getElementById('openMapBtn');
    const closeBtn = document.getElementById('closeMapModal');
    const backdrop = document.getElementById('mapModalBackdrop');

    function open() {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
    }

    openBtn?.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);

    document.getElementById('mapZoomIn')?.addEventListener('click', () => setMapZoom(mapZoom + 0.2));
    document.getElementById('mapZoomOut')?.addEventListener('click', () => setMapZoom(mapZoom - 0.2));
  }

  // ========== ACTUALIZACIÓN PERIÓDICA ==========

  function initAutoRefresh() {
    setInterval(() => {
      renderAlertas();
      updateStats();
    }, 60000);
  }

  // ========== INICIALIZACIÓN ==========

  function init() {
    renderAlertas();
    updateStats();
    renderMapPins();
    initNavigation();
    initSearch();
    initMapModal();
    initAutoRefresh();

    document.getElementById('reportForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('getLocationBtn')?.addEventListener('click', obtenerUbicacion);
    document.getElementById('foto')?.addEventListener('change', handlePhotoChange);

    document.querySelector('a[href="#reportar"]')?.addEventListener('click', () => {
      const radioInundacion = document.querySelector('input[name="tipo"][value="inundacion"]');
      if (radioInundacion) radioInundacion.checked = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
