import { Container, Sprite, Texture } from "pixi.js";

export class TinkerScene extends Container {
  private background: Sprite;
  private hombreConHacha: Sprite;
  private monedas: Sprite[];

  constructor() {
    super();

    // Fondo
    this.background = new Sprite(Texture.from("fondo"));
    this.addChild(this.background);

    // Hombre con hacha
    this.hombreConHacha = new Sprite(Texture.from("hombre_hacha"));
    this.hombreConHacha.position.set(100, 500); // Ajusta la posición según tu diseño
    this.addChild(this.hombreConHacha);

    // Monedas
    this.monedas = [];
    for (let i = 0; i < 5; i++) {
      const moneda = new Sprite(Texture.from("moneda"));
      moneda.position.set(200 * i, 100); // Ajusta la posición según tu diseño
      this.monedas.push(moneda);
      this.addChild(moneda);
    }
  }

  public update(_deltaTime: number, _deltaFrame: number): void {
    // Aquí puedes agregar la lógica de actualización necesaria
    // deltaTime es el tiempo transcurrido desde la última actualización en milisegundos
    // _deltaFrame es el número de fotogramas transcurridos desde la última actualización

    // Por ejemplo, puedes mover las monedas o hacer otras operaciones de actualización aquí
    for (const moneda of this.monedas) {
      moneda.x += 1; // Mueve las monedas hacia la derecha, ajusta según tus necesidades
    }
  }
}


