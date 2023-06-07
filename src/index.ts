import { Application, Container, Loader, Sprite } from 'pixi.js'

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	backgroundColor: 0x6495ed,
	width: 1280,
	height: 720
});

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


Loader.shared.add({url: "./dino.png", name:"myDino"});
Loader.shared.add({url: "./patineta.png", name:"patineta"});
Loader.shared.add({url: "./capa.png", name:"capa"});
Loader.shared.add({url: "./corona.png", name:"corona"});


Loader.shared.onComplete.add(()=>{
const dino: Sprite = Sprite.from("myDino");
const patineta: Sprite = Sprite.from("patineta");
const capa: Sprite = Sprite.from("capa");
const corona: Sprite = Sprite.from("corona");

patineta.position.set(10,100);
patineta.scale.set(0.7,0.7);
corona.scale.set(0.4,0.4);
corona.position.set(150,-59);
capa.position.set(198,-55);
capa.scale.set(0.7,0.7);
capa.angle = 105;

const dinoWithPatineta: Container = new Container();

dinoWithPatineta.addChild(patineta);
dinoWithPatineta.addChild(dino);
dinoWithPatineta.addChild(capa);
dinoWithPatineta.addChild(corona);

dinoWithPatineta.x= 200;
dinoWithPatineta.y= 300;

app.stage.addChild(dinoWithPatineta);

});

Loader.shared.load();