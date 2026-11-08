import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://vuczrujklpdcmhaoqmuy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3pydWprbHBkY21oYW9xbXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MzI1NzgsImV4cCI6MjEwOTQwODU3OH0.7DGVUz7whunnt3yqA-2NeFEsZqnyGzjirRq1_Xn-TIc';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true } });

const APP_URL = location.origin + location.pathname;
const $app = document.getElementById('app');
const MAX_FOTOS = 6;

const st = { session: null, me: null, cats: [], people: {}, deg: {}, filtro: { cat: null, q: '' }, borrador: null };

/* ---------- utilidades ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-AR');
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };
const reemplazar = (h) => location.replace(APP_URL + h);
// sale de la edición sin dejarla en el historial
function salirDeEdicion(id) { if (st.desdeDetalle === id) { st.desdeDetalle = null; history.back(); } else reemplazar('#/a/' + id); }
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }
function iniciales(n) { const p = String(n || '?').trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[1][0] : p[0].slice(0, 2)).toUpperCase(); }
const COLORES = ['#c98bf9', '#fac7ca', '#f0716c', '#d9affb', '#ddf5e5', '#fff0dc', '#fdebea'];
function colorDe(id) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORES[h % COLORES.length]; }
function avatar(p, size = 44, yo = false) {
  if (yo) return `<span class="avatar" aria-hidden="true" style="width:${size}px;height:${size}px;background:var(--ciruela);color:#fff;font-size:${Math.round(size * .3)}px">VOS</span>`;
  if (p?.avatar) return `<img class="avatar" alt="" src="${esc(fotoUrl(p.avatar))}" style="width:${size}px;height:${size}px;object-fit:cover;background:${colorDe(p.id)}">`;
  return `<span class="avatar" aria-hidden="true" style="width:${size}px;height:${size}px;background:${colorDe(p?.id)};font-size:${Math.round(size * .34)}px">${esc(iniciales(p?.name))}</span>`;
}
function waNum(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('549')) return d;
  if (d.startsWith('54')) return '549' + d.slice(2);
  d = d.replace(/^0/, '');
  return '549' + d;
}
const waChat = (num, txt) => `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
const waShare = (txt) => `https://wa.me/?text=${encodeURIComponent(txt)}`;
const LINKS = 'https://ver.chaupicho.app';
const linkAnuncio = (id) => LINKS ? `${LINKS}/a/${id}?i=${st.me?.invite_code || ''}` : `${APP_URL}#/a/${id}?i=${st.me?.invite_code || ''}`;
const linkInvitacion = () => LINKS ? `${LINKS}/i/${st.me?.invite_code}` : `${APP_URL}#/i/${st.me?.invite_code}`;
function entregaTexto(l) {
  if (l.delivery_type === 'retiro') return 'Se retira por ' + (l.delivery_place || 'a definir');
  if (l.delivery_type === 'envio') return 'Envío a domicilio';
  return 'A coordinar por WhatsApp';
}
function grado(pid) {
  if (!st.me) return '';
  if (pid === st.me.id) return 'Es tuyo';
  const d = st.deg[pid];
  if (!d) return '';
  if (d.steps === 1) return 'Amistad directa';
  return `${d.steps} pasos · vía ${st.people[d.via]?.name || '…'}`;
}
const fotoUrl = (path) => path ? sb.storage.from('fotos').getPublicUrl(path).data.publicUrl : null;
async function copiar(txt) { try { await navigator.clipboard.writeText(txt); toast('Link copiado'); } catch { toast('No se pudo copiar'); } }

const I = {
  volver: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  cerrar: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  compartir: (s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`,
  chat: (s = 18) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/></svg>`,
  foto: (s = 30) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>`,
  camara: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  lupa: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  invitar: (s = 22) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M19 8v6M16 11h6"/></svg>`,
  casa: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  mas: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>',
  persona: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  pin: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  camion: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
  link: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  pasos: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="12" r="2.5"/><path d="M7.5 12h9"/></svg>',
  flecha: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
};
const pill = (txt) => txt ? `<span class="tag tag-lila">${I.pasos}${esc(txt)}</span>` : '';
const logo = '<a class="logo" href="#/" aria-label="Chaupicho, ir al inicio">chaupicho<b>.</b></a>';
const sonidoCaja = new Audio('caja.mp3'); sonidoCaja.preload = 'auto';

function tabs(activa) {
  const t = (h, k, ic, txt) => `<a href="${h}"${activa === k ? ' aria-current="page"' : ''}><span>${ic}</span>${txt}</a>`;
  return `<nav class="tabs" aria-label="Secciones"><div class="dentro">${t('#/', 'inicio', I.casa, 'Inicio')}${t('#/publicar', 'publicar', I.mas, 'Publicar')}${t('#/invitar', 'invitar', I.invitar(), 'Invitar')}${t('#/p/yo', 'yo', I.persona, 'Mi perfil')}</div></nav>`;
}

const vistasTxt = (n) => n === 1 ? '1 persona lo vio' : `${n} personas lo vieron`;
function card(l, vistas) {
  const s = st.people[l.seller];
  const f = fotoUrl(l.photos?.[0]);
  return `<a class="card" href="#/a/${l.id}">
    <div class="foto">${f ? `<img src="${esc(f)}" alt="" loading="lazy">` : I.foto()}<span class="tag">${esc(l.categories?.name || '')}</span>${l.status === 'vendido' ? '<span class="tag tag-vendido">Vendido</span>' : ''}</div>
    <div class="info"><span class="precio" style="font-size:20px">${pesos(l.price)}</span><span class="titulo">${esc(l.title)}</span>
    <span class="small">${esc(s?.name || '')}${s?.barrio ? ' · ' + esc(s.barrio) : ''}</span>${l.seller !== st.me?.id ? pill(grado(l.seller)) : ''}${vistas != null ? `<span class="tag tag-lila">${'<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'}${vistasTxt(vistas)}</span>` : ''}</div></a>`;
}

/* ---------- datos ---------- */
async function cargarComunidad() {
  sb.rpc('marcar_visto').then(() => {}, () => {});
  const [c, p, d] = await Promise.all([
    sb.from('categories').select('id,name').order('id'),
    sb.from('profiles').select('id,name,barrio,whatsapp,invited_by,invite_code,avatar,is_founder'),
    sb.rpc('degrees'),
  ]);
  st.cats = c.data || [];
  st.people = Object.fromEntries((p.data || []).map((x) => [x.id, x]));
  st.deg = Object.fromEntries((d.data || []).map((x) => [x.person, x]));
}
async function cargarYo() {
  const { data } = await sb.from('profiles').select('*').eq('id', st.session.user.id).maybeSingle();
  st.me = data;
}

/* ---------- router ---------- */
function ruta() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const q = new URLSearchParams(qs || '');
  return { parts: path.split('/').filter(Boolean), q };
}
window.addEventListener('hashchange', () => render());

async function render() {
  const { parts, q } = ruta();
  if (q.get('i')) ls.set('chaupicho_codigo', q.get('i'));
  if (parts[0] === 'i' && parts[1]) ls.set('chaupicho_codigo', parts[1]);
  window.scrollTo(0, 0);
  document.body.classList.toggle('ancho', parts[0] === 'panel');
  if (parts[0] !== 'editar') st.editando = null;

  if (!st.session) {
    if (parts[0] === 'a' && parts[1]) return vPrevia(parts[1]);
    if (parts[0] === 'i' && parts[1]) return vBienvenida(parts[1]);
    return vEntrar();
  }
  if (!st.me) return vSumarme();
  try {
    switch (parts[0]) {
      case undefined: return await vInicio();
      case 'a': return await vDetalle(parts[1]);
      case 'publicar': return vPublicar();
      case 'editar': return await vEditar(parts[1]);
      case 'publicado': return await vPublicado(parts[1]);
      case 'p': return await vPerfil(parts[1] === 'yo' ? st.me.id : parts[1]);
      case 'invitar': return vInvitar();
      case 'clave': return vClave();
      case 'panel': return await vPanel();
      case 'i': return go('#/');
      default: return go('#/');
    }
  } catch (e) { console.error(e); $app.innerHTML = `<div class="pantalla"><p class="error">Algo falló: ${esc(e.message)}</p><a class="btn btn-borde" href="#/">Volver al inicio</a></div>`; }
}

const OJO = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const OJO_NO = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function campoClave(label, autocomplete, ayuda) {
  return `<label class="campo"><span>${label}</span><span style="position:relative;display:block"><input class="entrada" type="password" name="clave" required minlength="6" autocomplete="${autocomplete}" style="padding-right:56px"><button type="button" data-ver aria-label="Mostrar contraseña" aria-pressed="false" style="position:absolute;right:4px;top:2px;width:44px;height:44px;border:0;background:transparent;color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer">${OJO}</button></span>${ayuda ? `<span class="ayuda">${ayuda}</span>` : ''}</label>`;
}
function activarOjos() {
  document.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = () => {
    const inp = b.previousElementSibling; const ver = inp.type === 'password';
    inp.type = ver ? 'text' : 'password';
    b.innerHTML = ver ? OJO_NO : OJO;
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
    b.setAttribute('aria-pressed', String(ver));
  }));
}

/* ---------- pantallas sin cuenta ---------- */
async function vEntrar(msgInv, modo) {
  const cod = ls.get('chaupicho_codigo');
  let quien = null;
  if (cod) { const { data } = await sb.rpc('inviter_name', { p_code: cod }); quien = data; }
  modo ||= quien ? 'crear' : 'entrar';
  const crear = modo === 'crear';
  if (!ls.get('chaupicho_siguiente') && location.hash.startsWith('#/a/')) ls.set('chaupicho_siguiente', location.hash.split('?')[0]);
  $app.innerHTML = `<div class="pantalla" style="padding-top:40px">
    ${logo}
    <h1 class="h-xl">Un mercado de cosas usadas entre amigos.</h1>
    ${quien ? `<div class="tarjeta fila" style="padding:12px 16px">${avatar({ id: cod, name: quien })}<p><b>${esc(quien)}</b> te invitó a Chaupicho.</p></div>` : '<p>Chaupicho es solo por invitación. Si ya sos parte, entrá con tu mail y tu contraseña.</p>'}
    <form id="f" class="col g12">
      <h2 class="h-2">${crear ? 'Creá tu cuenta' : 'Entrá a tu cuenta'}</h2>
      <label class="campo"><span>Tu mail</span><input class="entrada" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="nombre@mail.com"></label>
      ${campoClave(crear ? 'Elegí una contraseña' : 'Tu contraseña', crear ? 'new-password' : 'current-password', crear ? 'Mínimo 6 caracteres.' : '')}
      <div id="msg">${msgInv ? `<p class="error">${esc(msgInv)}</p>` : ''}</div>
      <button class="btn btn-primario ancho" type="submit">${crear ? 'Crear cuenta' : 'Entrar'}</button>
      <button class="btn btn-borde ancho" type="button" id="cambiar">${crear ? 'Ya tengo cuenta' : 'Crear una cuenta nueva'}</button>
      ${crear ? '' : '<button class="btn ancho" type="button" id="olvide" style="background:transparent;color:var(--lila-ink);height:44px">Me olvidé la contraseña</button>'}
    </form>
  </div>`;
  activarOjos();
  const f = document.getElementById('f');
  const m = document.getElementById('msg');
  document.getElementById('cambiar').onclick = () => vEntrar(null, crear ? 'entrar' : 'crear');
  const olv = document.getElementById('olvide');
  if (olv) olv.onclick = async () => {
    const email = f.elements.email.value.trim();
    if (!email) { m.innerHTML = '<p class="error">Escribí tu mail arriba y tocá de nuevo.</p>'; return; }
    olv.disabled = true;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_URL });
    m.innerHTML = error ? `<p class="error">No pudimos mandar el mail: ${esc(error.message)}</p>` : `<div class="tarjeta" style="padding:12px 16px"><p>Te mandamos un mail a <b>${esc(email)}</b> para elegir una contraseña nueva.</p></div>`;
    olv.disabled = false;
  };
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = crear ? 'Creando…' : 'Entrando…';
    const email = f.elements.email.value.trim(), password = f.elements.clave.value;
    const res = crear ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL } }) : await sb.auth.signInWithPassword({ email, password });
    const err = res.error;
    if (err) {
      const txt = /invalid login/i.test(err.message) ? 'El mail o la contraseña no coinciden.'
        : /already registered/i.test(err.message) ? 'Ese mail ya tiene cuenta: tocá "Ya tengo cuenta".'
        : /password/i.test(err.message) ? 'La contraseña tiene que tener al menos 6 caracteres.'
        : err.message;
      m.innerHTML = `<p class="error">${esc(txt)}</p>`; btn.disabled = false; btn.textContent = crear ? 'Crear cuenta' : 'Entrar'; return;
    }
    if (!res.data.session) { f.innerHTML = `<div class="tarjeta col g8" style="padding:16px"><span class="h-2">Confirmá tu mail</span><p>Te mandamos un mail a <b>${esc(email)}</b> para confirmar la cuenta.</p></div>`; return; }
    await entrarCon(res.data.session);
  };
}

async function entrarCon(session) {
  st.session = session;
  await cargarYo();
  if (st.me) {
    await cargarComunidad();
    const sig = ls.get('chaupicho_siguiente'); ls.set('chaupicho_siguiente', null);
    if (sig && location.hash !== sig) { location.hash = sig; return; }
  }
  if (!st.me || location.hash === '#/entrar') { location.hash = '#/'; if (!st.me) render(); return; }
  render();
}

function vClave(recuperando) {
  $app.innerHTML = `<div class="pantalla" style="padding-top:32px">
    ${recuperando ? logo : `<a class="redondo" href="#/p/yo" aria-label="Volver">${I.volver}</a>`}
    <h1 class="h-1">${recuperando ? 'Elegí una contraseña nueva' : 'Tu contraseña'}</h1>
    <p>${recuperando ? 'Con esta vas a entrar desde ahora.' : 'Ponela o cambiala para poder entrar desde cualquier celu con tu mail.'}</p>
    <form id="f" class="col g12">
      ${campoClave('Contraseña nueva', 'new-password', 'Mínimo 6 caracteres.')}
      <div id="msg"></div>
      <button class="btn btn-primario ancho" type="submit">Guardar contraseña</button>
    </form></div>`;
  activarOjos();
  const f = document.getElementById('f');
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    const { error } = await sb.auth.updateUser({ password: f.elements.clave.value });
    if (error) { document.getElementById('msg').innerHTML = `<p class="error">${esc(error.message)}</p>`; btn.disabled = false; return; }
    toast('Contraseña guardada'); go('#/p/yo');
  };
}

async function vBienvenida(code) {
  const { data: quien } = await sb.rpc('inviter_name', { p_code: code });
  if (!quien) return vEntrar('Ese link de invitación no es válido. Pedile uno nuevo a quien te invitó.');
  const fila = (ic, txt) => `<span class="fila" style="align-items:flex-start"><span class="icono-cuadro" style="background:var(--lila);color:var(--ink)">${ic}</span><p style="color:#fff;padding-top:7px">${txt}</p></span>`;
  $app.innerHTML = `<div class="plena" style="padding-top:32px;padding-bottom:40px">
    <span class="logo" style="color:#fff">chaupicho<b>.</b></span>
    <div class="col g16" style="margin-top:8px">${avatar({ id: code, name: quien }, 72)}
      <h1 class="h-xl" style="color:var(--lila)">${esc(quien)} te invitó a Chaupicho</h1>
      <p style="font-size:17px;color:#fff">Un mercado de cosas usadas entre amigos.</p></div>
    <div class="col g12" style="padding:20px;border-radius:20px;background:rgba(255,255,255,.08)">
      ${fila(I.lupa, 'Ves lo que venden tus amigos, y los amigos de tus amigos.')}
      ${fila(I.camara, 'Publicás lo que ya no usás en un minuto.')}
      ${fila(I.chat(18), 'Lo demás lo arreglan por WhatsApp.')}
    </div>
    <a class="btn btn-lila ancho" style="height:56px;font-size:15px" href="#/entrar">Sumarme</a>
  </div>`;
}

async function vPrevia(id) {
  const code = ruta().q.get('i') || ls.get('chaupicho_codigo') || '';
  const { data } = await sb.rpc('listing_preview', { p_id: id, p_code: code });
  const l = data?.[0];
  if (!l) return vEntrar();
  ls.set('chaupicho_siguiente', '#/a/' + id);
  const quien = l.sharer_name || 'Un amigo';
  const f = fotoUrl(l.photo);
  $app.innerHTML = `<div class="pantalla" style="padding-bottom:40px">
    ${logo}
    <div class="fila">${avatar({ id: code, name: quien })}<p><b>${esc(quien)}</b> te compartió ${l.seller_name === quien ? 'algo que vende' : `un anuncio de <b>${esc(l.seller_name)}</b>`}</p></div>
    <div class="tarjeta" style="overflow:hidden;box-shadow:var(--shadow-float)">
      <div style="aspect-ratio:4/3;background:var(--rubor);display:flex;align-items:center;justify-content:center;color:var(--muted)">${f ? `<img src="${esc(f)}" alt="Foto de ${esc(l.title)}" style="width:100%;height:100%;object-fit:cover">` : I.foto(48)}</div>
      <div class="col g4" style="padding:16px"><span class="caption" style="color:var(--lila-ink)">${esc(l.category)}</span><span style="font-size:15px;font-weight:700">${esc(l.title)}</span>
      <span class="precio" style="font-size:30px">${pesos(l.price)}</span><span class="small">Entrega: ${esc(entregaTexto(l).replace(/^./, (c) => c.toLowerCase()))}</span>${l.status === 'vendido' ? '<span class="tag tag-vendido" style="margin-top:4px">Ya se vendió</span>' : ''}</div>
    </div>
    <div style="background:var(--grad-lila);border-radius:20px;padding:20px" class="col g4"><span class="h-2">Un mercado entre amigos</span><p>En Chaupicho se entra por invitación. Este link es tu invitación${l.sharer_name ? ' de parte de ' + esc(l.sharer_name) : ''}.</p></div>
    <a class="btn btn-primario ancho" href="#/entrar">Sumarme y escribirle a ${esc(l.seller_name)}</a>
  </div>`;
}

/* ---------- sumarse ---------- */
function vSumarme(err) {
  const code = ls.get('chaupicho_codigo') || '';
  $app.innerHTML = `<div class="pantalla" style="padding-top:32px">
    ${logo}
    <h1 class="h-1">Contanos quién sos</h1>
    <p>Así te reconocen tus amigos y te pueden escribir por lo que vendés.</p>
    <form id="f" class="col g16">
      <label class="campo"><span>Tu nombre</span><input class="entrada" name="name" required maxlength="60" autocomplete="given-name" placeholder="Como te dicen tus amigos"></label>
      <label class="campo"><span>Tu WhatsApp</span><input class="entrada" name="wa" required inputmode="tel" autocomplete="tel" placeholder="11 2345 6789"><span class="ayuda">Con código de área, sin 0 ni 15.</span></label>
      <label class="campo"><span>Tu barrio <span class="ayuda">(opcional)</span></span><input class="entrada" name="barrio" maxlength="80" placeholder="Ej: Belgrano"></label>
      ${err ? `<p class="error">${esc(err)}</p>` : ''}
      <button class="btn btn-primario ancho" type="submit">Entrar a Chaupicho</button>
      <button class="btn btn-borde ancho" type="button" id="salir">Usar otro mail</button>
    </form></div>`;
  const f = document.getElementById('f');
  document.getElementById('salir').onclick = salir;
  f.onsubmit = async (e) => {
    e.preventDefault();
    const num = waNum(f.wa.value);
    if (num.length < 12 || num.length > 14) return vSumarme('Revisá el número de WhatsApp: tiene que tener código de área.');
    f.querySelector('[type=submit]').disabled = true;
    const { data, error } = await sb.rpc('join_chaupicho', { p_code: code, p_name: f.elements.name.value, p_whatsapp: num, p_barrio: f.barrio.value });
    if (error) return vSumarme(error.message);
    st.me = data; ls.set('chaupicho_codigo', null);
    await cargarComunidad();
    const sig = ls.get('chaupicho_siguiente') || '#/'; ls.set('chaupicho_siguiente', null);
    go(sig);
  };
}
async function salir() { await sb.auth.signOut(); st.session = null; st.me = null; go('#/'); }

/* ---------- inicio ---------- */
async function vInicio() {
  const { data, error } = await sb.from('listings').select('*, categories(name)').eq('status', 'activo').order('created_at', { ascending: false }).limit(300);
  if (error) throw error;
  const todos = data || [];
  const pinta = () => {
    const { cat, q } = st.filtro;
    const qq = q.trim().toLowerCase();
    const lista = todos.filter((l) => (!cat || l.category_id === cat) && (!qq || (l.title + ' ' + (l.description || '') + ' ' + (st.people[l.seller]?.name || '')).toLowerCase().includes(qq)));
    document.getElementById('lista').innerHTML = lista.length ? `<div class="grilla">${lista.map((l) => card(l)).join('')}</div>`
      : todos.length ? '<div class="vacio"><p class="small">No hay nada con ese filtro.</p></div>'
      : `<div class="vacio"><span class="h-2">Todavía no hay nada publicado</span><p class="small">Publicá lo primero que quieras vender e invitá a tus amigos.</p><a class="btn btn-primario" href="#/publicar">Publicar algo</a></div>`;
    document.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String((Number(b.dataset.cat) || null) === cat)));
  };
  $app.innerHTML = `<header class="cabecera">
      <div class="fila entre">${logo}<a class="pill-btn" href="#/invitar">${I.invitar(18)}Invitar</a></div>
      <h1 class="h-1">¿Qué venden tus amigos?</h1>
      <label class="buscador">${I.lupa}<span class="vh">Buscar</span><input id="q" type="search" placeholder="Buscar entre lo que venden" value="${esc(st.filtro.q)}"></label>
    </header>
    <nav class="chips" aria-label="Categorías"><button class="chip" data-cat="0" type="button">Todo</button>${st.cats.map((c) => `<button class="chip" type="button" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}</nav>
    <section class="pantalla con-tabs" style="padding-top:12px;gap:12px"><h2 class="h-2">Lo último de tus amigos</h2><div id="lista"></div></section>
    ${tabs('inicio')}`;
  document.getElementById('q').oninput = (e) => { st.filtro.q = e.target.value; pinta(); };
  document.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => { st.filtro.cat = Number(b.dataset.cat) || null; pinta(); }));
  pinta();
}

/* ---------- detalle ---------- */
async function vDetalle(id) {
  const { data: l, error } = await sb.from('listings').select('*, categories(name)').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!l) { $app.innerHTML = `<div class="pantalla"><p class="error">Este anuncio ya no está.</p><a class="btn btn-borde" href="#/">Volver al inicio</a></div>`; return; }
  const s = st.people[l.seller] || {};
  const mio = l.seller === st.me.id;
  const fotos = (l.photos || []).map(fotoUrl);
  if (!mio) sb.rpc('registrar_vista', { p_id: l.id }).then(() => {}, () => {});
  const share = waShare(`¡Mirá esto en Chaupicho! ${l.title} a ${pesos(l.price)}. ${linkAnuncio(l.id)}`);
  const iconoEntrega = l.delivery_type === 'retiro' ? I.pin : l.delivery_type === 'envio' ? I.camion : I.chat(18);
  $app.innerHTML = `<div class="galeria">
      ${fotos.length ? `<div class="tira" id="tira">${fotos.map((f, i) => `<img src="${esc(f)}" alt="Foto ${i + 1} de ${esc(l.title)}" data-ampliar="${i}" style="cursor:zoom-in">`).join('')}</div>` : `<div class="sin-foto">${I.foto(56)}</div>`}
      <button class="redondo izq" type="button" id="atras" aria-label="Volver">${I.volver}</button>
      <a class="redondo der" href="${share}" target="_blank" rel="noopener" aria-label="Compartir por WhatsApp">${I.compartir()}</a>
      ${fotos.length > 1 ? `<div class="puntos" aria-hidden="true">${fotos.map((_, i) => `<span class="${i ? '' : 'on'}"></span>`).join('')}</div>` : ''}
    </div>
    <div class="pantalla" style="gap:16px">
      <div class="col g8"><span class="tag tag-cat">${esc(l.categories?.name)}</span>
        <h1 class="h-1">${esc(l.title)}</h1>
        <span class="precio" style="font-size:44px;line-height:.95;letter-spacing:-1.6px">${pesos(l.price)}</span>
        ${l.status === 'vendido' ? '<span class="tag tag-vendido">Vendido</span>' : ''}</div>
      <div class="fila" style="gap:10px"><span class="icono-cuadro" style="background:var(--lila-soft)">${iconoEntrega}</span><span class="col" style="gap:1px"><span class="caption" style="color:var(--muted)">Entrega</span><span style="font-size:15px;font-weight:700">${esc(entregaTexto(l))}</span></span></div>
      ${l.description ? `<p style="white-space:pre-line">${esc(l.description)}</p>` : ''}
      <a class="tarjeta vendedor" href="#/p/${l.seller}">${avatar(s)}
        <span class="col g4" style="flex:1"><span style="font-size:15px;font-weight:700">${esc(s.name)}${mio ? ' (vos)' : ''}</span>${mio ? '' : pill(grado(l.seller))}</span>
        <span style="font-size:13px;font-weight:700;color:var(--lila-ink)">Ver perfil</span><span style="color:var(--lila-ink);display:flex">${I.flecha}</span></a>
    </div>
    <div class="barra-abajo"><div class="dentro">
      ${mio
        ? `<a class="btn btn-borde" href="#/editar/${l.id}" id="editar">Editar</a><button class="btn btn-primario" type="button" id="estado">${l.status === 'vendido' ? 'Volver a publicar' : 'Marcar como vendido'}</button>`
        : `<a class="btn btn-borde" href="${share}" target="_blank" rel="noopener">${I.compartir(18)}Compartir</a><a class="btn btn-primario" href="${waChat(s.whatsapp, `¡Hola ${s.name}! Vi tu ${l.title} en Chaupicho. ¿Sigue disponible?`)}" target="_blank" rel="noopener">${I.chat()}Escribile por WhatsApp</a>`}
    </div></div>`;
  document.getElementById('atras').onclick = () => (history.length > 1 ? history.back() : go('#/'));
  const tira = document.getElementById('tira');
  document.querySelectorAll('[data-ampliar]').forEach((im) => (im.onclick = () => visor(fotos, Number(im.dataset.ampliar), l.title)));
  if (tira && fotos.length > 1) tira.onscroll = () => { const i = Math.round(tira.scrollLeft / tira.clientWidth); document.querySelectorAll('.puntos span').forEach((p, k) => p.classList.toggle('on', k === i)); };
  if (mio) {
    document.getElementById('editar').onclick = () => { st.desdeDetalle = l.id; };
    document.getElementById('estado').onclick = async (e) => {
      e.target.disabled = true;
      const nuevo = l.status === 'vendido' ? 'activo' : 'vendido';
      if (nuevo === 'vendido') { try { sonidoCaja.currentTime = 0; sonidoCaja.play().catch(() => {}); } catch {} }
      const { error } = await sb.from('listings').update({ status: nuevo }).eq('id', l.id);
      if (error) { toast('No se pudo guardar'); e.target.disabled = false; return; }
      toast(nuevo === 'vendido' ? '¡Bien ahí! Quedó como vendido' : 'Está publicado de nuevo');
      vDetalle(l.id);
    };
  }
}

/* ---------- visor de fotos ---------- */
function visor(fotos, inicio, titulo) {
  const v = document.createElement('div');
  v.className = 'visor'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Fotos de ' + titulo);
  v.innerHTML = `<div class="tira">${fotos.map((f, i) => `<div class="cuadro"><img src="${esc(f)}" alt="Foto ${i + 1} de ${esc(titulo)}"></div>`).join('')}</div>
    <button type="button" class="redondo cerrar" aria-label="Cerrar">${I.cerrar}</button>
    ${fotos.length > 1 ? `<span class="contador" aria-live="polite">${inicio + 1} / ${fotos.length}</span>` : ''}`;
  document.body.appendChild(v);
  document.body.style.overflow = 'hidden';
  const tira = v.querySelector('.tira');
  requestAnimationFrame(() => { tira.scrollLeft = inicio * tira.clientWidth; });
  const cont = v.querySelector('.contador');
  tira.onscroll = () => { if (cont) cont.textContent = `${Math.round(tira.scrollLeft / tira.clientWidth) + 1} / ${fotos.length}`; };
  const cerrar = () => { v.remove(); document.body.style.overflow = ''; window.removeEventListener('keydown', tecla); window.removeEventListener('hashchange', cerrar); };
  const tecla = (e) => { if (e.key === 'Escape') cerrar(); };
  v.querySelector('.cerrar').onclick = cerrar;
  window.addEventListener('keydown', tecla);
  window.addEventListener('hashchange', cerrar);
  v.querySelector('.cerrar').focus();
}

/* ---------- publicar ---------- */
async function achicarCuadrada(file, lado = 480) {
  const bmp = await createImageBitmap(file);
  const m = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas'); c.width = c.height = Math.min(lado, m);
  c.getContext('2d').drawImage(bmp, (bmp.width - m) / 2, (bmp.height - m) / 2, m, m, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
}
async function achicar(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
}

async function vEditar(id) {
  if (st.editando?.id !== id) {
    const { data: l } = await sb.from('listings').select('*').eq('id', id).maybeSingle();
    if (!l || l.seller !== st.me.id) return go('#/');
    st.editando = { id, originales: [...(l.photos || [])], fotos: (l.photos || []).map((path) => ({ path, url: fotoUrl(path) })), title: l.title, price: String(l.price), cat: l.category_id, desc: l.description || '', tipo: l.delivery_type, lugar: l.delivery_place || st.me.barrio || '', nuevaCat: false };
  }
  vPublicar();
}

function vPublicar(err) {
  const ed = st.editando;
  const b = ed || (st.borrador ||= { fotos: [], title: '', price: '', cat: null, desc: '', tipo: 'retiro', lugar: st.me.barrio || '', nuevaCat: false });
  $app.innerHTML = `<div class="pantalla" style="padding-bottom:48px">
    <div class="fila entre"><a class="redondo" href="${ed ? '#/a/' + ed.id : '#/'}" id="cerrar" aria-label="Cerrar">${I.cerrar}</a><span class="caption" style="color:var(--muted)">${ed ? 'Editar anuncio' : 'Nuevo anuncio'}</span><span style="width:44px"></span></div>
    <h1 class="h-1">${ed ? 'Editá tu anuncio' : '¿Qué vendés?'}</h1>
    <form id="f" class="col" style="gap:20px" novalidate>
      <div class="col g8"><span class="leyenda">Fotos</span>
        <div class="fotos-grilla">
          ${b.fotos.map((f, i) => `<div class="foto-slot"><img src="${f.url}" alt="Foto ${i + 1}"><button type="button" class="quitar" data-quitar="${i}" aria-label="Quitar foto ${i + 1}">${I.cerrar}</button></div>`).join('')}
          ${b.fotos.length < MAX_FOTOS ? `<label class="foto-agregar">${I.camara}Agregar fotos<input class="vh" type="file" id="archivos" accept="image/*" multiple></label>` : ''}
        </div>
        <span class="ayuda">La primera es la que ven tus amigos en el inicio. Hasta ${MAX_FOTOS}.</span></div>
      <label class="campo"><span>Título</span><input class="entrada" name="title" maxlength="80" placeholder="Ej: Cochecito plegable" value="${esc(b.title)}"></label>
      <label class="campo"><span>Contá un poco</span><textarea class="entrada" name="desc" rows="3" maxlength="1000" placeholder="Estado, medidas, por qué lo vendés…">${esc(b.desc)}</textarea></label>
      <label class="campo"><span>Precio</span><span class="entrada fila" style="gap:4px"><span class="precio" style="font-size:20px">$</span><input name="price" inputmode="numeric" placeholder="0" value="${esc(b.price)}" style="flex:1;border:0;outline:none;background:transparent;font-family:var(--display);font-weight:800;font-size:20px;color:var(--ink);min-width:0"></span></label>
      <fieldset><legend class="leyenda">Categoría</legend><div class="chips-wrap">
        ${st.cats.map((c) => `<button type="button" class="chip${b.cat === c.id ? ' on' : ''}" data-elegir="${c.id}" aria-pressed="${b.cat === c.id}">${esc(c.name)}</button>`).join('')}
        ${b.nuevaCat ? '' : '<button type="button" class="chip nueva" id="nueva">+ Nueva categoría</button>'}</div>
        ${b.nuevaCat ? `<div class="fila g8" style="margin-top:8px"><input class="entrada" id="nombreCat" maxlength="30" placeholder="Nombre de la categoría" aria-label="Nombre de la nueva categoría"><button type="button" class="btn btn-suave" id="crearCat">Agregar</button></div>` : ''}
      </fieldset>
      <fieldset class="col g8"><legend class="leyenda">¿Cómo se entrega?</legend>
        <div class="opcion${b.tipo === 'retiro' ? ' on' : ''}" style="flex-direction:column;align-items:stretch;gap:10px;cursor:default">
          <label class="fila" style="cursor:pointer"><input type="radio" name="tipo" value="retiro"${b.tipo === 'retiro' ? ' checked' : ''}><span style="font-size:15px;font-weight:700">Se retira por…</span></label>
          ${b.tipo === 'retiro' ? `<input class="entrada" name="lugar" maxlength="80" aria-label="Lugar de retiro" placeholder="Barrio, esquina o lugar" value="${esc(b.lugar)}" style="height:44px;border-radius:12px">` : ''}</div>
        <label class="opcion${b.tipo === 'envio' ? ' on' : ''}"><input type="radio" name="tipo" value="envio"${b.tipo === 'envio' ? ' checked' : ''}><span style="font-size:15px;font-weight:700">Envío a domicilio</span></label>
        <label class="opcion${b.tipo === 'coordinar' ? ' on' : ''}"><input type="radio" name="tipo" value="coordinar"${b.tipo === 'coordinar' ? ' checked' : ''}><span class="col" style="gap:2px"><span style="font-size:15px;font-weight:700">A coordinar</span><span class="ayuda">Lo hablan por WhatsApp</span></span></label>
      </fieldset>
      ${err ? `<p class="error" id="err">${esc(err)}</p>` : ''}
      <button class="btn btn-primario ancho" type="submit" id="pub" style="height:56px;font-size:15px;margin-top:8px">${ed ? 'Guardar cambios' : 'Publicar'}</button>
      ${ed ? '<button class="btn btn-peligro ancho" type="button" id="borrar">Borrar anuncio</button>' : ''}
    </form></div>`;

  if (ed) document.getElementById('cerrar').onclick = (e) => { e.preventDefault(); st.editando = null; salirDeEdicion(ed.id); };
  const f = document.getElementById('f');
  const guardar = () => { b.title = f.elements.title.value; b.price = f.price.value; b.desc = f.desc.value; if (f.lugar) b.lugar = f.lugar.value; };
  document.getElementById('err')?.scrollIntoView({ block: 'center' });
  const arch = document.getElementById('archivos');
  if (arch) arch.onchange = () => {
    guardar();
    for (const file of [...arch.files].slice(0, MAX_FOTOS - b.fotos.length)) b.fotos.push({ file, url: URL.createObjectURL(file) });
    vPublicar();
  };
  document.querySelectorAll('[data-quitar]').forEach((x) => (x.onclick = () => { guardar(); b.fotos.splice(Number(x.dataset.quitar), 1); vPublicar(); }));
  document.querySelectorAll('[data-elegir]').forEach((x) => (x.onclick = () => { guardar(); b.cat = Number(x.dataset.elegir); vPublicar(); }));
  f.querySelectorAll('[name=tipo]').forEach((x) => (x.onchange = () => { guardar(); b.tipo = x.value; vPublicar(); }));
  const nueva = document.getElementById('nueva'); if (nueva) nueva.onclick = () => { guardar(); b.nuevaCat = true; vPublicar(); setTimeout(() => document.getElementById('nombreCat')?.focus(), 0); };
  const crear = document.getElementById('crearCat');
  if (crear) crear.onclick = async () => {
    const nombre = document.getElementById('nombreCat').value.trim();
    if (nombre.length < 2) return toast('Escribí el nombre de la categoría');
    guardar(); crear.disabled = true;
    const ya = st.cats.find((c) => c.name.toLowerCase() === nombre.toLowerCase());
    if (ya) { b.cat = ya.id; b.nuevaCat = false; return vPublicar(); }
    const { data, error } = await sb.from('categories').insert({ name: nombre[0].toUpperCase() + nombre.slice(1), created_by: st.me.id }).select().single();
    if (error) { crear.disabled = false; return toast('No se pudo crear la categoría'); }
    st.cats.push(data); b.cat = data.id; b.nuevaCat = false; vPublicar();
  };
  f.onsubmit = async (e) => {
    e.preventDefault(); guardar();
    const precio = Number(String(b.price).replace(/\D/g, ''));
    if (!b.fotos.length) return vPublicar('Sumá al menos una foto.');
    if (b.title.trim().length < 2) return vPublicar('Poné un título.');
    if (!b.price || !Number.isFinite(precio)) return vPublicar('Poné el precio.');
    if (!b.cat) return vPublicar('Elegí una categoría.');
    if (b.tipo === 'retiro' && !b.lugar.trim()) return vPublicar('Contá por dónde se retira.');
    const btn = document.getElementById('pub'); btn.disabled = true; btn.textContent = 'Subiendo fotos…';
    try {
      const paths = [];
      for (const ft of b.fotos) {
        if (ft.path) { paths.push(ft.path); continue; }
        const blob = await achicar(ft.file);
        const path = `${st.me.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        paths.push(path);
      }
      btn.textContent = ed ? 'Guardando…' : 'Publicando…';
      const campos = {
        title: b.title.trim(), price: precio, category_id: b.cat, description: b.desc.trim() || null,
        delivery_type: b.tipo, delivery_place: b.tipo === 'retiro' ? b.lugar.trim() : null, photos: paths,
      };
      if (ed) {
        const { error } = await sb.from('listings').update(campos).eq('id', ed.id);
        if (error) throw error;
        const sobran = ed.originales.filter((x) => !paths.includes(x));
        if (sobran.length) await sb.storage.from('fotos').remove(sobran);
        b.fotos.forEach((x) => x.file && URL.revokeObjectURL(x.url));
        st.editando = null; toast('Cambios guardados'); salirDeEdicion(ed.id);
        return;
      }
      const { data, error } = await sb.from('listings').insert(campos).select('id').single();
      if (error) throw error;
      b.fotos.forEach((x) => URL.revokeObjectURL(x.url));
      st.borrador = null;
      reemplazar('#/publicado/' + data.id);
    } catch (er) { console.error(er); vPublicar((ed ? 'No se pudo guardar: ' : 'No se pudo publicar: ') + er.message); }
  };
  const borrar = document.getElementById('borrar');
  if (borrar) borrar.onclick = async () => {
    if (borrar.dataset.ok !== '1') { borrar.dataset.ok = '1'; borrar.textContent = '¿Seguro? Tocá de nuevo para borrarlo'; return; }
    borrar.disabled = true;
    const { error } = await sb.from('listings').delete().eq('id', ed.id);
    if (error) { toast('No se pudo borrar'); borrar.disabled = false; borrar.dataset.ok = ''; borrar.textContent = 'Borrar anuncio'; return; }
    if (ed.originales.length) await sb.storage.from('fotos').remove(ed.originales);
    st.editando = null; st.desdeDetalle = null; toast('Anuncio borrado'); reemplazar('#/p/yo');
  };
}

async function vPublicado(id) {
  const { data: l } = await sb.from('listings').select('*').eq('id', id).maybeSingle();
  if (!l) return go('#/');
  const f = fotoUrl(l.photos?.[0]);
  const txt = `¡Vendo ${l.title} a ${pesos(l.price)}! Miralo en Chaupicho y si conocés a alguien que lo busque, pasáselo. ${linkAnuncio(l.id)}`;
  $app.innerHTML = `<div class="plena">
    <a class="redondo" href="#/" aria-label="Cerrar">${I.cerrar}</a>
    <h1 class="h-xl" style="color:var(--lila);margin-top:8px">¡Listo, ya está en Chaupicho!</h1>
    <p>Ahora compartilo por WhatsApp. Tus amigos lo ven y, si conocen a alguien que lo necesita, lo pueden reenviar.</p>
    <div class="col g8"><span class="caption" style="color:#d9affb">Así llega el mensaje</span>
      <div style="background:#fff;color:var(--ink);border-radius:20px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.25)" class="col" >
        <div class="fila" style="background:var(--sunken);border-radius:16px;padding:8px;margin-bottom:10px">
          <div style="width:64px;height:64px;border-radius:10px;overflow:hidden;background:var(--rubor);flex:none;display:flex;align-items:center;justify-content:center;color:var(--muted)">${f ? `<img src="${esc(f)}" alt="" style="width:100%;height:100%;object-fit:cover">` : I.foto(24)}</div>
          <div class="col" style="gap:2px;min-width:0"><span style="font-size:15px;font-weight:700">${esc(l.title)}</span><span class="precio" style="font-size:20px">${pesos(l.price)}</span><span class="caption" style="color:var(--muted)">chaupicho</span></div>
        </div>
        <p>¡Vendo ${esc(l.title)}! Miralo en Chaupicho y si conocés a alguien que lo busque, pasáselo.</p>
      </div></div>
    <div class="col g12" style="margin-top:auto">
      <a class="btn btn-lila ancho" style="height:56px;font-size:15px" href="${waShare(txt)}" target="_blank" rel="noopener">${I.chat(20)}Compartir por WhatsApp</a>
      <button class="btn btn-borde-claro ancho" type="button" id="copiar">${I.link}Copiar link</button>
      <a href="#/a/${l.id}" style="align-self:center;min-height:44px;display:flex;align-items:center;font-size:14px;font-weight:700">Ver mi anuncio</a>
    </div></div>`;
  document.getElementById('copiar').onclick = () => copiar(linkAnuncio(l.id));
}

/* ---------- perfil ---------- */
async function vPerfil(id) {
  let p = st.people[id];
  if (!p) { await cargarComunidad(); p = st.people[id]; }
  if (!p) return go('#/');
  const yo = id === st.me.id;
  const q = sb.from('listings').select('*, categories(name)').eq('seller', id).order('created_at', { ascending: false });
  const [{ data: ls_ }, cad] = await Promise.all([yo ? q : q.eq('status', 'activo'), yo ? Promise.resolve({ data: [] }) : sb.rpc('chain_to', { target: id })]);
  const lista = ls_ || [];
  let vistas = {};
  if (yo) { const { data: vv } = await sb.rpc('mis_vistas'); vistas = Object.fromEntries((vv || []).map((x) => [x.listing_id, x.vistas])); }
  const activos = lista.filter((l) => l.status === 'activo').length;
  const cadena = cad.data || [];
  const chainHtml = cadena.map((c, i) => `${i ? '<span class="linea" aria-hidden="true"></span>' : ''}<span class="eslabon">${avatar(st.people[c.id] || c, 40, c.id === st.me.id)}<span>${c.id === st.me.id ? 'Vos' : esc(c.name)}</span></span>`).join('');
  $app.innerHTML = `<div style="background:linear-gradient(180deg,#fdebea 0%,var(--bg) 260px)"><div class="pantalla con-tabs">
    <div class="fila entre">${yo ? logo : `<button class="redondo" type="button" id="atras" aria-label="Volver">${I.volver}</button>`}${yo && st.me.is_admin ? '<a class="pill-btn" href="#/panel">Panel</a>' : ''}</div>
    <div class="fila" style="gap:16px">${yo ? `<label style="position:relative;cursor:pointer;flex:none" aria-label="Cambiar tu foto de perfil">${avatar(p, 72)}<span style="position:absolute;right:-4px;bottom:-4px;width:30px;height:30px;border-radius:999px;background:var(--ciruela);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #fdebea"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><input class="vh" type="file" accept="image/*" id="foto-perfil"></label>` : avatar(p, 72)}<div class="col g4"><h1 class="h-1">${esc(p.name)}${yo ? ' <span class="small">(vos)</span>' : ''}</h1>
      <span class="small">${p.barrio ? esc(p.barrio) + ' · ' : ''}${activos === 1 ? '1 cosa a la venta' : activos + ' cosas a la venta'}</span></div></div>
    ${!yo && cadena.length > 1 ? `<div class="tarjeta col g12" style="padding:16px"><span class="fila entre"><span style="font-size:15px;font-weight:700">Cómo llegás a ${esc(p.name)}</span>${pill(grado(id))}</span><div class="cadena" role="img" aria-label="${esc(cadena.map((c) => (c.id === st.me.id ? 'Vos' : c.name)).join(', '))}">${chainHtml}</div></div>` : ''}
    ${!yo ? `<a class="btn btn-primario ancho" href="${waChat(p.whatsapp, `¡Hola ${p.name}! Te escribo desde Chaupicho.`)}" target="_blank" rel="noopener">${I.chat()}Escribile a ${esc(p.name)} por WhatsApp</a>` : ''}
    <section class="col g12"><h2 class="h-2">${yo ? 'Lo que publicaste' : 'Lo que vende ' + esc(p.name)}</h2>
      ${lista.length ? `<div class="grilla">${lista.map((l) => card(l, yo ? (vistas[l.id] || 0) : null)).join('')}</div>` : `<div class="vacio"><p class="small">${yo ? 'Todavía no publicaste nada.' : 'No tiene nada publicado por ahora.'}</p>${yo ? '<a class="btn btn-primario" href="#/publicar">Publicar algo</a>' : ''}</div>`}
    </section>
    ${yo ? `<section class="col g8" style="margin-top:8px"><h2 class="h-2">Tu cuenta</h2><div class="tarjeta" style="padding:4px 16px">
      <a href="#/clave" class="fila entre" style="min-height:52px;text-decoration:none;color:var(--ink);font-size:15px;font-weight:700">Cambiar contraseña<span style="color:var(--muted);display:flex">${I.flecha}</span></a>
      <button type="button" id="salir" class="fila" style="width:100%;min-height:52px;border:0;border-top:1px solid var(--line);background:transparent;padding:0;font-size:15px;font-weight:700;color:var(--coral-ink);cursor:pointer">Salir de Chaupicho</button>
    </div></section>` : ''}</div></div>
    ${tabs(yo ? 'yo' : '')}`;
  document.getElementById('atras')?.addEventListener('click', () => (history.length > 1 ? history.back() : go('#/')));
  document.getElementById('salir')?.addEventListener('click', salir);
  const fp = document.getElementById('foto-perfil');
  if (fp) fp.onchange = async () => {
    const file = fp.files[0]; if (!file) return;
    toast('Subiendo tu foto…');
    try {
      const blob = await achicarCuadrada(file);
      const path = `${st.me.id}/perfil-${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg' });
      if (up.error) throw up.error;
      const vieja = st.me.avatar;
      const { error } = await sb.from('profiles').update({ avatar: path }).eq('id', st.me.id);
      if (error) throw error;
      if (vieja) sb.storage.from('fotos').remove([vieja]);
      st.me.avatar = path; if (st.people[st.me.id]) st.people[st.me.id].avatar = path;
      toast('¡Foto actualizada!'); vPerfil(st.me.id);
    } catch (e) { console.error(e); toast('No se pudo subir la foto'); }
  };
}

/* ---------- panel (solo administradores) ---------- */
function hace(fecha) {
  if (!fecha) return 'Nunca';
  const min = Math.round((Date.now() - new Date(fecha)) / 60000);
  if (min < 60) return min <= 1 ? 'Recién' : `Hace ${min} min`;
  const h = Math.round(min / 60); if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? 'Ayer' : `Hace ${d} días`;
}
function columnas(semanas, clave, color) {
  const W = 320, H = 120, base = 92, n = semanas.length, ancho = 26, paso = (W - 16) / n;
  const max = Math.max(1, ...semanas.map((x) => x[clave]));
  const dia = (iso) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
  const total = semanas.reduce((a, x) => a + x[clave], 0);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${total} en las últimas 8 semanas">
    <line x1="8" x2="${W - 8}" y1="${base}" y2="${base}" stroke="#e7e0ee"/>
    ${semanas.map((x, i) => { const v = x[clave]; const h = v ? Math.max(4, (v / max) * 70) : 0; const cx = 8 + paso * i + paso / 2;
      return `${h ? `<rect x="${cx - ancho / 2}" y="${base - h}" width="${ancho}" height="${h}" rx="5" fill="${color}"/>` : ''}
      ${v ? `<text x="${cx}" y="${base - h - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#3c0443">${v}</text>` : ''}
      ${i === 0 || i === n - 1 || i === Math.floor(n / 2) ? `<text x="${cx}" y="${base + 18}" text-anchor="middle" font-size="11" fill="#62526b">${i === n - 1 ? 'Esta sem.' : dia(x.semana)}</text>` : ''}`; }).join('')}
  </svg>`;
}
async function vPanel() {
  if (!st.me.is_admin) return go('#/');
  $app.innerHTML = '<div class="cargando">Cargando el panel…</div>';
  const { data: d, error } = await sb.rpc('admin_panel');
  if (error) throw error;
  const P = Object.fromEntries(d.personas.map((p) => [p.id, p]));
  const hijos = {}; d.personas.forEach((p) => { if (p.invited_by && P[p.invited_by]) (hijos[p.invited_by] ||= []).push(p); });
  const fundadores = d.personas.filter((p) => st.people[p.id]?.is_founder);
  const esFund = new Set(fundadores.map((p) => p.id));
  fundadores.forEach((f) => { if (hijos[f.id]) hijos[f.id] = hijos[f.id].filter((h) => !esFund.has(h.id)); });
  const raices = d.personas.filter((p) => !esFund.has(p.id) && (!p.invited_by || !P[p.invited_by]));
  // generaciones
  const gen = []; const marcar = (p, g) => { gen[g] = (gen[g] || 0) + 1; (hijos[p.id] || []).forEach((h) => marcar(h, g + 1)); };
  fundadores.forEach((f) => marcar(f, 0));
  raices.forEach((r) => marcar(r, 0));
  const maxGen = Math.max(...gen);
  const nodo = (p) => `<li><a href="#/p/${p.id}" class="nodo">${avatar(p, 36)}<span class="nombre">${esc(p.name)}</span>${p.invitados ? `<span class="sub">invitó a ${p.invitados}</span>` : ''}</a>${hijos[p.id] ? `<ul>${hijos[p.id].map(nodo).join('')}</ul>` : ''}</li>`;
  const t = d.totales;
  const tile = (num, txt, sub) => `<div class="tarjeta col g4" style="padding:16px"><span class="precio" style="font-size:30px">${num}</span><span style="font-size:14px;font-weight:700">${txt}</span>${sub ? `<span class="small">${sub}</span>` : ''}</div>`;
  const vistos = [...d.anuncios].filter((a) => a.vistas > 0).sort((a, b) => b.vistas - a.vistas).slice(0, 5);
  const sinVistas = d.anuncios.filter((a) => a.status === 'activo' && a.vistas === 0);
  const invitan = [...d.personas].filter((p) => p.invitados > 0).sort((a, b) => b.invitados - a.invitados).slice(0, 5);
  const actividad = [...d.personas].sort((a, b) => new Date(b.last_seen || 0) - new Date(a.last_seen || 0));
  const fila = (izq, der, i) => `<div class="fila entre" style="padding:12px 0;${i ? 'border-top:1px solid var(--line)' : ''}">${izq}${der}</div>`;
  const persona = (p) => `<a href="#/p/${p.id}" class="fila" style="gap:10px;text-decoration:none;color:var(--ink);min-width:0">${avatar(p, 32)}<span style="font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span></a>`;
  $app.innerHTML = `<div class="pantalla" style="padding-bottom:48px">
    <div class="fila entre"><a class="redondo" href="#/p/yo" aria-label="Volver">${I.volver}</a><span class="caption" style="color:var(--muted)">Solo lo ven los administradores</span><span style="width:44px"></span></div>
    <h1 class="h-1">Panel</h1>

    <section class="col g12"><div class="grilla panel-tiles">
      ${tile(t.personas, t.personas === 1 ? 'Persona' : 'Personas', `${t.activos_7d} abrieron la app esta semana`)}
      ${tile(t.activos, 'Anuncios activos', `${pesos(t.monto_publicado)} publicados`)}
      ${tile(t.vendidos, t.vendidos === 1 ? 'Venta' : 'Ventas', `${pesos(t.monto_vendido)} vendidos`)}
      ${tile(t.vistas, 'Vistas', 'Personas distintas por anuncio')}
    </div></section>

    <section class="col g12"><h2 class="h-2">Crecimiento</h2><p class="small">Últimas 8 semanas.</p><div class="panel-3">
      <div class="tarjeta col g4" style="padding:16px"><span style="font-size:15px;font-weight:700">Personas nuevas</span>${columnas(d.semanas, 'personas', '#3c0443')}</div>
      <div class="tarjeta col g4" style="padding:16px"><span style="font-size:15px;font-weight:700">Anuncios publicados</span>${columnas(d.semanas, 'anuncios', '#7a2cc0')}</div>
      <div class="tarjeta col g4" style="padding:16px"><span style="font-size:15px;font-weight:700">Ventas</span>${columnas(d.semanas, 'ventas', '#0e7c3d')}</div>
    </div></section>

    <section class="col g12"><h2 class="h-2">Árbol de invitaciones</h2>
      <p class="small">Cada persona cuelga de quien la invitó.<span class="solo-celu"> Deslizá para ver todo el árbol.</span></p>
      <div class="panel-arbol"><div class="col g12 panel-lateral"><div class="tarjeta col g8" style="padding:16px"><span style="font-size:15px;font-weight:700">Cómo se multiplica</span>
        ${gen.map((n, g) => `<div class="fila" style="gap:10px"><span class="small" style="width:92px;flex:none">${g === 0 ? 'Fundadores' : `Generación ${g}`}</span><span style="height:22px;border-radius:999px;background:${g === 0 ? 'var(--ink)' : 'var(--lila)'};width:${Math.max(8, (n / maxGen) * 100)}%;max-width:calc(100% - 140px)"></span><span style="font-size:14px;font-weight:700">${n}</span></div>`).join('')}
      </div>
      ${invitan.length ? `<div class="tarjeta" style="padding:4px 16px"><div style="padding:12px 0 0;font-size:15px;font-weight:700">Quienes más invitaron</div>${invitan.map((p, i) => fila(persona(p), `<span class="tag tag-lila">${p.invitados} ${p.invitados === 1 ? 'persona' : 'personas'}</span>`, i)).join('')}</div>` : ''}</div>
      <div class="tarjeta arbol" style="padding:8px 0 20px"><ul>${fundadores.length ? `<li><div class="nodo pareja"><span class="fila" style="gap:0">${fundadores.map((f, i) => `<a href="#/p/${f.id}" style="margin-left:${i ? -8 : 0}px;border-radius:999px;box-shadow:0 0 0 3px #fff;display:flex;text-decoration:none">${avatar(f, 40)}</a>`).join('')}</span><span class="nombre" style="max-width:none">${fundadores.map((f, i) => (i ? (/^h?i(?![aeouáéóú])/i.test(f.name) ? ' e ' : ' y ') : '') + esc(f.name)).join('')}</span><span class="sub">${fundadores.length > 1 ? 'Fundadores' : 'Fundador'}</span></div>${(() => { const kids = fundadores.flatMap((f) => hijos[f.id] || []); return kids.length ? `<ul>${kids.map(nodo).join('')}</ul>` : ''; })()}</li>` : ''}${raices.map(nodo).join('')}</ul></div></div>
      </section>

    <section class="col g12"><h2 class="h-2">Anuncios</h2><div class="panel-3">
      <div class="tarjeta" style="padding:4px 16px"><div style="padding:12px 0 0;font-size:15px;font-weight:700">Los más vistos</div>
        ${vistos.length ? vistos.map((a, i) => fila(`<a href="#/a/${a.id}" class="col" style="gap:2px;text-decoration:none;color:var(--ink);min-width:0"><span style="font-size:15px;font-weight:700">${esc(a.title)}</span><span class="small">${esc(P[a.seller]?.name || '')} · ${pesos(a.price)}${a.status === 'vendido' ? ' · vendido' : ''}</span></a>`, `<span class="tag tag-lila" style="flex:none">${a.vistas} ${a.vistas === 1 ? 'vista' : 'vistas'}</span>`, i)).join('') : '<p class="small" style="padding:12px 0">Todavía no hay vistas.</p>'}
      </div>
      <div class="tarjeta" style="padding:4px 16px"><div style="padding:12px 0 0;font-size:15px;font-weight:700">Sin vistas todavía <span class="small">(${sinVistas.length})</span></div>
        ${sinVistas.length ? sinVistas.slice(0, 8).map((a, i) => fila(`<a href="#/a/${a.id}" style="font-size:15px;font-weight:700;text-decoration:none;color:var(--ink)">${esc(a.title)}</a>`, `<span class="small" style="flex:none">${esc(P[a.seller]?.name || '')}</span>`, i)).join('') : '<p class="small" style="padding:12px 0">Todos los anuncios activos tienen al menos una vista.</p>'}
      </div>
      <div class="tarjeta" style="padding:4px 16px;overflow-x:auto"><div style="padding:12px 0 8px;font-size:15px;font-weight:700">Por rubro</div>
        <table class="tabla"><thead><tr><th>Rubro</th><th>Activos</th><th>Vendidos</th><th>Precio prom.</th></tr></thead><tbody>
        ${d.categorias.map((c) => `<tr><td>${esc(c.name)}</td><td>${c.activos}</td><td>${c.vendidos}</td><td>${c.precio_promedio != null ? pesos(c.precio_promedio) : '—'}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div></section>

    <section class="col g12"><h2 class="h-2">Actividad</h2><p class="small">Ordenado por la última vez que abrieron la app.</p>
      <div class="tarjeta" style="padding:4px 16px;overflow-x:auto">
        <table class="tabla"><thead><tr><th>Persona</th><th>Publicó</th><th>Vendió</th><th>Última vez</th></tr></thead><tbody>
        ${actividad.map((p) => { const viejo = !p.last_seen || Date.now() - new Date(p.last_seen) > 14 * 864e5;
          return `<tr><td>${persona(p)}</td><td>${p.activos + p.vendidos}</td><td>${p.vendidos}</td><td>${viejo ? `<span class="tag tag-vendido">${hace(p.last_seen)}</span>` : hace(p.last_seen)}</td></tr>`; }).join('')}
        </tbody></table>
      </div>
    </section>
  </div>`;
  const arbol = document.querySelector('.arbol');
  if (arbol) arbol.scrollLeft = (arbol.scrollWidth - arbol.clientWidth) / 2;
}

/* ---------- invitar ---------- */
function vInvitar() {
  const invitados = Object.values(st.people).filter((p) => p.invited_by === st.me.id);
  const txt = `¡Te invito a Chaupicho! Es un mercado de cosas usadas entre amigos: ves lo que venden y publicás lo que ya no usás. Entrá desde acá: ${linkInvitacion()}`;
  $app.innerHTML = `<div class="pantalla con-tabs" style="padding-top:32px">
    <h1 class="h-1">Sumá amigos</h1>
    <p>Chaupicho funciona por invitación. Cada amigo que sumás ve lo que vende todo el grupo, y puede invitar a los suyos.</p>
    <a class="btn btn-primario ancho" style="height:56px;font-size:15px" href="${waShare(txt)}" target="_blank" rel="noopener">${I.chat(20)}Invitar por WhatsApp</a>
    <div class="tarjeta fila" style="padding:8px 8px 8px 16px"><span class="small" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(linkInvitacion())}</span><button class="btn btn-suave" type="button" id="copiar">Copiar</button></div>
    <section class="col g12"><h2 class="h-2">Invitaste a</h2>
      ${invitados.length ? `<div class="tarjeta" style="padding:4px 16px">${invitados.map((p, i) => `<a href="#/p/${p.id}" class="fila" style="padding:12px 0;text-decoration:none;color:var(--ink);${i ? 'border-top:1px solid var(--line)' : ''}">${avatar(p, 40)}<span style="flex:1;font-size:15px;font-weight:700">${esc(p.name)}</span><span class="tag tag-ok">Se sumó</span></a>`).join('')}</div>`
        : '<p class="small">Todavía no se sumó nadie con tu link.</p>'}
    </section></div>${tabs('invitar')}`;
  document.getElementById('copiar').onclick = () => copiar(linkInvitacion());
}

/* ---------- arranque ---------- */
async function arrancar() {
  const veniaDelMail = /access_token|error_description/.test(location.hash);
  const recuperando = /type=recovery/.test(location.hash);
  const { data } = await sb.auth.getSession();
  st.session = data.session;
  if (recuperando && st.session) {
    history.replaceState(null, '', APP_URL + '#/clave');
    await cargarYo();
    if (st.me) await cargarComunidad();
    return vClave(true);
  }
  if (veniaDelMail) {
    const sig = st.session ? '#/' : '#/entrar';
    history.replaceState(null, '', APP_URL + sig);
  }
  if (st.session) {
    await cargarYo();
    if (st.me) {
      await cargarComunidad();
      const sig = ls.get('chaupicho_siguiente');
      if (sig && veniaDelMail) { ls.set('chaupicho_siguiente', null); history.replaceState(null, '', APP_URL + sig); }
    }
  }
  sb.auth.onAuthStateChange(async (ev, s) => {
    if (ev === 'PASSWORD_RECOVERY') { st.session = s; await cargarYo(); if (st.me) await cargarComunidad(); return vClave(true); }
    if (ev === 'SIGNED_IN' && !st.session) { st.session = s; await cargarYo(); if (st.me) await cargarComunidad(); render(); }
    if (ev === 'SIGNED_OUT') { st.session = null; st.me = null; }
  });
  await render();
}
function ocultarSplash() {
  const sp = document.getElementById('splash'); if (!sp) return;
  const falta = Math.max(0, 1650 - (Date.now() - (window.__splash || 0)));
  setTimeout(() => { sp.classList.add('fuera'); setTimeout(() => sp.remove(), 400); }, falta);
}
arrancar().catch((e) => console.error(e)).finally(ocultarSplash);
