import { AbstractRenderer, Application, Container } from "pixi.js";

export interface IScene extends Container {
  update(dtMS: number): void;
  onExit?(): void;
}

/**
 * Maneja la escena activa. Los cambios se aplican al comienzo del próximo frame
 * para que el evento que dispara el cambio (ej: Enter) no lo reciba la escena nueva.
 */
export class SceneManager {
  private static app: Application;
  private static current: IScene | null = null;
  private static pending: IScene | null = null;

  public static init(app: Application): void {
    SceneManager.app = app;
    app.ticker.add(() => {
      if (SceneManager.pending) {
        SceneManager.swap(SceneManager.pending);
        SceneManager.pending = null;
      }
      // Clamp para que un tab en segundo plano no genere saltos gigantes.
      const dt = Math.min(app.ticker.deltaMS, 50);
      SceneManager.current?.update(dt);
    });
  }

  public static get renderer(): AbstractRenderer {
    return SceneManager.app.renderer;
  }

  public static get scene(): IScene | null {
    return SceneManager.current;
  }

  public static change(scene: IScene): void {
    if (SceneManager.pending) {
      SceneManager.pending.destroy({ children: true });
    }
    SceneManager.pending = scene;
  }

  private static swap(next: IScene): void {
    const prev = SceneManager.current;
    if (prev) {
      prev.onExit?.();
      SceneManager.app.stage.removeChild(prev);
      prev.destroy({ children: true });
    }
    SceneManager.current = next;
    SceneManager.app.stage.addChild(next);
  }
}
