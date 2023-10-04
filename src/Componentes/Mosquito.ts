import { AnimatedSprite, Container, Texture } from "pixi.js";

export class Mosquito extends Container {
  private speedX: number = -100; // Velocidad horizontal del mosquito

  constructor() {
    super();

    const textures = [
      Texture.from("mosquito"),
      Texture.from("mosquito"),
      Texture.from("mosquito"),
      Texture.from("mosquito"),
    ];

    const mosquitoAnimated: AnimatedSprite = new AnimatedSprite(textures);
    mosquitoAnimated.scale.set(0.4);
    mosquitoAnimated.animationSpeed = 0.1;

    // Configura las texturas para alternar entre "mosquito1" y "mosquito2"
    mosquitoAnimated.onFrameChange = () => {
      const currentTextureIndex = mosquitoAnimated.currentFrame;
      const nextTextureIndex = (currentTextureIndex + 1) % textures.length;
      mosquitoAnimated.texture = textures[nextTextureIndex];
    };

    this.addChild(mosquitoAnimated);
  }

  // Método para obtener la velocidad horizontal del mosquito
  getSpeedX(): number {
    return this.speedX;
  }

  // Método para establecer la velocidad horizontal del mosquito
  setSpeedX(speed: number): void {
    this.speedX = speed;
  }
}
