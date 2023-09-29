import { Container, Text, TextStyle, Sprite, Texture } from "pixi.js";
import { sound } from "@pixi/sound";
import { Player } from "../game/Player";
import { GlowFilter } from "@pixi/filter-glow";

export class TinkerScene extends Container {
  private playerHombre: Player;
  private monedasRecogidas: number = 0;
  private textoMonedas: Text;
  private monedas: Sprite[] = [];
  private monedasSpeed: number = -100; // Velocidad de las monedas
  private world: Container;
  

  private timePassed: number = 0;

  monedaChicaContainer: any;
  monedaChicaSprite: Sprite;
  
  private timePassedMonedas: number = 0;

  constructor() {
    super();

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
const fondoAncho = 2040;
const fondoAlto = 1100;

// Crea la imagen de fondo y configura la escala (sin tiling)
const background = new Sprite(Texture.from("fondo"));
background.width = fondoAncho;
background.height = fondoAlto;
this.world.addChild(background);

    this.playerHombre = new Player();
    const myGlow = new GlowFilter({ color: 0xFF0000, distance: 50 });
    this.playerHombre.filters = [myGlow];
    this.world.addChild(this.playerHombre);

    this.monedasRecogidas = 0;

    this.monedaChicaContainer = new Container();
    this.monedaChicaContainer.position.set(1780, 20);
    this.world.addChild(this.monedaChicaContainer);

    this.monedaChicaSprite = Sprite.from("moneda");
    this.monedaChicaSprite.scale.set(0.21);
    this.monedaChicaSprite.position.set(0, 0);
    this.monedaChicaContainer.addChild(this.monedaChicaSprite);

    const sndCancion = sound.find("cancion");
    sndCancion.play({ volume: 0.2, loop: true });

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

  public update(deltaTime: number, _deltaFrame: number): void {
    this.timePassed += deltaTime;
  
    if (this.timePassed > 2000) {  
      this.timePassed = 0;
    }
  
    this.timePassedMonedas += deltaTime;
    if (this.timePassedMonedas > 6000) {
      this.timePassedMonedas = 0;
      this.spawnMoneda();
    }
  
    for (let i = this.monedas.length - 1; i >= 0; i--) {
      const moneda = this.monedas[i];
      moneda.x += this.monedasSpeed * (deltaTime / 1000);
    
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
  
    this.updateMonedasColision();
  }

  private spawnMoneda(): void {
    const moneda = Sprite.from("moneda");
    const posY = Math.random() * 540 + 540; // Aparecer desde la coordenada Y de 540 hacia abajo
    moneda.position.set(1920, posY); // Iniciar desde la derecha
    moneda.scale.set(0.25);
    this.monedas.push(moneda);
    this.world.addChild(moneda);
  }
}
