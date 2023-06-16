import { AnimatedSprite, Container, Texture, Sprite } from "pixi.js";
import { DinoConPatineta } from './DinoConPatineta';

export class Scene extends Container{

    constructor (){
        super();

        const dinoWithPatineta: DinoConPatineta = new DinoConPatineta();

        dinoWithPatineta.x= 200;
        dinoWithPatineta.y= 300;
        
        dinoWithPatineta.scale.set(0.8,0.8);
        this.addChild(dinoWithPatineta);
        

      
        const mosquito: Sprite = Sprite.from("mosquito");
        mosquito.x= 800;
        mosquito.y= 100;
      
        mosquito.scale.set(0.4,0.4);
        this.addChild(mosquito);
            



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