import { Container, Sprite, Texture, Text } from "pixi.js";
import { DinoConPatineta } from "./DinoConPatineta";
import { HombreconHacha } from "./Hombre";
import { Mosquito } from "./Mosquito";
import { Button } from "./ui/Button";
import { Keyboard } from "./utils/Keyboard";

export class Scene extends Container {

  private buttonMouse:Button;
private lastKeyPressed:Text;

  constructor() {
    super();

    

    const dinoWithPatineta: DinoConPatineta = new DinoConPatineta();

    dinoWithPatineta.x = 200;
    dinoWithPatineta.y = 300;

    dinoWithPatineta.scale.set(0.8, 0.8);
    this.addChild(dinoWithPatineta);

    const hombre: HombreconHacha = new HombreconHacha();

    this.addChild(hombre);

    const mosquito: Mosquito = new Mosquito();

    this.addChild(mosquito);

    const dialog = new Container();
    dialog.x = 200;
    dialog.y = 150;

    const background = Sprite.from("fondo");
    background.x = 100;
    background.y = -100;
    
    dialog.addChild(background);

    this.buttonMouse = new Button(
    Texture.from("boton1"),
    Texture.from("boton2"),
    Texture.from("boton1"),
    );
      this.buttonMouse.on("clickk",this.onButtonClick, this);
    this.buttonMouse.x = background.width / 2 - this.buttonMouse.width * 0.6;
    this.buttonMouse.y = this.buttonMouse.height + 20;
    
    
    this.buttonMouse.x = 300;
    this.buttonMouse.y = -25;
    dialog.addChild(this.buttonMouse);

    const buttonTouch = Sprite.from("boton2");
    buttonTouch.anchor.set(0.5);
    buttonTouch.x = background.width / 2 - buttonTouch.width * 0.6;
    buttonTouch.y = this.buttonMouse.y;   
    buttonTouch.interactive = true;
    buttonTouch.x = 390;
    buttonTouch.y = -25;
    dialog.addChild(buttonTouch);

    const buttonPointer = Sprite.from("boton3");
    buttonPointer.anchor.set(0.5);
    buttonPointer.x = background.width / 2;
    buttonPointer.y = this.buttonMouse.y + 200;  
    buttonPointer.interactive = true;
    buttonPointer.x = 155;
    buttonPointer.y = -25;
    dialog.addChild(buttonPointer);

    this.lastKeyPressed = new Text("Esperando...",{ fontSize:48 } );
    this.lastKeyPressed.anchor.set(0.5); 
    this.lastKeyPressed.x = background.width / 2;
   this.lastKeyPressed.y = buttonPointer.y + 175;
    dialog.addChild(this.lastKeyPressed) 

     this.addChild(dialog);

     Keyboard.down.on("KeyB", this.onKeyB, this);
     Keyboard.up.on("KeyB", this.onKeyUp, this);


  }

  private onKeyUp(): void{
    console.log("solte", this);
    
      }
 
  private onKeyB(): void{
    console.log("aprete la B", this);
    
      }

  private onButtonClick(): void{
console.log("mi nuevo boton", this);

  }


}
