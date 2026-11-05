// Cloudflare Worker para ver.chaupicho.app
// Arma la vista previa (foto, título y precio) que muestra WhatsApp
// y redirige a la persona a la app.
//   ver.chaupicho.app/a/<id>?i=<código>  →  anuncio
//   ver.chaupicho.app/i/<código>         →  invitación

const APP = 'https://chaupicho.app/';
const SUPABASE_URL = 'https://vuczrujklpdcmhaoqmuy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y3pydWprbHBkY21oYW9xbXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MzI1NzgsImV4cCI6MjEwOTQwODU3OH0.7DGVUz7whunnt3yqA-2NeFEsZqnyGzjirRq1_Xn-TIc';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-AR');

async function rpc(fn, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  return r.json();
}

function pagina({ titulo, descripcion, imagen, destino, url }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Chaupicho">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:url" content="${esc(url)}">
${imagen ? `<meta property="og:image" content="${esc(imagen)}">
<meta property="og:image:secure_url" content="${esc(imagen)}">
<meta property="og:image:type" content="image/jpeg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imagen)}">` : '<meta name="twitter:card" content="summary">'}
<meta http-equiv="refresh" content="0; url=${esc(destino)}">
<link rel="canonical" href="${esc(destino)}">
</head><body style="font-family:system-ui,sans-serif;background:#f4f1f7;color:#3c0443;padding:40px 16px;text-align:center">
<p>Abriendo Chaupicho…</p><p><a href="${esc(destino)}" style="color:#7a2cc0">Tocá acá si no se abre solo</a></p>
<script>location.replace(${JSON.stringify(destino)})</script>
</body></html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const [tipo, id] = url.pathname.split('/').filter(Boolean);
    const codigo = (url.searchParams.get('i') || '').slice(0, 40);
    let datos = { titulo: 'Chaupicho', descripcion: 'Un mercado de cosas usadas entre amigos.', imagen: null, destino: APP, url: url.href };

    try {
      if (tipo === 'a' && /^[0-9a-f-]{36}$/i.test(id || '')) {
        datos.destino = `${APP}#/a/${id}${codigo ? '?i=' + encodeURIComponent(codigo) : ''}`;
        const filas = await rpc('listing_preview', { p_id: id, p_code: codigo });
        const l = Array.isArray(filas) ? filas[0] : null;
        if (l) {
          const vendido = l.status === 'vendido';
          datos.titulo = `${l.title} · ${pesos(l.price)}${vendido ? ' (vendido)' : ''}`;
          datos.descripcion = `Lo vende ${l.seller_name} en Chaupicho, un mercado de cosas usadas entre amigos.`;
          if (l.photo) datos.imagen = `${SUPABASE_URL}/storage/v1/object/public/fotos/${l.photo.split('/').map(encodeURIComponent).join('/')}`;
        }
      } else if (tipo === 'i' && /^[0-9a-z]{4,40}$/i.test(id || '')) {
        datos.destino = `${APP}#/i/${encodeURIComponent(id)}`;
        const quien = await rpc('inviter_name', { p_code: id });
        if (typeof quien === 'string' && quien) {
          datos.titulo = `${quien} te invitó a Chaupicho`;
          datos.descripcion = 'Un mercado de cosas usadas entre amigos. Ves lo que venden y publicás lo que ya no usás.';
        }
      }
    } catch (e) { /* si falla Supabase, igual redirige a la app */ }

    return new Response(pagina(datos), {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    });
  },
};
