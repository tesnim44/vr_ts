import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";


k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,
  sliceY: 31,
  anims: {
    "idle-down": 936,
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
    "idle-side": 975,
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
    "idle-up": 1014,
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

k.loadSprite("map", "./map.png");

k.setBackground(k.Color.fromHex("#311047"));

k.scene("main", async () => {
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers; 
  
  //Create a map Object  
  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor),k.z(0)]);

  //Create a player Object
  const player = k.add([
  k.sprite("spritesheet", { anim: "idle-down" }),
  k.area({ shape: new k.Rect(k.vec2(0, 3), 15, 15) }),
  k.body(),
  k.anchor("center"),
  k.pos(0, 0),       // spawn will update later
  k.scale(scaleFactor),
  {
    speed: 250,
    direction: "down",
    isInDialogue: false,
  },
  "player",
]);

console.log("Player created at", player.pos);




//Fixing player should repoect Boundaries
for (const layer of layers) {
  //SpawnPoint Layer
  if (layer.name === "spawnpoint") {
      for (const obj of layer.objects) {
        if (obj.name === "player") {
          player.pos = k.vec2(
            (obj.x) * scaleFactor,
            (obj.y) * scaleFactor
          );
          console.log("Player spawned at:", player.pos);
        }
      }
    }

  //Boundaries layer

  if (layer.name === "boundaries") {
  for (const boundary of layer.objects) {
    const w = boundary.width || 16;
    const h = boundary.height || 16;
    
    k.add([
      k.pos(boundary.x * scaleFactor, boundary.y * scaleFactor),
      k.rect(boundary.width * scaleFactor, boundary.height * scaleFactor),
      k.color(0,255,0),
      k.opacity(0.5),
      k.solid(),
      "boundary",
      k.layer("boundaries")
    ]);

      // Optional: dialogue trigger
      if (boundary.name) {
        player.onCollide(boundary.name, () => {
          player.isInDialogue = true;
          displayDialogue(dialogueData[boundary.name], 
            () => (player.isInDialogue = false));
        });
      }
    }
    continue;
  }
}

  player.onCollide("boundary", (b) => {
    console.log("Player collided with boundary at:", b.pos);
  });

  k.onUpdate(() => {
    const touching = k.get("boundary").some(b => player.isTouching(b));
    if (touching) console.log("Player is touching a boundary!");
  });

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y + 100);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  k.onKeyRelease(() => {
    stopAnims();
  });
  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});
function create() {
  const map = this.make.tilemap({ key: 'map' });
  const tileset = map.addTilesetImage('tilesetName', 'tiles');
  const ground = map.createLayer('ground', tileset, 0, 0);

  // Get all objects from the layer "stands"
  const stands = map.getObjectLayer('stands').objects;

  stands.forEach(obj => {
    // Create an invisible hit zone for each stand
    const zone = this.add.zone(obj.x, obj.y, obj.width, obj.height);
    zone.setOrigin(0);
    this.physics.world.enable(zone);
    zone.setInteractive();

    // On click
    zone.on('pointerdown', () => {
      showCompanyInfo(obj.name, obj.properties);
    });
  });
}

function showCompanyInfo(name, props) {
  console.log('Company:', name);
  console.log('Availability:', props.find(p => p.name === 'availability')?.value);
  console.log('Video:', props.find(p => p.name === 'video')?.value);
  // You can also open a modal or HTML div overlay with this info
}

k.go("main");
