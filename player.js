(function () {
  'use strict';
  let romURL = null;
  let initialized = false;
  const $ = s => document.querySelector(s);
  function error(message) {
    $('#gameShell').hidden = true;
    $('#message').hidden = false;
    $('#message').querySelector('h2').textContent = 'Não foi possível iniciar';
    $('#loadingDescription').textContent = message;
    $('#retryButton').hidden = false;
  }
  function injectScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Motor de emulação indisponível. Verifique a conexão e tente novamente.'));
      document.body.append(script);
    });
  }
  async function init() {
    if (initialized) return;
    initialized = true;
    try {
      const id = new URLSearchParams(location.search).get('game');
      if (!id || !/^\d+$/.test(id)) throw new Error('Jogo não identificado. Volte à biblioteca e escolha um jogo.');
      const game = await RetroDB.getGame(Number(id));
      if (!game || !game.file) throw new Error('ROM não encontrada no armazenamento local. Importe novamente o jogo.');
      const ext = game.system === 'gba' ? 'gba' : game.system === 'nds' ? 'nds' : null;
      if (!ext) throw new Error('Sistema de jogo não suportado.');
      $('#gameTitle').textContent = game.name;
      $('#gamePlatform').textContent = ext === 'gba' ? 'Game Boy Advance · mGBA' : 'Nintendo DS · DeSmuME';
      romURL = URL.createObjectURL(game.file);
      window.EJS_player = '#game';
      window.EJS_gameUrl = romURL;
      window.EJS_gameName = game.name;
      window.EJS_gameID = game.id;
      window.EJS_core = ext === 'gba' ? 'mgba' : await RetroDB.getSetting('ndsCore', 'desmume');
      window.EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/';
      window.EJS_language = 'pt-BR';
      window.EJS_startOnLoaded = false; // User presses Play to unlock mobile audio safely.
      window.EJS_color = '#8b7df7';
      window.EJS_backgroundColor = '#070b14';
      window.EJS_Buttons = { playPause:true, restart:true, mute:true, settings:true, fullscreen:true, saveState:true, loadState:true, screenRecord:false };
      // A complete EmulatorJS /data distribution placed in ./emulator-data allows bundled/offline engine.
      // Only check local asset existence; don't silently choose a broken, partial directory.
      let loader = 'https://cdn.emulatorjs.org/stable/data/loader.js';
      try {
        const local = await fetch('./emulator-data/loader.js', { method:'GET', cache:'no-store' });
        if (local.ok && local.headers.get('content-type')?.includes('javascript')) {
          loader = './emulator-data/loader.js';
          window.EJS_pathtodata = new URL('./emulator-data/', location.href).href;
        }
      } catch (_) { /* CDN is the fallback when the engine wasn't bundled. */ }
      $('#loadingDescription').textContent = loader.startsWith('http') ? 'Conectando ao motor EmulatorJS. A primeira execução requer internet.' : 'Iniciando motor de emulação empacotado.';
      $('#message').hidden = true;
      $('#gameShell').hidden = false;
      await injectScript(loader);
    } catch (e) { initialized = false; error(e.message || 'Falha desconhecida.'); }
  }
  $('#goBack').addEventListener('click', () => location.replace('./index.html'));
  $('#retryButton').addEventListener('click', init);
  window.addEventListener('pagehide', () => { if (romURL) URL.revokeObjectURL(romURL); });
  init();
})();
