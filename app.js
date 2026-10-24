(function () {
  'use strict';
  let games = [];
  let filter = 'all';
  let query = '';
  let selectedId = null;
  let deferredInstall = null;
  let toastTimeout;
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const systemName = system => system === 'gba' ? 'Game Boy Advance' : 'Nintendo DS';
  const fmtBytes = n => n < 1024*1024 ? `${(n/1024).toFixed(0)} KB` : `${(n/(1024*1024)).toFixed(1).replace('.', ',')} MB`;
  const shortTitle = name => name.replace(/\.(gba|nds|zip)$/i, '').replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const safeText = v => { const e = document.createElement('span'); e.textContent = v; return e.innerHTML; };
  function toast(message) { clearTimeout(toastTimeout); const el = $('#toast'); el.textContent = message; el.classList.add('visible'); toastTimeout = setTimeout(() => el.classList.remove('visible'), 4000); }
  function openImport() { $('#romInput').click(); }
  function card(game) {
    const id = Number(game.id);
    const gba = game.system === 'gba';
    const title = safeText(game.name);
    const badge = gba ? 'GBA' : 'NDS';
    return `<article class="game-card"><button class="cover-button" type="button" data-open="${id}" aria-label="Abrir ${title}"><div class="game-art ${gba?'art-gba':'art-nds'}"><div class="art-noise"></div><div class="art-symbol">${gba?'<div class="art-gba-device"><div class="art-gba-screen">GBA</div><span>✚</span><i>● ●</i></div>':'<div class="art-nds-device"><div>DS</div><div>✦</div></div>'}</div><span class="corner-label">${badge}</span></div></button><div class="game-card-details"><div><button class="game-name" data-open="${id}" type="button" title="${title}">${title}</button><span class="game-platform">${systemName(game.system)} · ${fmtBytes(game.size)}</span></div><button type="button" class="favorite-toggle ${game.favorite?'is-favorite':''}" data-fav="${id}" aria-label="${game.favorite?'Remover dos favoritos':'Adicionar aos favoritos'}">${game.favorite?'♥':'♡'}</button></div></article>`;
  }
  function refresh() {
    const ordered = [...games].sort((a,b)=>(b.lastPlayedAt||0)-(a.lastPlayedAt||0) || b.addedAt-a.addedAt);
    $('#statGames').textContent = games.length;
    $('#statGba').textContent = games.filter(g => g.system==='gba').length;
    $('#statNds').textContent = games.filter(g => g.system==='nds').length;
    $('#libraryCount').textContent = games.length;
    const shown = ordered.filter(g => (filter === 'all'||g.system===filter) && g.name.toLocaleLowerCase('pt-BR').includes(query));
    $('#gamesGrid').innerHTML = shown.map(card).join('');
    const empty = !shown.length;
    $('#emptyState').hidden = !empty;
    $('#importEmpty').hidden = games.length>0;
    $('#emptyTitle').textContent = games.length ? 'Nenhum jogo encontrado' : 'Sua biblioteca começa aqui';
    $('#emptyMessage').textContent = games.length ? 'Experimente outro filtro ou termo de busca.' : 'Adicione ROMs .gba, .nds ou .zip contendo um jogo compatível.';
    const fav = ordered.filter(g => g.favorite);
    $('#favoritesGrid').innerHTML = fav.map(card).join('');
    $('#favoritesEmpty').hidden = fav.length>0;
    const latest = ordered.find(g=>g.lastPlayedAt);
    $('#resumeSection').hidden = !latest;
    if (latest) {
      $('#resumeName').textContent = latest.name;
      $('#resumeSystem').textContent = systemName(latest.system);
      $('#resumeCard').dataset.open = String(latest.id);
    }
    renderStorage();
  }
  async function load() { games = await RetroDB.listGames(); refresh(); }
  function view(name) {
    $$('.view').forEach(el=>el.classList.toggle('active', el.id===name+'View'));
    $$('[data-view]').forEach(btn=>btn.classList.toggle('active', btn.dataset.view===name));
    $('#pageCrumb').textContent = ({library:'BIBLIOTECA',favorites:'FAVORITOS',settings:'AJUSTES'})[name];
    if (name === 'settings') renderStorage();
    window.scrollTo({ top:0, behavior:'instant' });
  }
  async function importFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    let count=0, dupes=0, invalid=0;
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['gba','nds','zip'].includes(ext) || !file.size) {invalid++; continue;}
      const system = ext==='zip' ? await zipSystem(file) : ext;
      if (!system) { invalid++; continue; }
      if (games.some(g=>g.originalName===file.name && g.size===file.size && g.system===system)) { dupes++; continue; }
      try {
        const item = {name:shortTitle(file.name), originalName:file.name, system, size:file.size, file, addedAt:Date.now(), lastPlayedAt:0, favorite:false};
        item.id = await RetroDB.addGame(item);
        games.push(item);
        count++;
      } catch (e) { toast(`Não foi possível armazenar ${file.name}: ${e.name==='QuotaExceededError'?'espaço insuficiente':e.message}`); break; }
    }
    refresh();
    if (count) view('library');
    toast(`${count} jogo(s) adicionado(s).${dupes?' '+dupes+' repetido(s).':''}${invalid?' '+invalid+' inválido(s).':''}`);
  }
  async function zipSystem(file) {
    // Read ZIP directory filename entries without extracting ROM data.
    const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 131072)).arrayBuffer());
    const hits = new Set();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    for (let i=0; i+46 < tail.length; i++) {
      if (tail[i] !== 0x50 || tail[i+1] !== 0x4b || tail[i+2] !== 1 || tail[i+3] !== 2) continue;
      const v = new DataView(tail.buffer, tail.byteOffset+i, tail.length-i);
      const len = v.getUint16(28,true);
      if (!len || i+46+len > tail.length) continue;
      const name = decoder.decode(tail.subarray(i+46,i+46+len)).toLowerCase();
      if (name.endsWith('.gba')) hits.add('gba');
      if (name.endsWith('.nds')) hits.add('nds');
    }
    return hits.size === 1 ? [...hits][0] : null;
  }
  function showGame(id) {
    const game = games.find(g=>g.id===Number(id));
    if (!game) return;
    selectedId = game.id;
    $('#dialogGameName').textContent=game.name;
    $('#dialogGameSystem').textContent=`${systemName(game.system)} · ${fmtBytes(game.size)}`;
    $('#favDialog').textContent = game.favorite ? '♥ Remover dos favoritos' : '♡ Adicionar aos favoritos';
    $('#gameDialog').showModal();
  }
  async function toggleFavorite(id) {
    const game = games.find(g=>g.id===Number(id)); if (!game) return;
    game.favorite = !game.favorite;
    await RetroDB.putGame(game);
    refresh();
    if ($('#gameDialog').open) $('#favDialog').textContent = game.favorite ? '♥ Remover dos favoritos' : '♡ Adicionar aos favoritos';
  }
  async function play(id) {
    const game=games.find(g=>g.id===Number(id)); if(!game) return;
    game.lastPlayedAt=Date.now();
    await RetroDB.putGame(game);
    location.href=`./player.html?game=${encodeURIComponent(game.id)}`;
  }
  async function deleteSelected() {
    const game=games.find(g=>g.id===selectedId); if(!game)return;
    if (!confirm(`Excluir “${game.name}” da biblioteca? Esta ação remove a ROM armazenada neste navegador.`)) return;
    await RetroDB.deleteGame(selectedId);
    $('#gameDialog').close();
    games=games.filter(g=>g.id!==selectedId);
    selectedId=null;
    refresh();
    toast('Jogo excluído da biblioteca.');
  }
  async function renderStorage() {
    if (!$('#storageUsed')) return;
    const bytes=games.reduce((sum,g)=>sum+g.size,0);
    let quota=0, usage=0;
    try { const estimate=await navigator.storage?.estimate?.(); quota=estimate?.quota||0; usage=estimate?.usage||0; } catch (_) {}
    $('#storageUsed').textContent = fmtBytes(bytes) + (quota ? ` de ${fmtBytes(quota)} disponíveis` : ' em ROMs');
    $('#storageFill').style.width = quota ? `${Math.min(100, 100*usage/quota)}%` : '0%';
  }
  function setNetwork() {
    const online=navigator.onLine;
    $('#connectionBadge').textContent= online ? '● Conectado' : '● Sem conexão';
    $('#connectionBadge').classList.toggle('offline', !online);
  }
  async function install() {
    if (deferredInstall) {
      deferredInstall.prompt();
      const choice=await deferredInstall.userChoice;
      deferredInstall=null;
      if(choice.outcome==='accepted') toast('Instalação iniciada.');
    } else if (matchMedia('(display-mode: standalone)').matches) toast('O aplicativo já está instalado.');
    else toast('No Android, use o menu ⋮ do navegador → Adicionar à tela inicial / Instalar app.');
  }
  async function init() {
    setNetwork();
    addEventListener('online',setNetwork); addEventListener('offline',setNetwork);
    $$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>view(btn.dataset.view)));
    $$('.tab').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.system; $$('.tab').forEach(x=>x.classList.toggle('active',x===btn)); refresh();}));
    $('#searchInput').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('pt-BR');refresh();});
    ['#importTop','#importEmpty'].forEach(sel=>$(sel).addEventListener('click',openImport));
    $('#romInput').addEventListener('change',async e=>{await importFiles(e.target.files);e.target.value='';});
    document.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
    document.addEventListener('drop', e=>{if(e.dataTransfer?.files?.length){e.preventDefault();importFiles(e.dataTransfer.files);}});
    document.addEventListener('click',async e=>{
      const favorite=e.target.closest('[data-fav]');
      if(favorite) {try {await toggleFavorite(favorite.dataset.fav);} catch(err){toast(err.message);} return;}
      const game=e.target.closest('[data-open]');
      if(game)showGame(game.dataset.open);
    });
    $('#closeDialog').addEventListener('click',()=>$('#gameDialog').close());
    $('#gameDialog').addEventListener('click',e=>{if(e.target===$('#gameDialog'))$('#gameDialog').close();});
    $('#playDialog').addEventListener('click',()=>play(selectedId));
    $('#favDialog').addEventListener('click',()=>toggleFavorite(selectedId).catch(err=>toast(err.message)));
    $('#removeDialog').addEventListener('click',()=>deleteSelected().catch(err=>toast(err.message)));
    $('#resumeCard').addEventListener('click',()=>play(Number($('#resumeCard').dataset.open)));
    $('#ndsCore').value=await RetroDB.getSetting('ndsCore','desmume');
    $('#ndsCore').addEventListener('change',e=>{RetroDB.setSetting('ndsCore',e.target.value).then(()=>toast('Preferência salva.')).catch(err=>toast(err.message));});
    $('#persistBtn').addEventListener('click',async ()=>{
      if(!navigator.storage?.persist){toast('Seu navegador não oferece esta opção.');return;}
      try { const ok=await navigator.storage.persist(); toast(ok ? 'Armazenamento persistente ativado.' : 'O navegador não autorizou o armazenamento persistente.'); } catch(e){toast(e.message);}
    });
    $('#installFromSettings').addEventListener('click',install);
    $('#installBtn').addEventListener('click',install);
    addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;$('#installBtn').hidden=false;});
    addEventListener('appinstalled',()=>{$('#installBtn').hidden=true;toast('Aplicativo instalado!');});
    if('serviceWorker' in navigator && location.protocol !== 'file:' && location.hostname !== 'appassets.androidplatform.net') navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Falha ao registrar PWA:',err));
    await load();
  }
  init().catch(err=>{console.error(err);toast(`Não foi possível abrir a biblioteca: ${err.message}. Use HTTPS ou localhost.`);});
})();
