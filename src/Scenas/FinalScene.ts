import { Container, Sprite, Texture, Text, TextStyle, Application } from 'pixi.js';
import { Keyboard } from '../utils/Keyboard';
import { StartScene } from './StartScene'; // Importa StartScene

export class FinalScene extends Container {
  private app: Application;

  constructor(app: Application) {
    super();
    this.app = app;

    const fondoAncho = 1920;
    const fondoAlto = 1080;

    // Fondo de final
    const fondo = new Sprite(Texture.from('gameover'));
    fondo.width = fondoAncho;
    fondo.height = fondoAlto;
    this.addChild(fondo);

    // Crear un estilo de texto
    const estiloTexto = new TextStyle({
        dropShadow: true,
        dropShadowAngle: 12,
        dropShadowBlur: 42,
        dropShadowColor: "#ffffff",
      fill: [
        "#ed0707",
        "#000000"
      ],
      fontSize: 85,
      fontWeight: "bold",
    });

    const t = new Text("Presiona enter para volver a jugar", estiloTexto);
    t.position.set(750, 78);
    t.scale.set(0.68);
    this.addChild(t);

    const boton = new Sprite(Texture.from('boton'));
    boton.position.set(1750, 58);
    boton.scale.set(0.2);
    this.addChild(boton);

  // ...

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === Keyboard.KEYS.ENTER) {
      
      const startScene = new StartScene(this.app);
      this.app.stage.addChild(startScene); // Agrega StartScene al contenedor actual

      // Eliminar los elementos visuales y recursos específicos de TinkerScene
    this.removeChildren();
  
      // Limpia la escena actual (Final)
      this.app.stage.removeChild(this);
      location.reload();
      
    }
  });
  
  // ...
  
  }
}