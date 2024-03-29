import { Container, Text, TextStyle, Sprite, Texture, Application } from "pixi.js";
import { sound } from "@pixi/sound";
import { Player } from "../game/Player";
import { GlowFilter } from "@pixi/filter-glow";
import { DinoConPatineta } from "../Componentes/DinoConPatineta";



import { Mosquito } from "../Componentes/Mosquito";
import { FinalScene } from "./FinalScene";
import { WinScene } from "./WinScene";
// Importa la clase Application de Pixi.js
import { Application as PixiApplication } from "pixi.js";

// Importa el tiempo delta (deltaTime) desde la clase PixiApplication
import { Ticker } from "pixi.js";

export class TinkerScene extends Container {
  private playerHombre: Player;
  private monedasRecogidas: number = 0;
  private textoMonedas: Text;
  private monedas: Sprite[] = [];
  private monedasSpeed: number = -100; // Velocidad de las monedas
  private world: Container;
  private dinos: DinoConPatineta[] = [];
  private dinoSpawnTimer: number = 0;
  private dinoSpawnInterval: number = 20000; // Intervalo de aparición de los dinos (en milisegundos)
  private mosquitos: Mosquito[] = [];
  private mosquitoSpawnInterval: number = 10000;
  private accumulatedMosquitoTime: number = 0;
  private juegoEnCurso: boolean = true;
  



  

  private timePassed: number = 0;

  monedaChicaContainer: any;
  monedaChicaSprite: Sprite;
  
  private timePassedMonedas: number = 0;
  app: Application;


  constructor(app: PixiApplication) {
    super();

    this.app = app;
  this.dinoSpawnTimer = this.dinoSpawnInterval; // Inicia el temporizador
    this.world = new Container();
    this.addChild(this.world);

    this.textoMonedas = new Text("", {
      fill: "#FFFF00",
      fontSize: 40,
      fontWeight: "bold",
    });
    this.textoMonedas.position.set(10, 10);
    this.world.addChild(this.textoMonedas);

// Dimensiones específicas para el fondo
const fondoAncho = 2000;
const fondoAlto = 1080;

// Crea la imagen de fondo y configura la escala (sin tiling)
const background = new Sprite(Texture.from("fondo"));
background.width = fondoAncho;
background.height = fondoAlto;
this.world.addChild(background);

const mosquito = new Mosquito();
mosquito.position.set(1920, 640); // Posición inicial del mosquito (ajusta la posición como desees)
this.world.addChild(mosquito);
this.mosquitos.push(mosquito); // Agrega el mosquito al arreglo de mosquitos

// Crear una instancia del jugador
this.playerHombre = new Player();

// Quitar el filtro temporalmente
this.playerHombre.filters = [];

const escalaPromedio = 1.2; // Puedes ajustar este valor como desees

// Cambiar la escala del sprite en ambos ejes
this.playerHombre.scale.set(escalaPromedio, escalaPromedio);

// Crear un filtro Glow con los valores deseados
const myGlow = new GlowFilter({ color: 0xFF0000, distance: 50 });

// Volver a aplicar el filtro
this.playerHombre.filters = [myGlow];

// Agregar el jugador al mundo
this.world.addChild(this.playerHombre);


    this.monedasRecogidas = 0;

    this.monedaChicaContainer = new Container();
    this.monedaChicaContainer.position.set(1780, 20);
    this.world.addChild(this.monedaChicaContainer);

    this.monedaChicaSprite = Sprite.from("moneda");
    this.monedaChicaSprite.scale.set(0.21);
    this.monedaChicaSprite.position.set(0, 0);
    this.monedaChicaContainer.addChild(this.monedaChicaSprite);

      // Crea una instancia de DinoConPatineta
  const dino = new DinoConPatineta();
  

  // Agrega el personaje a la escena
  this.world.addChild(dino);

  const sndCancion = sound.find("cancion");
  if (!sndCancion.isPlaying) {
    sndCancion.play({ volume: 0.2, loop: true });
  }

    const tStyle = new TextStyle({
      dropShadowColor: "#f9ecec",
      fill: ["#ed0707", "#000000"],
      fillGradientStops: [0],
      fontFamily: "Comic Sans MS",
      fontSize: 50,
      lineJoin: "round",
      stroke: "#cc6b6b",
      strokeThickness: 7,
    });

    const t = new Text("Tomi Game! 🦖", tStyle);
    t.position.set(1530, 18);
    t.scale.set(0.68);
    this.world.addChild(t);

    this.actualizarTextoMonedas();
  }

  private updateMonedasColision(): void {
    const playerBounds = this.playerHombre.getBounds();

    for (const moneda of this.monedas) {
      const monedaBounds = moneda.getBounds();

      if (playerBounds.intersects(monedaBounds)) {
        this.onMonedaClicked(moneda);
      }
    }
  }

  private onMonedaClicked(moneda: Sprite): void {
    const sndMoneda = sound.find("cancion_moneda");
    sndMoneda.play({ volume: 0.5 });
  
    // Encuentra el índice de la moneda en el arreglo y elimínala
    const index = this.monedas.indexOf(moneda);
    if (index !== -1) {
      this.monedas.splice(index, 1); // Elimina la moneda del arreglo
    }
  
    this.world.removeChild(moneda); // Elimina la moneda del mundo
  
    this.monedasRecogidas++;
    this.actualizarTextoMonedas(); // Actualiza el texto del contador
  }

  private actualizarTextoMonedas(): void {
    if (this.monedasRecogidas === 50) {
      this.changeToWinScene(); // Cambia a la escena de victoria cuando se recogen 2 monedas
    }
    // Verifica si el textoMonedas ya está en el mundo y lo elimina
    if (this.textoMonedas.parent) {
      this.textoMonedas.parent.removeChild(this.textoMonedas);
    }
  
    const estiloTextoMonedas = new TextStyle({
      fill: "#FFFF00",
      fontSize: 40,
      fontWeight: "bold",
    });
  
    this.textoMonedas = new Text(`${this.monedasRecogidas}`, estiloTextoMonedas);
    this.textoMonedas.position.set(this.monedaChicaSprite.width + 10, 0);
  
    // Agrega el texto actualizado al contenedor correcto
    this.monedaChicaContainer.addChild(this.textoMonedas);

  
  }

  public update(): void {
    if (!this.juegoEnCurso) {
      return; // Si el juego no está en curso, no hagas actualizaciones adicionales.
    }
    const deltaTime = Ticker.shared.elapsedMS;
    // Actualiza el temporizador de aparición de dinos
    this.dinoSpawnTimer += deltaTime;

  
    if (this.dinoSpawnTimer >= this.dinoSpawnInterval) {
      this.dinoSpawnTimer = 0; // Reinicia el temporizador
      this.spawnDino(); // Aparece un nuevo dino
    }
  
    // Actualiza la posición de las monedas y verifica la colisión con el jugador
    for (let i = this.monedas.length - 1; i >= 0; i--) {
      const moneda = this.monedas[i];
      moneda.x += this.monedasSpeed * (deltaTime/ 1000);
  
      // Verificar colisión con el jugador
      const playerBounds = this.playerHombre.getBounds();
      const monedaBounds = moneda.getBounds();
      if (playerBounds.intersects(monedaBounds)) {
        this.onMonedaClicked(moneda);
      } else if (moneda.x + moneda.width < 0) {
        // Elimina la moneda si sale de la pantalla
        this.monedas.splice(i, 1);
        this.world.removeChild(moneda);
      }
    }
  
    const horizontalLimitLeft = 120;
    const horizontalLimitRight = 1920 - 120;
    const verticalLimitTop = 40;
    const verticalLimitBottom = 1080 - 210;
  
    // Actualiza la posición de los dinos y verifica la colisión con el jugador
    for (let i = this.dinos.length - 1; i >= 0; i--) {
      const dino = this.dinos[i];
      dino.position.x += dino.getSpeedX() * (deltaTime / 1000);
      this.timePassed += deltaTime;
  
      if (this.timePassed > 2000) {
        this.timePassed = 0;
      }
  
      this.timePassedMonedas += deltaTime;
      if (this.timePassedMonedas > 4000) {
        this.timePassedMonedas = 0;
        this.spawnMoneda();
      }
  
      // Verificar colisión con el jugador
      const playerBounds = this.playerHombre.getBounds();
      const dinoBounds = dino.getBounds();
  
      if (playerBounds.intersects(dinoBounds)) {
        // Si hay una colisión con el dino, eliminarlo
        this.removeDino(dino);
        this.changeToFinalScene();
      }
    }
  
    this.playerHombre.update(deltaTime);
  
    if (this.playerHombre.x > horizontalLimitRight) {
      this.playerHombre.x = horizontalLimitRight;
    } else if (this.playerHombre.x < horizontalLimitLeft) {
      this.playerHombre.x = horizontalLimitLeft;
    }
  
    if (this.playerHombre.y > verticalLimitBottom) {
      this.playerHombre.y = verticalLimitBottom;
      this.playerHombre.canJump = true;
    } else if (this.playerHombre.y < verticalLimitTop) {
      this.playerHombre.y = verticalLimitTop;
      this.playerHombre.speed.y = 0;
    }
  
    // Actualiza la posición de los mosquitos y verifica la colisión con el jugador
    for (let i = this.mosquitos.length - 1; i >= 0; i--) {
      const mosquito = this.mosquitos[i];
      mosquito.x -= 200 * (deltaTime / 1000); // Velocidad horizontal de los mosquitos
  
      const playerBounds = this.playerHombre.getBounds();
      const mosquitoBounds = mosquito.getBounds();
  
      if (playerBounds.intersects(mosquitoBounds)) {
        // Realiza acciones cuando el jugador colisiona con un mosquito, por ejemplo, eliminar el mosquito.
        this.onMosquitoCollision(mosquito);
        this.changeToFinalScene();
      }
  
      if (mosquito.x < -mosquito.width) {
        // Elimina el mosquito si sale de la pantalla
        this.removeMosquito(mosquito);
      }
      // Actualiza el temporizador de aparición de mosquitos
      this.accumulatedMosquitoTime += deltaTime;

      // Verifica si ha pasado el tiempo suficiente para crear un nuevo mosquito
      if (this.accumulatedMosquitoTime >= this.mosquitoSpawnInterval) {
        this.spawnMosquito();
        this.accumulatedMosquitoTime -= this.mosquitoSpawnInterval; // Asegúrate de restar el intervalo de tiempo
    }
    }
  
    this.updateMonedasColision();
  }
  
  
  private spawnMoneda(): void {
    const moneda = Sprite.from("moneda");
    const posY = 970; // Aparecer desde la coordenada Y de 540 hacia abajo
    moneda.position.set(1920, posY); // Iniciar desde la derecha
    moneda.scale.set(0.25);
    this.monedas.push(moneda);
    this.world.addChild(moneda);
  }

  private spawnDino(): void {
    const dino = new DinoConPatineta();
    dino.position.set(1920, 890); // Posición inicial del dino
    dino.setSpeedX(-100); // Velocidad horizontal del dino
    this.world.addChild(dino);
    this.dinos.push(dino);
  }
  private onMosquitoCollision(mosquito: Mosquito): void {
    // Realiza acciones cuando el jugador colisiona con un mosquito
    // Por ejemplo, puedes eliminar el mosquito aquí.
    const index = this.mosquitos.indexOf(mosquito);
    if (index !== -1) {
      this.mosquitos.splice(index, 1); // Elimina el mosquito del arreglo
    }
  
    this.world.removeChild(mosquito); // Elimina el mosquito del mundo
  
    // Agrega aquí cualquier otra acción que desees realizar cuando colisiona con un mosquito.
  }
  
  private removeDino(dino: DinoConPatineta): void {
    // Encuentra el índice del dino en el arreglo y elimínalo
    const index = this.dinos.indexOf(dino);
    if (index !== -1) {
      this.dinos.splice(index, 1); // Elimina el dino del arreglo
    }
  
    // Elimina el dino del mundo
    this.world.removeChild(dino);
  }
  private spawnMosquito(): void {
    const mosquito = new Mosquito();
    mosquito.position.set(1920, 640); // Posición inicial del mosquito (ajusta la posición como desees)
    this.world.addChild(mosquito);
    this.mosquitos.push(mosquito); // Agrega el mosquito al arreglo de mosquitos
  }
  private removeMosquito(mosquito: Mosquito): void {
    // Encuentra el índice del mosquito en el arreglo y elimínalo
    const index = this.mosquitos.indexOf(mosquito);
    if (index !== -1) {
        this.mosquitos.splice(index, 1); // Elimina el mosquito del arreglo
    }

    // Elimina el mosquito del mundo
    this.world.removeChild(mosquito);

    // Reinicia el tiempo acumulado para que el próximo mosquito aparezca según el intervalo
    this.accumulatedMosquitoTime = 0;
}
  private changeToFinalScene(): void {
    this.juegoEnCurso = false;
    const sndCancion = sound.find("cancion");
    sndCancion.stop(); 
  
      
    // Eliminar los elementos visuales y recursos específicos de TinkerScene
    this.removeChildren();
  
    // Detener el bucle de juego de TinkerScene
    this.app.ticker.remove(this.update, this);
  
    // Crear una instancia de FinalScene y agregarla al escenario
    const finalScene = new FinalScene(this.app);
    this.app.stage.addChild(finalScene);
  
    // Eliminar la instancia de TinkerScene del escenario
    this.app.stage.removeChild(this);
    
  }
  

  private changeToWinScene(): void {
    // Establece el juego como no en curso
    this.juegoEnCurso = false;
    const sndCancion = sound.find("cancion");
  sndCancion.stop(); 

  // Eliminar los elementos visuales y recursos específicos de TinkerScene
  this.removeChildren();
  
    // Crea una instancia de WinScene y agrégala al escenario
    const winScene = new WinScene(this.app);
    this.app.stage.addChild(winScene);
  
    // Limpia la escena actual (TinkerScene)
    this.app.stage.removeChild(this);
  }
}
