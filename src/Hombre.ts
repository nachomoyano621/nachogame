import { AnimatedSprite, Container, Texture } from "pixi.js";

export class HombreconHacha extends Container{

constructor (){
super();

const hombreAnimated: AnimatedSprite = new AnimatedSprite(
         

    [
        
    
        Texture.from("hombre1"),
        Texture.from("hombre2"),
        Texture.from("hombre3"),                
        Texture.from("hombre4"),
        Texture.from("hombre5"),
        Texture.from("hombre6"),
        Texture.from("hombre7"),
        Texture.from("hombre8"),
        Texture.from("hombre9"),
        Texture.from("hombre10"),
    ], true
)

hombreAnimated.x= 800;
hombreAnimated.y= 300;

hombreAnimated.scale.set(-1.3,1.3);
hombreAnimated.play();
hombreAnimated.animationSpeed = 0.1;

this.addChild(hombreAnimated);

}
}