import {  Container, Sprite } from "pixi.js";

export class Mosquito extends Container{

constructor (){
super();

const Mosquito: Sprite = Sprite.from("mosquito");


Mosquito.scale.set(0.4,0.4);
this.addChild(Mosquito);

}
}