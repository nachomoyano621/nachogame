import { Container, Sprite } from "pixi.js";

export class Start extends Container{

constructor (){
super();

const start: Sprite = Sprite.from("start");

start.position.set(20,100);
start.scale.set(0.2,0.2);



this.addChild(start);



}
}