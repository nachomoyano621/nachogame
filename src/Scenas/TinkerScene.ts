import { AnimatedSprite, Container, Texture } from "pixi.js";
import { IUpdateable } from "./IUpdateable";
import { PhysicaContainer } from "../game/PhysicalContainer";
import { HEIGHT, WIDTH } from "..";


export class TinkerScene extends Container implements IUpdateable{


private hombreAnimated: AnimatedSprite;
 
private physHombre: PhysicaContainer;
  constructor() {
    super();

    

    this.hombreAnimated = new AnimatedSprite(
         

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
    
    this.hombreAnimated.x= 800;
    this.hombreAnimated.y= 300;
    
    this.hombreAnimated.scale.set(-1.3,1.3);
    this.hombreAnimated.play();
    this.hombreAnimated.animationSpeed = 0.1;
    
   
    this.physHombre = new PhysicaContainer();
    this.physHombre.speed.x = -70;
    this.physHombre.speed.y = 0;
    this.physHombre.acceleration.y = 350;
    this.addChild(this.physHombre);

    this.physHombre.addChild(this.hombreAnimated);
    

  }
    public update(deltaTime: number, deltaFrame: number): void {
     this.hombreAnimated.update(deltaFrame);
     const dt = deltaTime /1000
     this.physHombre.update(dt);


     if(this.physHombre.x > WIDTH){

      this.physHombre.x = WIDTH;
      this.physHombre.speed.x = Math.abs(this.physHombre.speed.x) * -1;
      this.physHombre.scale.x = -1;
      this.hombreAnimated.tint = 0xFF00FF;


     }else if(this.physHombre.x < 0){

      this.physHombre.x = 0;
      this.physHombre.speed.x = Math.abs(this.physHombre.speed.x);
      this.physHombre.scale.x = 1;
      this.hombreAnimated.tint = 0xFF0000;
     }

     if(this.physHombre.y > HEIGHT){

      this.physHombre.y = HEIGHT;
      this.physHombre.speed.y = -1000;
      this.hombreAnimated.tint = 0x00ff00;
      
     }

   
    }

  


}
