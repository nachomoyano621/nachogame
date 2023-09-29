// Player.ts
import { AnimatedSprite, Graphics, Rectangle, Texture } from "pixi.js";
import { PhysicaContainer } from "./PhysicalContainer";
import { Keyboard } from "../utils/Keyboard";
import { IHitbox } from "./IHitbox";

export class Player extends PhysicaContainer implements IHitbox {
  private static readonly GRAVITY = 500;
  private static readonly MOVE_SPEED = 200;//para qye se quede en el lugar es 0
  private static readonly JUMP_SPEED = 600;
  public canJump = true;

  private hombreAnimated: AnimatedSprite;
  private hitbox:Graphics;

  constructor() {
    super();

    this.hombreAnimated = new AnimatedSprite([
      Texture.from("./h1.png"),
      Texture.from("./h2.png"),
      Texture.from("./h3.png"),
      Texture.from("./h4.png"),
      Texture.from("./h5.png"),
      Texture.from("./h6.png"),
      Texture.from("./h7.png"),
      Texture.from("./h8.png"),
      Texture.from("./h9.png"),
      Texture.from("./h10.png"),
    ], true);


    this.hitbox = new Graphics();
    this.hitbox.beginFill(0x00FFFF,0.01);
    this.hitbox.drawRect(0, 0, 80, 70); 
    this.hitbox.endFill();
  
    this.hitbox.x = -this.hitbox.width / 2 +60; 
    this.hitbox.y = -this.hitbox.height / 2 + 80;

    this.hombreAnimated.scale.set(-1.3, 1.3);
    this.hombreAnimated.play();
    this.hombreAnimated.animationSpeed = 0.1;

    this.hombreAnimated.addChild(this.hitbox);
    this.addChild(this.hombreAnimated);
   

    this.acceleration.y = Player.GRAVITY;
    Keyboard.down.on("ArrowUp", this.jump, this);
  }

  public override destroy(options: any) {
    super.destroy(options);
    Keyboard.down.off("ArrowUp", this.jump);
  }

  public override update(deltaMS: number) {
    super.update(deltaMS / 1000);
    this.hombreAnimated.update(deltaMS / (1000 / 60));
  
    if (Keyboard.state.get("ArrowRight")) {
      this.speed.x = Player.MOVE_SPEED;
      this.hombreAnimated.scale.x = 1;
    } else if (Keyboard.state.get("ArrowLeft")) {
      this.speed.x = -Player.MOVE_SPEED;
      this.hombreAnimated.scale.x = -1;
    } else {
      this.speed.x = 0;
    }
  
  
    if (Keyboard.state.get("ArrowUp")) {
      this.jump();
    }
    if (Keyboard.state.get("ArrowDown")) {
      this.acceleration.y = Player.GRAVITY * 2;
    } else {
      this.acceleration.y = Player.GRAVITY;
    }
  }
  



  private jump() {
    if (this.canJump) {
      this.canJump = false;
      this.speed.y = -Player.JUMP_SPEED;
    }
  }

  public getHitbox():Rectangle
{

return this.hitbox.getBounds()

}
 
}