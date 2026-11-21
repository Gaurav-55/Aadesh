const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aadeshDesktop', {
  printReceipt: (opts) => ipcRenderer.invoke('aadesh:print-receipt', opts),
});
