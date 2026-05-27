/* ═══════════════════════════════════════
   AUTH — login e verificação
   ═══════════════════════════════════════ */

function tentarLogin() {
  const val = document.getElementById('authInput').value;
  if (val === SENHA) {
    localStorage.setItem(AUTH_KEY, 'ok');
    document.getElementById('authOv').style.display = 'none';
    init();
  } else {
    const err = document.getElementById('authErr');
    err.style.opacity = '1';
    document.getElementById('authInput').value = '';
    setTimeout(() => err.style.opacity = '0', 2000);
  }
}

function verificarAuth() {
  if (localStorage.getItem(AUTH_KEY) === 'ok') {
    document.getElementById('authOv').style.display = 'none';
    init();
  } else {
    setTimeout(() => document.getElementById('authInput').focus(), 100);
  }
}
