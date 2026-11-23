/**
 * Instalar el juego como app (PWA): registra el service worker (sólo en el build publicado)
 * y guarda el aviso de instalación del navegador para ofrecer un botón "INSTALAR".
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners: (() => void)[] = [];

export const Install = {
  init(production: boolean): void {
    if (production && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        void navigator.serviceWorker.register("sw.js").catch(() => undefined);
      });
    }
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e as InstallPromptEvent;
      listeners.forEach((fn) => fn());
    });
    window.addEventListener("appinstalled", () => {
      deferred = null;
      listeners.forEach((fn) => fn());
    });
  },

  /** El navegador ofrece instalar (Chrome/Edge/Android). */
  get available(): boolean {
    return deferred !== null;
  },

  /** Ya está abierto como app instalada. */
  get standalone(): boolean {
    const nav = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || nav.standalone === true;
  },

  /** iPhone/iPad: no hay botón automático, se instala desde "Compartir → Agregar a inicio". */
  get isIOS(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  },

  onChange(fn: () => void): () => void {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  },

  async prompt(): Promise<void> {
    const d = deferred;
    if (!d) return;
    deferred = null;
    await d.prompt();
    listeners.forEach((fn) => fn());
  },
};
