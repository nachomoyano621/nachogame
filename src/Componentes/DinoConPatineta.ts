import { Container, Sprite } from "pixi.js";
import { PhysicaContainer } from "../game/PhysicalContainer";

export class DinoConPatineta extends Container {
    public physContainer: PhysicaContainer;

  constructor() {
    super();
   
    const dino: Sprite = Sprite.from("myDino");
    const patineta: Sprite = Sprite.from("patineta");
    const capa: Sprite = Sprite.from("capa");
    const corona: Sprite = Sprite.from("corona");

    patineta.position.set(10, 100);
    patineta.scale.set(0.7, 0.7);
    corona.scale.set(0.4, 0.4);
    corona.position.set(150, -59);
    capa.position.set(198, -55);
    capa.scale.set(0.7, 0.7);
    capa.angle = 105;

    this.addChild(patineta);
    this.addChild(dino); // Agrega el sprite del dinosaurio al contenedor
    this.addChild(capa);
    this.addChild(corona);

    // Crea y configura el contenedor físico
    this.physContainer = new PhysicaContainer();
    this.addChild(this.physContainer);
  }
}
