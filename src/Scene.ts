import { AnimatedSprite, Container, Texture } from "pixi.js";
import { DinoConPatineta } from './DinoConPatineta';

export class Scene extends Container{

    constructor (){
        super();

        const dinoWithPatineta: DinoConPatineta = new DinoConPatineta();

        dinoWithPatineta.x= 200;
        dinoWithPatineta.y= 300;
        
        this.addChild(dinoWithPatineta);
        
        const dinoAnimated: AnimatedSprite = new AnimatedSprite(
            [
                Texture.from("myDino1"),
                Texture.from("myDino2"),
                Texture.from("myDino3"),
                Texture.from("myDino4"),
                Texture.from("myDino5"),
                Texture.from("myDino6")
            ], true
        )
        dinoAnimated.play();
        dinoAnimated.animationSpeed = 0.1;
        
        this.addChild(dinoAnimated);
    }

}