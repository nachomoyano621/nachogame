import {  Container, Sprite } from "pixi.js";

export class Mosquito extends Container{

constructor (){
super();

const Mosquito: Sprite = Sprite.from("mosquito");

Mosquito.x= 800;
Mosquito.y= 100;


Mosquito.scale.set(0.4,0.4);
this.addChild(Mosquito);

}
}