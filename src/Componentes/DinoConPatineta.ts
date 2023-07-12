import { Container, Sprite } from "pixi.js";

export class DinoConPatineta extends Container{

constructor (){
super();

const dino: Sprite = Sprite.from("myDino");
const patineta: Sprite = Sprite.from("patineta");
const capa: Sprite = Sprite.from("capa");
const corona: Sprite = Sprite.from("corona");

patineta.position.set(10,100);
patineta.scale.set(0.7,0.7);
corona.scale.set(0.4,0.4);
corona.position.set(150,-59);
capa.position.set(198,-55);
capa.scale.set(0.7,0.7);
capa.angle = 105;



this.addChild(patineta);
this.addChild(dino);
this.addChild(capa);
this.addChild(corona);




}
}