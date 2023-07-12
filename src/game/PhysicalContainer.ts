import { Container, Point } from "pixi.js";

export class PhysicaContainer extends Container {


public speed:Point = new Point();
public acceleration:Point = new Point();



public update(deltaSeconds: number) {
    this.x += this.speed.x * deltaSeconds + (1/2) * this.acceleration.x * deltaSeconds* deltaSeconds;
    this.y += this.speed.y * deltaSeconds + (1/2) * this.acceleration.y * deltaSeconds* deltaSeconds;

    this.speed.x += this.acceleration.x * deltaSeconds;
    this.speed.y += this.acceleration.y * deltaSeconds;

   }

}