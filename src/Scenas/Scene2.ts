import { Container } from "pixi.js";
import { DinoConPatineta } from "../Componentes/DinoConPatineta";
import { HombreconHacha } from "../Componentes/Hombre";
import { Mosquito } from "../Componentes/Mosquito";



export class Scene extends Container {



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


    

 

    

   

  

  }

  


}
