import {  Graphics, Rectangle, Sprite } from "pixi.js";
import { IHitbox } from "../game/IHitbox";
import { PhysicaContainer } from "../game/PhysicalContainer";



export class Plataforma extends PhysicaContainer implements IHitbox{

private hitbox:Graphics;
constructor (){
super();

const plataforma = Sprite.from("plataforma1");

plataforma.scale.set(2);



this.addChild(plataforma);
this.hitbox = new Graphics;
this.hitbox.beginFill(0x00FFFF,0.01);
this.hitbox.drawRect(0,0,208,160)
this.hitbox.endFill();
this.addChild(this.hitbox);



}

public getHitbox():Rectangle
{

return this.hitbox.getBounds()

}
}