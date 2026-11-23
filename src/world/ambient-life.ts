import * as T from "three";
import { batchStatic } from "./optimizer";

const SEA_Y = -5.48;
type BirdKind = "swallow" | "gull" | "crane";
type VesselKind = "sampan" | "junk" | "fishing";
type WingedBird = T.Group & { userData: { wings?: T.Group[] } };
type Flyby = {
  root: T.Group;
  birds: WingedBird[];
  path: T.CatmullRomCurve3;
  cooldown: number;
  progress: number;
  duration: number;
  reverse: boolean;
};
type LeapingFish = {
  root: T.Group;
  splashes: T.Mesh[];
  spot: T.Vector2;
  cooldown: number;
  progress: number;
  duration: number;
  height: number;
  travel: number;
  angle: number;
};
type Vessel = {
  root: T.Group;
  radius: number;
  zScale: number;
  angle: number;
  speed: number;
  direction: number;
};

const material = (color: string, roughness = 0.84) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.02, flatShading: true });
const place = (
  parent: T.Object3D,
  geometry: T.BufferGeometry,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const mesh = new T.Mesh(geometry, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
};
const triangle = (points: number[]) => {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
};

function bird(kind: BirdKind, perched = false): WingedBird {
  const root = new T.Group() as WingedBird;
  root.name = `${perched ? "perched" : "flying"}-${kind}`;
  root.userData.dynamic = true;
  const colors =
    kind === "swallow"
      ? ["#253b42", "#4f7376", "#e4d6bd", "#c79a56"]
      : kind === "gull"
        ? ["#eee9dc", "#85939a", "#fbf5e7", "#c4a34d"]
        : ["#f0ede2", "#273c42", "#ded9ca", "#b44b36"];
  const bodyY = perched ? 0.24 : 0,
    body = place(root, new T.SphereGeometry(1, 14, 9), material(colors[0]), 0, bodyY, 0);
  body.scale.set(
    kind === "crane" ? 0.14 : 0.16,
    kind === "crane" ? 0.14 : 0.145,
    kind === "crane" ? 0.54 : 0.4,
  );
  const chest = place(
    root,
    new T.SphereGeometry(1, 12, 8),
    material(colors[2]),
    0,
    bodyY - 0.035,
    0.17,
  );
  chest.scale.set(kind === "crane" ? 0.105 : 0.12, 0.105, 0.23);
  const head = place(
    root,
    new T.SphereGeometry(kind === "crane" ? 0.12 : 0.135, 12, 8),
    material(kind === "crane" ? colors[3] : colors[0]),
    0,
    bodyY + 0.055,
    0.37,
  );
  if (kind === "crane") {
    const neck = place(
      root,
      new T.CylinderGeometry(0.036, 0.052, 0.42, 8),
      material(colors[0]),
      0,
      bodyY + 0.16,
      0.28,
    );
    neck.rotation.x = -0.43;
    head.position.set(0, bodyY + 0.34, 0.48);
    for (const side of [-1, 1]) {
      const leg = place(
        root,
        new T.CylinderGeometry(0.012, 0.016, 0.42, 5),
        material("#7d6045"),
        side * 0.045,
        bodyY - 0.08,
        -0.38,
      );
      leg.rotation.x = Math.PI / 2 - 0.2;
    }
  }
  const eyeMaterial = material("#171b1b", 0.65);
  for (const side of [-1, 1])
    place(
      root,
      new T.SphereGeometry(0.018, 7, 5),
      eyeMaterial,
      side * (kind === "crane" ? 0.075 : 0.09),
      head.position.y + 0.025,
      head.position.z + 0.095,
    );
  const beak = place(
    root,
    new T.ConeGeometry(kind === "crane" ? 0.032 : 0.04, kind === "crane" ? 0.28 : 0.18, 6),
    material(colors[3]),
    0,
    head.position.y,
    head.position.z + (kind === "crane" ? 0.18 : 0.16),
  );
  beak.rotation.x = Math.PI / 2;
  const wingMaterial = material(colors[1]),
    featherMaterial = material(kind === "gull" ? "#5f737b" : "#21343a");
  wingMaterial.side = featherMaterial.side = T.DoubleSide;
  const spread = perched ? 0.34 : kind === "crane" ? 1.02 : 0.76,
    wings: [T.Group, T.Group] = [-1, 1].map((side) => {
      const wing = new T.Group();
      wing.position.y = bodyY + 0.035;
      wing.userData.dynamic = true;
      root.add(wing);
      place(
        wing,
        triangle([
          0,
          0,
          0.15,
          side * 0.4,
          0.018,
          0.05,
          side * spread,
          0,
          -0.08,
          side * 0.28,
          0,
          -0.38,
        ]),
        wingMaterial,
      );
      if (!perched)
        for (let i = 0; i < 3; i++) {
          const base = 0.28 + i * 0.13,
            tip = Math.min(spread, 0.63 + i * 0.13);
          place(
            wing,
            triangle([
              side * base,
              0.006,
              -0.08,
              side * tip,
              0,
              -0.17 - i * 0.035,
              side * (base + 0.08),
              0,
              -0.42 + i * 0.035,
            ]),
            featherMaterial,
          );
        }
      wing.rotation.z = perched ? side * 0.52 : 0;
      return wing;
    }) as [T.Group, T.Group];
  root.userData.wings = wings;
  const tailMaterial = material(colors[1]);
  tailMaterial.side = T.DoubleSide;
  const tailLength = kind === "swallow" ? 0.68 : kind === "crane" ? 0.52 : 0.4;
  for (const side of [-1, 1])
    place(
      root,
      triangle([
        0,
        0,
        -0.2,
        side * (kind === "swallow" ? 0.23 : 0.16),
        0,
        -tailLength,
        side * 0.035,
        0,
        -tailLength + 0.1,
      ]),
      tailMaterial,
      0,
      bodyY,
      0,
    );
  if (perched) {
    const legMaterial = material(kind === "crane" ? "#7b5a3d" : "#9a7442");
    for (const side of [-1, 1]) {
      place(
        root,
        new T.CylinderGeometry(0.012, 0.015, 0.2, 5),
        legMaterial,
        side * 0.05,
        0.11,
        0.02,
      );
      place(root, new T.BoxGeometry(0.11, 0.018, 0.018), legMaterial, side * 0.065, 0.008, 0.05);
    }
  }
  root.scale.setScalar(kind === "crane" ? 1.42 : 1.08);
  return root;
}

function flap(entry: WingedBird, time: number, amount = 1) {
  const wings = entry.userData.wings;
  if (!wings) return;
  const angle = Math.sin(time) * 0.72 * amount;
  wings[0].rotation.z = -angle;
  wings[1].rotation.z = angle;
}

function fish(color: string) {
  const root = new T.Group();
  root.name = "leaping-fish";
  root.userData.dynamic = true;
  const body = place(root, new T.SphereGeometry(1, 12, 7), material(color), 0, 0, 0);
  body.scale.set(0.13, 0.16, 0.42);
  const finMaterial = material("#d7b66e");
  finMaterial.side = T.DoubleSide;
  place(root, triangle([0, 0, -0.3, -0.22, 0.02, -0.62, 0, 0.02, -0.54]), finMaterial);
  place(root, triangle([0, 0, -0.3, 0.22, 0.02, -0.62, 0, 0.02, -0.54]), finMaterial);
  place(root, new T.ConeGeometry(0.035, 0.14, 5), finMaterial, 0, 0, 0.43).rotation.x =
    -Math.PI / 2;
  return root;
}

function vessel(kind: VesselKind) {
  const root = new T.Group();
  root.name = `passing-${kind}`;
  root.userData.dynamic = true;
  const hull = material(kind === "junk" ? "#744632" : kind === "fishing" ? "#416d71" : "#79533b"),
    lower = material("#30383a"),
    timber = material("#765139"),
    paper = material("#ded1ae"),
    painted = material(kind === "fishing" ? "#579084" : "#a6513b"),
    gold = material("#b38b48");
  const long = kind === "junk" ? 2.7 : kind === "fishing" ? 2.05 : 1.75,
    wide = kind === "junk" ? 0.9 : kind === "fishing" ? 0.72 : 0.62;
  const shell = place(root, new T.SphereGeometry(1, 28, 12), hull);
  shell.scale.set(wide, 0.38, long);
  const keel = place(
    root,
    new T.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0.88, 1.38),
    lower,
    0,
    -0.08,
  );
  keel.scale.set(wide * 0.9, 0.38, long * 0.96);
  place(root, new T.BoxGeometry(wide * 1.6, 0.1, long * 1.55), timber, 0, 0.3, 0);
  for (const side of [-1, 1]) {
    place(root, new T.BoxGeometry(0.035, 0.28, long * 1.35), painted, side * wide * 0.76, 0.46, 0);
    for (const z of [-long * 0.48, 0, long * 0.48])
      place(
        root,
        new T.CylinderGeometry(0.018, 0.022, 0.42, 5),
        timber,
        side * wide * 0.76,
        0.48,
        z,
      );
  }
  for (const side of [-1, 1]) {
    const cap = place(
      root,
      new T.BoxGeometry(wide * 0.72, 0.32, 0.48),
      hull,
      0,
      0.48,
      side * long * 0.86,
    );
    cap.rotation.x = -side * 0.28;
  }
  if (kind === "sampan") {
    const canopy = place(
      root,
      new T.CylinderGeometry(0.48, 0.48, 1.05, 10, 1, true, 0, Math.PI),
      paper,
      0,
      0.28,
      -0.2,
    );
    canopy.rotation.x = -Math.PI / 2;
    for (const z of [-0.7, -0.35, 0, 0.35])
      place(root, new T.TorusGeometry(0.49, 0.018, 4, 12, Math.PI), timber, 0, 0.28, z);
    for (const side of [-1, 1]) {
      const oar = place(
        root,
        new T.BoxGeometry(0.035, 0.025, 1.7),
        timber,
        side * 0.58,
        0.38,
        0.15,
      );
      oar.rotation.x = side * 0.12;
    }
  } else if (kind === "junk") {
    place(root, new T.BoxGeometry(1.28, 0.62, 0.9), paper, 0, 0.69, -1.28);
    place(root, new T.BoxGeometry(1.5, 0.09, 1.08), painted, 0, 1.04, -1.28);
    const sailMaterial = material("#bc6c43"),
      foreMaterial = material("#d4a65c");
    sailMaterial.side = foreMaterial.side = T.DoubleSide;
    for (const [z, height, width, color] of [
      [0.62, 2.45, 1.55, sailMaterial],
      [-0.72, 1.72, 1.05, foreMaterial],
    ] as [number, number, number, T.Material][]) {
      place(
        root,
        new T.CylinderGeometry(0.025, 0.04, height + 0.45, 7),
        timber,
        0,
        0.55 + (height + 0.45) / 2,
        z,
      );
      const rig = new T.Group();
      rig.position.set(0.05, 0.72, z);
      rig.rotation.y = -0.14;
      root.add(rig);
      place(
        rig,
        triangle([0, 0, 0, width, 0.12, 0, width * 0.82, height, 0, 0, height * 0.9, 0]),
        color,
      );
      for (let i = 0; i < 5; i++)
        place(
          rig,
          new T.BoxGeometry(width * (1 - i * 0.035), 0.025, 0.025),
          timber,
          width / 2,
          0.08 + (i * height) / 4.7,
          0.025,
        );
    }
    for (const z of [-1.65, -0.85, 0, 0.85, 1.6])
      place(root, new T.CylinderGeometry(0.035, 0.04, 0.5, 6), gold, 0, 0.72, z);
  } else {
    place(root, new T.BoxGeometry(0.92, 0.76, 1.08), paper, 0, 0.7, -0.2);
    for (const side of [-1, 1])
      place(
        root,
        new T.BoxGeometry(0.25, 0.3, 0.025),
        material("#7ca4a1"),
        side * 0.27,
        0.72,
        0.35,
      );
    place(root, new T.BoxGeometry(1.12, 0.09, 1.25), painted, 0, 1.11, -0.2);
    place(root, new T.CylinderGeometry(0.025, 0.035, 1.35, 6), timber, 0, 1.6, 0.32);
    const flagMaterial = material("#b44a35");
    flagMaterial.side = T.DoubleSide;
    place(root, triangle([0, 0, 0, 0.42, -0.1, 0, 0, -0.24, 0]), flagMaterial, 0.03, 2.15, 0.32);
    for (const side of [-1, 1]) {
      const boom = place(
        root,
        new T.CylinderGeometry(0.018, 0.018, 1.5, 5),
        timber,
        side * 0.65,
        0.94,
        -0.9,
      );
      boom.rotation.x = 0.32;
      place(
        root,
        new T.TorusGeometry(0.42, 0.012, 4, 18, Math.PI),
        material("#8b704c"),
        side * 0.68,
        0.42,
        -1.3,
      ).rotation.x = Math.PI / 2;
    }
  }
  root.scale.setScalar(kind === "junk" ? 1.55 : kind === "fishing" ? 1.24 : 0.95);
  return root;
}

/** 稀疏且可复现的野生动物与航行物路线预留陆地和交通间距。 */
export class AmbientLife {
  private root = new T.Group();
  private random: () => number;
  private flybys: Flyby[] = [];
  private perched: WingedBird[] = [];
  private fish: LeapingFish[] = [];
  private vessels: Vessel[] = [];
  private releases: (() => void)[] = [];
  private elapsed = 0;
  constructor(scene: T.Scene) {
    this.root.name = "ambient-life";
    scene.add(this.root);
    let seed = 48151623;
    this.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    this.addFlyby(
      "swallow",
      5,
      [
        [-155, 30, -72],
        [-68, 28, -48],
        [25, 32, 54],
        [155, 31, 78],
      ],
      0.4,
    );
    this.addFlyby(
      "gull",
      3,
      [
        [142, 38, -112],
        [58, 36, -62],
        [-38, 39, 18],
        [-155, 37, 92],
      ],
      7,
    );
    this.addFlyby(
      "crane",
      2,
      [
        [-150, 46, 118],
        [-52, 44, 92],
        [45, 47, 104],
        [160, 45, 62],
      ],
      15,
    );
    this.addPerched("gull", 3.52, -3.48, 28.6, -Math.PI / 2, 0.86);
    this.addPerched("gull", -3.52, -3.48, 28.6, Math.PI / 2, 0.82);
    this.addPerched("swallow", 26.05, 5.1, -28.42, Math.PI, 0.72);
    for (const [x, z, color, delay] of [
      [58, 22, "#4d8a83", 2],
      [-60, 15, "#6c8793", 5],
      [5, -70, "#a66a45", 8],
      [-5, 65, "#496e78", 11],
    ] as [number, number, string, number][])
      this.addFish(x, z, color, delay);
    // 三层环位于未来岛带内、鱼群水域外。
    for (const [kind, r, phase, speed, direction] of [
      ["sampan", 88, 0.15, 0.014, 1],
      ["junk", 95, 2.45, 0.011, -1],
      ["fishing", 102, 4.7, 0.009, 1],
    ] as [VesselKind, number, number, number, number][]) {
      const zScale = 1;
      const root = vessel(kind);
      this.releases.push(batchStatic(root));
      this.root.add(root);
      this.vessels.push({ root, radius: r, zScale, angle: phase, speed, direction });
    }
    this.update(0, false, 10);
  }
  private addFlyby(kind: BirdKind, count: number, points: number[][], delay: number) {
    const root = new T.Group();
    root.name = `${kind}-flyby`;
    root.visible = false;
    root.userData.dynamic = true;
    this.root.add(root);
    const birds: WingedBird[] = [];
    for (let i = 0; i < count; i++) {
      const entry = bird(kind);
      this.releases.push(batchStatic(entry));
      entry.position.set(
        (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.7,
        (i % 3) * 0.1,
        -Math.ceil(i / 2) * 0.7,
      );
      entry.scale.multiplyScalar(0.85 + (i % 3) * 0.08);
      root.add(entry);
      birds.push(entry);
    }
    this.flybys.push({
      root,
      birds,
      path: new T.CatmullRomCurve3(points.map((p) => new T.Vector3(p[0], p[1], p[2]))),
      cooldown: delay,
      progress: 0,
      duration: 18 + this.random() * 8,
      reverse: false,
    });
  }
  private addPerched(
    kind: BirdKind,
    x: number,
    y: number,
    z: number,
    rotation: number,
    scale: number,
  ) {
    const entry = bird(kind, true);
    this.releases.push(batchStatic(entry));
    entry.position.set(x, y, z);
    entry.rotation.y = rotation;
    entry.scale.multiplyScalar(scale);
    this.root.add(entry);
    this.perched.push(entry);
  }
  private addFish(x: number, z: number, color: string, delay: number) {
    const root = fish(color);
    this.releases.push(batchStatic(root));
    root.visible = false;
    this.root.add(root);
    const splashMaterial = new T.MeshBasicMaterial({
      color: "#dfe8df",
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const splashes = [0, 1].map(() => {
      const ring = place(
        this.root,
        new T.TorusGeometry(0.28, 0.018, 4, 24),
        splashMaterial.clone(),
      );
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      return ring;
    });
    this.fish.push({
      root,
      splashes,
      spot: new T.Vector2(x, z),
      cooldown: delay,
      progress: 0,
      duration: 1.6,
      height: 1,
      travel: 1.1,
      angle: 0,
    });
  }
  update(dt: number, reduced: boolean, hour: number) {
    if (reduced) {
      for (const f of this.flybys) f.root.visible = false;
      for (const f of this.fish) {
        f.root.visible = false;
        f.splashes.forEach((s) => (s.visible = false));
      }
      return;
    }
    this.elapsed += dt;
    const day = hour >= 5.5 && hour <= 19.5;
    for (const flyby of this.flybys) {
      if (!flyby.root.visible) {
        if (day && (flyby.cooldown -= dt) <= 0) {
          flyby.root.visible = true;
          flyby.progress = 0;
          flyby.duration = 18 + this.random() * 9;
          flyby.reverse = this.random() > 0.5;
        }
        continue;
      }
      if (!day) {
        flyby.root.visible = false;
        flyby.cooldown = 8 + this.random() * 15;
        continue;
      }
      flyby.progress += dt / flyby.duration;
      if (flyby.progress >= 1) {
        flyby.root.visible = false;
        flyby.cooldown = 18 + this.random() * 34;
        continue;
      }
      const t = flyby.reverse ? 1 - flyby.progress : flyby.progress,
        p = flyby.path.getPointAt(t),
        tangent = flyby.path.getTangentAt(t).multiplyScalar(flyby.reverse ? -1 : 1);
      flyby.root.position.copy(p);
      flyby.root.rotation.y = Math.atan2(tangent.x, tangent.z);
      flyby.root.rotation.z = -tangent.y * 0.18;
      flyby.birds.forEach((entry, i) =>
        flap(entry, this.elapsed * kindSpeed(entry.name) + i * 0.8),
      );
    }
    for (const entry of this.perched) flap(entry, this.elapsed * 0.8, 0.045);
    for (const entry of this.fish) this.updateFish(entry, dt);
    for (const entry of this.vessels) {
      entry.angle =
        (entry.angle + dt * entry.speed * entry.direction + Math.PI * 2) % (Math.PI * 2);
      const { radius: r, zScale, angle: a } = entry,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r * zScale;
      entry.root.position.set(x, SEA_Y + 0.2 + Math.sin(this.elapsed * 0.72 + a) * 0.045, z);
      entry.root.rotation.y = Math.atan2(
        -Math.sin(a) * r * entry.direction,
        Math.cos(a) * r * zScale * entry.direction,
      );
      entry.root.rotation.z = Math.sin(this.elapsed * 0.55 + a) * 0.012;
    }
  }
  private updateFish(entry: LeapingFish, dt: number) {
    if (!entry.root.visible) {
      if ((entry.cooldown -= dt) > 0) return;
      entry.root.visible = true;
      entry.progress = 0;
      entry.duration = 1.35 + this.random() * 0.8;
      entry.height = 0.75 + this.random() * 0.9;
      entry.travel = 0.8 + this.random() * 0.8;
      entry.angle = this.random() * Math.PI * 2;
      const dx = Math.cos(entry.angle) * entry.travel,
        dz = Math.sin(entry.angle) * entry.travel;
      entry.splashes[0].position.set(entry.spot.x - dx, SEA_Y - 0.14, entry.spot.y - dz);
      entry.splashes[1].position.set(entry.spot.x + dx, SEA_Y - 0.14, entry.spot.y + dz);
      return;
    }
    entry.progress += dt / entry.duration;
    if (entry.progress >= 1) {
      entry.root.visible = false;
      entry.splashes.forEach((s) => (s.visible = false));
      entry.cooldown = 5 + this.random() * 14;
      return;
    }
    const t = entry.progress,
      offset = (t * 2 - 1) * entry.travel,
      dx = Math.cos(entry.angle),
      dz = Math.sin(entry.angle);
    entry.root.position.set(
      entry.spot.x + dx * offset,
      SEA_Y - 0.24 + 4 * entry.height * t * (1 - t),
      entry.spot.y + dz * offset,
    );
    entry.root.rotation.y = Math.atan2(dx, dz);
    entry.root.rotation.x = -Math.atan2(4 * entry.height * (1 - 2 * t), entry.travel * 2);
    entry.splashes.forEach((s, i) => {
      const local = i === 0 ? t : 1 - t;
      s.visible = local < 0.22;
      const fade = Math.max(0, 1 - local / 0.22);
      (s.material as T.MeshBasicMaterial).opacity = fade * 0.65;
      s.scale.setScalar(1 + (1 - fade) * 2.2);
    });
  }
  get snapshot() {
    let separation = Infinity;
    for (let i = 0; i < this.vessels.length; i++)
      for (let j = i + 1; j < this.vessels.length; j++)
        separation = Math.min(
          separation,
          this.vessels[i].root.position.distanceTo(this.vessels[j].root.position),
        );
    const fishRadius = Math.max(...this.fish.map((f) => f.spot.length() + f.travel));
    return {
      flyingBirds: this.flybys.reduce((sum, f) => sum + f.birds.length, 0),
      activeFlybys: this.flybys.filter((f) => f.root.visible).length,
      birdPositions: this.flybys
        .filter((f) => f.root.visible)
        .map((f) => f.root.position.toArray()),
      perchedBirds: this.perched.length,
      fish: this.fish.length,
      activeFish: this.fish.filter((f) => f.root.visible).length,
      fishPositions: this.fish.filter((f) => f.root.visible).map((f) => f.root.position.toArray()),
      boats: this.vessels.length,
      boatPositions: this.vessels.map((v) => v.root.position.toArray()),
      boatScales: this.vessels.map((v) => v.root.scale.x),
      routeGap: 7,
      minBoatSeparation: +separation.toFixed(1),
      fishBoatBuffer: +(88 - fishRadius - 4.8).toFixed(1),
    };
  }
  dispose() {
    this.root.removeFromParent();
    this.releases.forEach((release) => release());
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    this.root.traverse((object) => {
      if (object instanceof T.Mesh) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
}

const kindSpeed = (name: string) => (name.includes("crane") ? 4.5 : name.includes("gull") ? 6 : 8);
