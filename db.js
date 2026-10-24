/* Armazenamento local de ROMs: nenhum upload ou servidor. */
(function () {
  'use strict';
  const DB_NAME = 'bolso-retro-library';
  const DB_VERSION = 1;
  let connection;
  function open() {
    if (connection) return connection;
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('games')) {
          const store = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
          store.createIndex('addedAt', 'addedAt');
        }
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => { connection = null; reject(request.error); };
      request.onblocked = () => { connection = null; reject(new Error('Banco bloqueado por outra aba. Feche outras abas do aplicativo.')); };
    });
    return connection;
  }
  async function operate(store, mode, callback) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = callback(tx.objectStore(store));
      let value;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error || request.error);
      tx.onabort = () => reject(tx.error || new Error('Transação cancelada.'));
    });
  }
  window.RetroDB = Object.freeze({
    open,
    listGames: () => operate('games', 'readonly', s => s.getAll()),
    getGame: id => operate('games', 'readonly', s => s.get(Number(id))),
    addGame: item => operate('games', 'readwrite', s => s.add(item)),
    putGame: item => operate('games', 'readwrite', s => s.put(item)),
    deleteGame: id => operate('games', 'readwrite', s => s.delete(Number(id))),
    getSetting: async (key, fallback) => (await operate('settings', 'readonly', s => s.get(key)))?.value ?? fallback,
    setSetting: (key, value) => operate('settings', 'readwrite', s => s.put({ key, value }))
  });
})();
