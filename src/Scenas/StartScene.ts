// StartScene.ts
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { TinkerScene } from './TinkerScene';
import { Button } from '../ui/Button';

export class StartScene extends Container {
  constructor() {
    super();
    const fondoAncho = 1800;
    const fondoAlto = 1080;

    // Fondo de inicio
    const fondo = new Sprite(Texture.from('comienzo'));
    fondo.width = fondoAncho;
    fondo.height = fondoAlto;
    this.addChild(fondo);

    // Crea un botón utilizando la clase Button
    const botonJugar = new Button(
      Texture.from('boton'), // Textura por defecto
      Texture.from('botonPressed'), // Textura cuando se presiona
      Texture.from('botonOver') // Textura cuando se pasa el mouse por encima
    );

   
    botonJugar.position.set(910, 400);
    this.addChild(botonJugar);

    // Agrega un evento personalizado al botón "JUGAR"
    botonJugar.on('clickk', () => {
      // Cuando se hace clic en el botón, cambia a la escena del juego principal (TinkerScene)
      const canvas = document.getElementById('pixi-canvas') as HTMLCanvasElement;
      const app = new Application({
        view: canvas,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x000000,
        width: 1920,
        height: 1080,
      });
      const tinkerScene = new TinkerScene();
      app.stage.addChild(tinkerScene);

      // Limpia la escena actual (Inicio)
      this.destroy({ children: true, texture: true, baseTexture: true });

      // Agrega un bucle de juego a la nueva escena
      app.ticker.add((deltaFrame: number) => {
        tinkerScene.update(app.ticker.deltaMS, deltaFrame);
      });
    });
  }
}
