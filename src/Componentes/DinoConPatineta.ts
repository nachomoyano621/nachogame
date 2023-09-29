import { AnimatedSprite, Container, Texture } from "pixi.js";

export class DinoConPatineta extends Container {
  private speedX: number = -100; // Velocidad horizontal del dino

  constructor() {
    super();

    const textures = [
      Texture.from("dino1"),
      Texture.from("dino2"),
    ];

    const dinoAnimated: AnimatedSprite = new AnimatedSprite(textures);
    dinoAnimated.scale.set(-0.7, 0.7);
    dinoAnimated.animationSpeed = 0.1;

    // Configura las texturas para alternar entre "dino1" y "dino2"
    dinoAnimated.onFrameChange = () => {
      const currentTextureIndex = dinoAnimated.currentFrame;
      const nextTextureIndex = (currentTextureIndex + 1) % textures.length;
      dinoAnimated.texture = textures[nextTextureIndex];
    };

    this.addChild(dinoAnimated);
  }

  // Método para obtener la velocidad horizontal del dino
  getSpeedX(): number {
    return this.speedX;
  }

  // Método para establecer la velocidad horizontal del dino
  setSpeedX(speed: number): void {
    this.speedX = speed;
  }
}
