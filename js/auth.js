/* ═══════════════════════════════════════
   AUTH — login e verificação
   ═══════════════════════════════════════ */

async function tentarLogin() {
  const val = document.getElementById('authInput').value;
  const btn = document.getElementById('authBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(API_BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha: val }),
    });
    if (r.ok) {
      const { token } = await r.json();
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(AUTH_KEY, 'ok');
      document.getElementById('authOv').style.display = 'none';
      init();
    } else {
      const err = document.getElementById('authErr');
      err.style.opacity = '1';
      document.getElementById('authInput').value = '';
      setTimeout(() => err.style.opacity = '0', 2000);
    }
  } catch (e) {
    const err = document.getElementById('authErr');
    if (err) { err.textContent = 'Sem conexão com servidor'; err.style.opacity = '1'; setTimeout(() => err.style.opacity = '0', 3000); }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function verificarAuth() {
  if (localStorage.getItem(AUTH_KEY) === 'ok' && localStorage.getItem(TOKEN_KEY)) {
    document.getElementById('authOv').style.display = 'none';
    init();
  } else {
    logout();
    setTimeout(() => document.getElementById('authInput').focus(), 100);
  }
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
  const ov = document.getElementById('authOv');
  if (ov) ov.style.display = '';
}
