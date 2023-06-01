import { Application, Loader, Sprite } from 'pixi.js'

const app = new Application({
	view: document.getElementById("pixi-canvas") as HTMLCanvasElement,
	resolution: window.devicePixelRatio || 1,
	autoDensity: true,
	backgroundColor: 0x6495ed,
	width: 640,
	height: 480
});

Loader.shared.add({url: "./dino3.jpeg", name:"myDino"});



Loader.shared.onComplete.add(()=>{
const clampy: Sprite = Sprite.from("myDino");

clampy.anchor.set(0.5);

clampy.x = 300;
clampy.y = 300;

app.stage.addChild(clampy);
});

Loader.shared.load();