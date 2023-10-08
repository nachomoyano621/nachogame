import { Container, Sprite, Texture, Application, Text, TextStyle } from 'pixi.js';
import { TinkerScene } from './TinkerScene';
import { Keyboard } from '../utils/Keyboard'; // Importa Keyboard

export class StartScene extends Container {
  private app: Application;

  constructor(app: Application) {
    super();
    this.app = app;

    const fondoAncho = 1920;
    const fondoAlto = 1080;


   

    // Fondo de inicio
    const fondo = new Sprite(Texture.from('comienzo'));
    fondo.width = fondoAncho;
    fondo.height = fondoAlto;
    this.addChild(fondo);

  // Crear un estilo de texto
  const estiloTexto = new TextStyle({
    fill: [
      "#ed0707",
      "#000000"
  ],// Color de texto fuchsia
    fontSize: 85, // Tamaño de fuente
    fontWeight: "bold", // Fuente en negrita
  });

  

  const t = new Text("Presiona enter para jugar", estiloTexto);
  t.position.set(1050, 38);
  t.scale.set(0.68);
  this.addChild(t);


    const boton = new Sprite(Texture.from('boton'));
    boton.position.set(1750, 18);
    boton.scale.set(0.2);
    this.addChild(boton)

 // Escuchar el evento keydown para la tecla Enter
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === Keyboard.KEYS.ENTER) {
        const tinkerScene = new TinkerScene();
        this.app.stage.addChild(tinkerScene);

        // Limpia la escena actual (Inicio)
        this.parent.removeChild(this);

        // Agrega un bucle de juego a la nueva escena
        this.app.ticker.add(() => {
          tinkerScene.update();
        });
      }
    });
  }
}