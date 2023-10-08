import { Application, Loader} from 'pixi.js';
import { assets } from './Componentes/assets';
import { Keyboard } from './utils/Keyboard';
import { StartScene } from './Scenas/StartScene'; // Importa StartScene

export const WIDTH = 1920;
export const HEIGHT = 1080;
export const GAME_DELTA_TIME = 80;
const app = new Application({
  view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  backgroundColor: 0x000000,
  width: WIDTH,
  height: HEIGHT,
});

Keyboard.initialize();

window.addEventListener("resize", ()=>{//Evento para centrar la imagen cuando se cambia el tamaño de la pantalla
	const scaleX = window.innerWidth / app.screen.width;
	const scaleY = window.innerHeight / app.screen.height;
	const scale = Math.min(scaleX, scaleY);//escala para calcular la imagen con el tamaño de pantalla que se tiene

	const gameWidth = Math.round(app.screen.width * scale);
	const gameHeight = Math.round(app.screen.height * scale);

	const marginHorizontal = Math.floor((window.innerWidth - gameWidth) / 2);
	const marginVertical = Math.floor((window.innerHeight - gameHeight) / 2);//modifica los margenes (los divide por dos para poner la mitad de cada margen en cada lado)

	app.view.style.width = gameWidth + "px";
	app.view.style.height = gameHeight + "px";//cambia la pantalla con la escala tomada

	app.view.style.marginLeft = marginHorizontal + "px";
	app.view.style.marginRight = marginHorizontal + "px";//cambia la pantalla con los margenes tomados

	app.view.style.marginTop = marginVertical + "px";
	app.view.style.marginBottom = marginVertical + "px";
});
window.dispatchEvent(new Event("resize"));

Loader.shared.add(assets);

Loader.shared.onComplete.add(() => {
	const startScene = new StartScene(app); // Pasa la instancia de 'app' a 'StartScene'
	app.stage.addChild(startScene);
  });

Loader.shared.load();