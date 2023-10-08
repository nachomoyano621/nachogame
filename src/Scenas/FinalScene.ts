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
      fill: [
        "#ed0707",
        "#000000"
      ],
      fontSize: 85,
      fontWeight: "bold",
    });

    const t = new Text("Presiona enter para volver a jugar", estiloTexto);
    t.position.set(1050, 38);
    t.scale.set(0.68);
    this.addChild(t);

    const boton = new Sprite(Texture.from('boton'));
    boton.position.set(1750, 18);
    boton.scale.set(0.2);
    this.addChild(boton);

    // Escuchar el evento keydown para la tecla Enter
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === Keyboard.KEYS.ENTER) {
        const startScene = new StartScene(this.app); // Crea una instancia de StartScene
        this.app.stage.addChild(startScene);

        // Limpia la escena actual (Final)
        this.parent?.removeChild(this);

        // Agrega un bucle de juego a la nueva escena (StartScene)
        // this.app.ticker.add(() => {
        //   startScene.update(); // Llama a la función update sin necesidad de ": void"
        // });
      }
    });
  }
}