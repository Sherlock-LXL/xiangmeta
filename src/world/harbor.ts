import * as T from "three";
import { harbor, harborHeight } from "../../shared/harbor.mjs";
import { material, mesh, softBox } from "./architecture";
import { sign, type Obstacle } from "./scenery";
import { batchStatic } from "./optimizer";
import { kit, place, roof, beam as paintedBeam, lantern } from "./vernacular";

/** 中心岛下方码头包含绳栏坡道、售票亭与系泊帆船。 */
export function buildHarbor(scene: T.Scene, obstacles: Obstacle[]) {
  const root = new T.Group();
  root.name = "harbor";
  scene.add(root);
  const wood = kit.timberLight(),
    post = kit.timber(),
    cap = kit.stoneDark(),
    rope = material("#b59a6c", 0.92, 0, "wood");
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: T.Material = wood,
  ) => mesh(root, softBox(w, h, d), m, x, y, z);
  const beam = (a: T.Vector3, b: T.Vector3, r: number, m: T.Material) => {
    const v = b.clone().sub(a),
      o = mesh(root, new T.CylinderGeometry(r, r, v.length(), 6), m);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
    return o;
  };
  // 短斜木板贴合实际行走面。
  for (let z = harbor.rampStart; z < harbor.deckEnd; z += 0.32) {
    const end = Math.min(z + 0.318, harbor.deckEnd),
      a = harborHeight(0, z)!,
      b = harborHeight(0, end)!,
      plank = box(
        z < 22 ? 3.6 : 7.4,
        0.16,
        Math.hypot(end - z, b - a),
        0,
        (a + b) / 2 - 0.085,
        (z + end) / 2,
        Math.round(z / 0.32) % 5 ? wood : post,
      );
    plank.rotation.x = -Math.atan2(b - a, end - z);
  }
  for (const side of [-1, 1]) {
    for (const z of [9.2, 11, 12.8, 14.6, 16.4, 18.2, 20, 22]) {
      const y = harborHeight(0, z)!;
      const p = box(0.13, 1.08, 0.13, side * 1.68, y + 0.48, z, post);
      p.name = z === 22 ? "harbor-ramp-end-post" : "harbor-ramp-post";
      box(0.17, 0.07, 0.17, side * 1.68, y + 1.06, z, cap);
    }
    for (const h of [0.38, 0.92])
      beam(
        new T.Vector3(side * 1.68, h, 9.2),
        new T.Vector3(side * 1.68, harbor.level + h, 22),
        0.03,
        rope,
      );
    obstacles.push({
      x: side * 1.68,
      z: 15.6,
      radius: 0.025,
      segment: [side * 1.68, 9.2, side * 1.68, 22],
      height: 1.3,
    });
    for (const z of [22.2, 24.2, 26.2, 28.6]) {
      box(0.18, 1.08, 0.18, side * 3.52, harbor.level + 0.48, z, post);
      box(0.28, 0.1, 0.28, side * 3.52, harbor.level + 1.05, z, cap);
      box(0.24, 2.8, 0.24, side * 3.3, -6, z, post);
    }
    for (const h of [0.4, 0.95])
      beam(
        new T.Vector3(side * 3.52, harbor.level + h, 22.2),
        new T.Vector3(side * 3.52, harbor.level + h, 28.6),
        0.03,
        rope,
      );
    obstacles.push({
      x: side * 3.52,
      z: 25.5,
      radius: 0.04,
      segment: [side * 3.52, 22, side * 3.52, 29],
      height: harbor.level + 1.3,
    });
  }
  // 售票亭采用漆柱与小瓦顶，柜台朝向坡道上方。
  const y = harbor.level;
  for (const x of [-1.4, 1.4])
    for (const z of [26.3, 27.9]) {
      place(root, new T.CylinderGeometry(0.13, 0.15, 0.12, 10), kit.stone(), x, y + 0.06, z);
      place(root, new T.CylinderGeometry(0.08, 0.09, 2.38, 10), kit.lacquer(), x, y + 1.31, z);
      obstacles.push({ x, z, radius: 0.15, height: y + 2.5 });
    }
  paintedBeam(root, 3.1, 0, y + 2.5, 26.3, 0, 0.2, 0.14);
  paintedBeam(root, 3.1, 0, y + 2.5, 27.9, 0, 0.2, 0.14);
  roof(root, {
    width: 3,
    depth: 1.7,
    height: 0.62,
    overhang: 0.42,
    lift: 0.22,
    y: y + 2.6,
    z: 27.1,
  });
  box(2.5, 0.88, 0.8, 0, y + 0.44, 26.7, post);
  box(2.8, 0.12, 1, 0, y + 0.94, 26.7, wood);
  for (let i = 0; i < 5; i++) box(0.36, 0.6, 0.03, -1 + i * 0.5, y + 0.45, 26.29, kit.lattice());
  const name = sign(root, "海风港口", "等下一次，向海出发", "#acd9c5", 2.7, 0.55);
  name.position.set(0, y + 1.9, 27.1);
  name.rotation.y = Math.PI;
  obstacles.push({ x: 0, z: 26.7, radius: 0, halfX: 1.35, halfZ: 0.5, height: y + 1.06 });
  box(7.25, 0.09, 0.09, 0, y + 0.95, 28.75, rope);
  obstacles.push({
    x: 0,
    z: 28.75,
    radius: 0.04,
    segment: [-3.6, 28.75, 3.6, 28.75],
    height: y + 1.3,
  });
  // 石系缆柱与盘绳位于通行带外。
  for (const x of [-2.9, 2.9])
    for (const z of [23, 27.6]) {
      place(root, new T.CylinderGeometry(0.12, 0.15, 0.3, 10), kit.stone(), x, y + 0.15, z);
      place(root, new T.SphereGeometry(0.13, 10, 6), kit.stone(), x, y + 0.33, z).scale.y = 0.6;
    }
  for (let i = 0; i < 3; i++) {
    const coil = mesh(
      root,
      new T.TorusGeometry(0.22 - i * 0.05, 0.03, 5, 20),
      rope,
      -3.1,
      y + 0.04 + i * 0.05,
      25.2,
    );
    coil.rotation.x = Math.PI / 2;
  }
  lantern(root, 3.05, 25.2, 0.62, y);
  obstacles.push({ x: 3.05, z: 25.2, radius: 0.25, height: y + 1.2 });
  const release = batchStatic(root);
  // 双桅帆船与小篷艇朝向海面。
  const boat = new T.Group();
  boat.name = "harbor-launch";
  boat.position.set(0.65, -5.38, 35);
  boat.scale.setScalar(1.18);
  scene.add(boat);
  const hullWood = material("#654331", 0.82, 0.02, "wood"),
    hullDark = material("#352f2b", 0.9, 0.01, "wood"),
    trim = material("#a34d38", 0.86, 0.01, "wood"),
    seam = material("#8c6845", 0.92, 0, "wood"),
    cut = Math.acos(0.58);
  const hull = mesh(
    boat,
    new T.SphereGeometry(1, 48, 20, 0, Math.PI * 2, cut, Math.PI - cut),
    hullWood,
  );
  hull.scale.set(1.55, 0.78, 3.7);
  const lowerHull = mesh(
    boat,
    new T.SphereGeometry(1, 40, 16, 0, Math.PI * 2, cut + 0.18, Math.PI - cut - 0.36),
    hullDark,
    0,
    -0.08,
  );
  lowerHull.scale.set(1.42, 0.72, 3.55);
  const outline = new T.Shape();
  outline.absellipse(0, 0, 1.3, 3.08, 0, Math.PI * 2, false, 0);
  const deck = mesh(
    boat,
    new T.ExtrudeGeometry(outline, { depth: 0.14, bevelEnabled: false, curveSegments: 56 }),
    wood,
    0,
    0.48,
  );
  deck.rotation.x = -Math.PI / 2;
  deck.name = "launch-oval-deck";
  for (let z = -2.8; z <= 2.8; z += 0.3) {
    const w = 2.58 * Math.sqrt(Math.max(0, 1 - (z / 3.08) ** 2));
    mesh(boat, new T.BoxGeometry(w, 0.009, 0.018), seam, 0, 0.626, z);
  }
  const gunwale = mesh(boat, new T.TorusGeometry(1, 0.045, 7, 72), trim, 0, 0.65);
  gunwale.rotation.x = Math.PI / 2;
  gunwale.scale.set(1.34, 3.16, 1);
  for (const side of [-1, 1]) {
    for (const z of [-2.15, -1.35, -0.55, 0.25, 1.05, 1.85])
      mesh(boat, new T.CylinderGeometry(0.026, 0.032, 0.54, 6), post, side * 1.22, 0.9, z);
    for (const h of [0.8, 1.13])
      mesh(
        boat,
        new T.BoxGeometry(0.055, 0.045, 4.55),
        h > 0.9 ? trim : post,
        side * 1.22,
        h,
        -0.12,
      );
  }
  for (const s of [-1, 1]) {
    const end = mesh(boat, softBox(1.08, 0.62, 0.88), hullWood, 0, 0.82, s * 3.05);
    end.rotation.x = -s * 0.31;
    mesh(boat, new T.BoxGeometry(0.96, 0.08, 0.5), trim, 0, 1.06, s * 3.17).rotation.x = -s * 0.31;
  }
  // 船尾玻璃舱配浅瓦顶。
  mesh(boat, softBox(2.05, 0.92, 1.28), kit.plaster(), 0, 1.11, -1.7);
  for (const z of [-2.35, -1.05])
    for (const x of [-0.66, 0, 0.66])
      mesh(boat, new T.BoxGeometry(0.5, 0.48, 0.028), kit.lattice(), x, 1.18, z).castShadow = false;
  roof(boat, {
    width: 2.35,
    depth: 1.55,
    height: 0.45,
    overhang: 0.28,
    lift: 0.17,
    thickness: 0.07,
    y: 1.62,
    z: -1.7,
  });
  for (const x of [-0.88, 0.88]) lantern(boat, x, -2.25, 0.28, 0.78);
  const sailCanvas = material("#b96843", 0.95, 0, "plaster");
  sailCanvas.side = T.DoubleSide;
  const sail = (z: number, height: number, width: number, lean: number, color: T.Material) => {
    mesh(
      boat,
      new T.CylinderGeometry(0.043, 0.065, height + 0.6, 8),
      post,
      0,
      0.72 + (height + 0.6) / 2,
      z,
    );
    const rig = new T.Group();
    rig.position.set(0, 1.05, z);
    rig.rotation.y = Math.PI / 2 + lean;
    boat.add(rig);
    const shape = new T.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(width, 0.08);
    shape.quadraticCurveTo(width * 1.08, height * 0.55, width * 0.82, height);
    shape.lineTo(0, height * 0.92);
    shape.closePath();
    mesh(rig, new T.ShapeGeometry(shape, 12), color, 0, 0, 0.07).castShadow = false;
    for (let i = 0; i < 6; i++) {
      const h = 0.06 + (i * height) / 5.5,
        w = width * (1 - 0.03 * i);
      mesh(rig, new T.BoxGeometry(w, 0.032, 0.032), post, w / 2, h, 0.1);
    }
  };
  sail(0.85, 3, 1.95, -0.2, sailCanvas);
  sail(-0.8, 2.25, 1.35, 0.18, material("#d2a65d", 0.96, 0, "plaster"));
  const oar = mesh(boat, new T.BoxGeometry(0.07, 0.05, 1.55), post, 0.65, 0.78, -3);
  oar.rotation.x = -0.44;
  const tender = new T.Group();
  tender.name = "harbor-tender";
  tender.position.set(-3, -5.39, 32.4);
  tender.scale.setScalar(1.08);
  scene.add(tender);
  const tenderHull = mesh(
    tender,
    new T.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.acos(0.58), Math.PI - Math.acos(0.58)),
    material("#78523b", 0.86, 0.01, "wood"),
  );
  tenderHull.scale.set(0.72, 0.42, 1.75);
  mesh(tender, new T.BoxGeometry(1.08, 0.1, 2.65), kit.timberLight(), 0, 0.31);
  const awning = material("#d8c08b", 0.96, 0, "wood");
  awning.side = T.DoubleSide;
  const canopy = mesh(
    tender,
    new T.CylinderGeometry(0.52, 0.52, 1.35, 14, 1, true, 0, Math.PI),
    awning,
    0,
    0.44,
    -0.15,
  );
  canopy.rotation.x = -Math.PI / 2;
  for (const z of [-0.78, -0.42, -0.06, 0.3])
    mesh(tender, new T.TorusGeometry(0.53, 0.025, 5, 18, Math.PI), post, 0, 0.44, z);
  for (const side of [-1, 1]) {
    const o = mesh(tender, new T.BoxGeometry(0.045, 0.035, 1.8), post, side * 0.58, 0.42, 0.25);
    o.rotation.x = side * 0.12;
  }
  mesh(tender, new T.BoxGeometry(0.32, 0.07, 0.65), kit.timber(), 0, 0.48, 1.16);
  boat.updateMatrixWorld(true);
  for (const side of [-1, 1]) {
    const end = boat.localToWorld(new T.Vector3(side * 1.08, 0.72, -3));
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(side * 2.9, y + 0.3, 27.6),
      new T.Vector3(side * 3.1, -5.08, 29.4),
      end,
    ]);
    mesh(root, new T.TubeGeometry(curve, 12, 0.018, 5, false), rope).castShadow = false;
  }
  tender.updateMatrixWorld(true);
  const tenderEnd = tender.localToWorld(new T.Vector3(0.45, 0.38, -1.25)),
    tenderLine = new T.CatmullRomCurve3([
      new T.Vector3(-2.9, y + 0.3, 27.6),
      new T.Vector3(-3.35, -5.12, 29.3),
      tenderEnd,
    ]);
  mesh(root, new T.TubeGeometry(tenderLine, 12, 0.018, 5, false), rope).castShadow = false;
  const boatRelease = batchStatic(boat),
    tenderRelease = batchStatic(tender);
  let time = 0;
  return {
    root,
    boat,
    tender,
    update(dt: number) {
      time += dt;
      boat.position.y = -5.38 + Math.sin(time * 0.64) * 0.05;
      boat.rotation.z = Math.sin(time * 0.5) * 0.012;
      tender.position.y = -5.39 + Math.sin(time * 0.78 + 0.8) * 0.065;
      tender.rotation.z = Math.sin(time * 0.62 + 0.5) * 0.022;
    },
    dispose() {
      release();
      boatRelease();
      tenderRelease();
    },
  };
}
