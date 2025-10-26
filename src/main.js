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

  // --- MAP SPRITE ---
  const map = k.add([
    k.sprite("map"),
    k.pos(0, 0),
    k.scale(scaleFactor),
    k.z(0),
  ]);

  // --- PLAYER ---
  const player = k.add([
    k.sprite("spritesheet", { anim: "idle-down" }),
    k.area({ shape: new k.Rect(k.vec2(0, 3), 15, 15) }),
    k.body(), // dynamic physics body
    k.anchor("center"),
    k.pos(0, 0),
    k.scale(scaleFactor),
    {
      speed: 60,
      direction: "down",
      isInDialogue: false,
    },
    "player",
  ]);

  // --- SPAWN POINT ---
  const spawnLayer = layers.find((l) => l.name === "spawnpoint");
  if (spawnLayer) {
    const spawnObj = spawnLayer.objects.find((o) => o.name === "player");
    if (spawnObj)
      player.pos = k.vec2(spawnObj.x * scaleFactor, spawnObj.y * scaleFactor);
  }

  // --- BOUNDARIES COLLISION ---
  const boundaryLayer = layers.find((l) => l.name === "boundaries");
  if (boundaryLayer) {
    for (const obj of boundaryLayer.objects) {
      // detect whether Tiled uses 'class', 'type', or 'name' field
      const type = obj.class || obj.type || obj.name || "wall";

      k.add([
        k.area({
          shape: new k.Rect(k.vec2(0), obj.width * scaleFactor, obj.height * scaleFactor),
        }),
        k.body({ isStatic: true }), // solid object
        k.pos(obj.x * scaleFactor, obj.y * scaleFactor),
        k.scale(1),
        type, // tag = wall / zone / etc
      ]);

      // optional debug visualization (red boxes)
      // k.add([
      //   k.rect(obj.width * scaleFactor, obj.height * scaleFactor),
      //   k.color(k.Color.fromHex("#ff0000")),
      //   k.opacity(0.2),
      //   k.pos(obj.x * scaleFactor, obj.y * scaleFactor),
      //   k.z(100),
      // ]);
    }
  }

  // --- MOVEMENT CONTROL ---
  k.onKeyDown(() => {
    if (player.isInDialogue) return;

    let moveX = 0;
    let moveY = 0;

    if (k.isKeyDown("left")) {
      player.flipX = true;
      player.play("walk-side");
      player.direction = "left";
      moveX = -player.speed;
    } else if (k.isKeyDown("right")) {
      player.flipX = false;
      player.play("walk-side");
      player.direction = "right";
      moveX = player.speed;
    } else if (k.isKeyDown("up")) {
      player.play("walk-up");
      player.direction = "up";
      moveY = -player.speed;
    } else if (k.isKeyDown("down")) {
      player.play("walk-down");
      player.direction = "down";
      moveY = player.speed;
    }

    player.move(moveX, moveY);
  });

  function stopAnims() {
    if (player.direction === "down") player.play("idle-down");
    else if (player.direction === "up") player.play("idle-up");
    else player.play("idle-side");
  }

  k.onKeyRelease(stopAnims);

  // --- COLLISIONS ---
  player.onCollide("wall", () => {
    player.stop(); // stop moving when touching wall
  });

  player.onCollide("zone", () => {
    player.stop(); // stop moving when touching zone
  });

  // --- CAMERA + MAP LIMITS ---
  k.onUpdate(() => {
    player.pos.x = k.clamp(player.pos.x, 0, map.width * scaleFactor - 16);
    player.pos.y = k.clamp(player.pos.y, 0, map.height * scaleFactor - 16);
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  setCamScale(k);
  k.onResize(() => setCamScale(k));
});

k.go("main");
