import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = s => document.querySelector(s);
const viewport = $('#viewport');
const T = THREE;
let renderer;
try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch { $('#loading').innerHTML = '<p>当前浏览器未开启 WebGL，请在支持 WebGL 的浏览器中打开。</p>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
viewport.appendChild(renderer.domElement);
const scene = new T.Scene();
const world = new T.Group(); scene.add(world);
const camera = new T.OrthographicCamera(-12, 12, 12, -12, .1, 130);
const home = { position: new T.Vector3(19, 20, 25), target: new T.Vector3(0, .7, 0), zoom: 1 };
camera.position.copy(home.position);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(home.target);
controls.enableDamping = true; controls.dampingFactor = .065;
controls.minPolarAngle = .27; controls.maxPolarAngle = Math.PI / 2.08;
controls.minZoom = .65; controls.maxZoom = 2.8;
controls.autoRotateSpeed = .55; controls.screenSpacePanning = true;
controls.touches.ONE = T.TOUCH.ROTATE; controls.touches.TWO = T.TOUCH.DOLLY_PAN;
controls.update();
const ambient = new T.HemisphereLight(0xfff4d9, 0x97aa79, 2.1); scene.add(ambient);
const sun = new T.DirectionalLight(0xffedce, 3.2); sun.position.set(-10, 19, 10);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: .5, far: 55 });
sun.shadow.bias = -.0002; sun.shadow.normalBias = .025; sun.shadow.radius = 3; scene.add(sun);
const fill = new T.DirectionalLight(0xdde7e0, .65); fill.position.set(10, 8, -12); scene.add(fill);

let seed = 108;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const choose = a => a[Math.floor(rand() * a.length)];
const palette = { wood: '#b88b61', woodLight: '#dfbd86', trunk: '#86674b', cream: '#eee6cb', metal: '#586654', soil: '#896e50', stone: '#aab29a' };
const materialCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!materialCache.has(key)) materialCache.set(key, new T.MeshStandardMaterial({ color, roughness: .92, ...opts }));
  return materialCache.get(key);
}
const seasonalMaterials = {};
function seasonMat(key, color) { const m = new T.MeshStandardMaterial({ color, roughness: 1 }); seasonalMaterials[key] = m; return m; }
const grass = seasonMat('grass', '#a9bb81');
const leaves = ['#7f9d66', '#94ae73', '#b5c68a', '#658958'].map((c, i) => seasonMat('leaves' + i, c));
const bushes = ['#91ab6c', '#a9bd7a', '#70975d'].map((c, i) => seasonMat('bush' + i, c));
const crop = seasonMat('crop', '#81a265');
const coatMaterials = ['#d18e79', '#e0b967', '#809faa', '#a4aa78', '#a69db4', '#d0a271', '#7f9990'].map((c, i) => seasonMat('coat' + i, c));
const pondMat = seasonMat('water', '#8dc4be'); pondMat.roughness = .27; pondMat.metalness = .1;
const reedMat = seasonMat('reed', '#90a870');
const flowerMat = seasonMat('flower', '#efdca7');
const geometry = { ball: new T.IcosahedronGeometry(1, 2), soft: new T.SphereGeometry(1, 12, 9), rock: new T.IcosahedronGeometry(1, 1), box: new T.BoxGeometry(1, 1, 1), cylinder: new T.CylinderGeometry(1, 1, 1, 16) };
function mesh(geo, material, x, y, z, parent = world) {
  const m = new T.Mesh(geo, typeof material === 'string' || typeof material === 'number' ? mat(material) : material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(x, y, z, w, h, d, c, p = world) { const m = mesh(geometry.box, c, x, y, z, p); m.scale.set(w, h, d); return m; }
function ball(x, y, z, r, c, p = world, sx = 1, sy = 1, sz = 1, soft = false) {
  const m = mesh(soft ? geometry.soft : geometry.ball, c, x, y, z, p); m.scale.set(r * sx, r * sy, r * sz); return m;
}
function cylinder(x, y, z, r, h, c, p = world, top = r, segments = 16) {
  if (r === top && segments === 16) { const m = mesh(geometry.cylinder, c, x, y, z, p); m.scale.set(r, h, r); return m; }
  return mesh(new T.CylinderGeometry(top, r, h, segments), c, x, y, z, p);
}
function beam(a, b, r, c, p = world) {
  const av = new T.Vector3(...a), bv = new T.Vector3(...b), v = bv.clone().sub(av);
  const m = cylinder(...av.clone().add(bv).multiplyScalar(.5).toArray(), r, v.length(), c, p, r, 8);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); return m;
}
function group(x = 0, y = 0, z = 0, p = world) { const g = new T.Group(); g.position.set(x, y, z); p.add(g); return g; }
function torus(x, y, z, r, tube, c, p = world) { return mesh(new T.TorusGeometry(r, tube, 6, 28), c, x, y, z, p); }
const snow = new T.Group(), blossoms = new T.Group(), flowers = new T.Group(), autumnLeaves = new T.Group();
world.add(snow, blossoms, flowers, autumnLeaves);
const canopyObjects = [], shrubObjects = [], fruitObjects = [], cropObjects = [], winterAccessories = [], summerHats = [], sleeves = [];
const activities = {};
function activity(name, x, z) { const g = group(x, 0, z); g.userData.activity = name; activities[name] = g; return g; }

// One solid square pedestal, with fine warm laminated edges.
box(0, -.56, 0, 16, .94, 16, '#c4b497');
box(0, -.1, 0, 16.04, .16, 16.04, '#ddd6b8');
box(0, -.012, 0, 15.95, .05, 15.95, grass);
box(0, -.49, 8.007, 15.65, .016, .008, '#d9caac');
box(8.007, -.49, 0, .008, .016, 15.65, '#d9caac');
box(0, -.74, 8.007, 15.65, .012, .008, '#ae9b7c');
box(8.007, -.74, 0, .008, .012, 15.65, '#ae9b7c');
const snowGround = box(0, .021, 0, 15.9, .035, 15.9, '#edf0e5', snow);
// Clay-matte neighborhood street and generous child-friendly pavement.
box(0, .028, 6.38, 15.9, .06, 2.7, '#b4b5a5');
box(0, .075, 4.72, 15.9, .17, .65, '#e4dec6');
box(0, .05, 7.8, 15.9, .1, .2, '#dadac7');
for (let x = -7.5; x < 8; x += .78) { box(x, .166, 4.72, .012, .008, .63, '#c4c4af'); if (x > -6 && x < 7) box(x, .065, 6.45, .38, .008, .045, '#eae7d0'); }
for (let i = 0; i < 6; i++) box(-5.1 + i * .28, .067, 6.35, .16, .014, 2.4, '#f1ecd9');
for (let x of [-6, -3.05, 2.6, 6.4]) { cylinder(x, .29, 4.93, .075, .55, '#939c7f'); ball(x, .58, 4.93, .08, '#d7d6b6'); }
// Planting islands and the continuous winding garden path.
function ribbon(points, width, color, y = .06) {
  const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], 0, p[1])));
  const left = [], right = [];
  for (let i = 0; i <= 90; i++) { const t = i / 90, p = curve.getPoint(t), v = curve.getTangent(t), normal = new T.Vector3(-v.z, 0, v.x).multiplyScalar(width / 2); left.push(p.clone().add(normal)); right.push(p.clone().sub(normal)); }
  const shape = new T.Shape(left.concat(right.reverse()).map(p => new T.Vector2(p.x, -p.z)));
  const m = mesh(new T.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: false, steps: 1, curveSegments: 8 }), color, 0, y, 0);
  m.rotation.x = -Math.PI / 2; return m;
}
ribbon([[-4.8, 4.6], [-4.65, 2.9], [-4.8, .9], [-4.3, -2.5], [-1.8, -3.3], [.5, -2.6], [1.8, -.8], [1.6, 2.1], [2.5, 4.5]], 1.05, '#e1d5b1');
ribbon([[-3.9, 2.7], [-1.5, 3.6], [.1, 3.5], [2.7, 2.6], [5.7, 2.7], [6.6, .6], [6, -2.2], [4.3, -2.8], [1, -2.7]], .88, '#e1d5b1');
ribbon([[0, -3], [.2, -5.2], [2.9, -6.4], [6.5, -5.8]], .74, '#e1d5b1');
function shrub(x, z, r = .38, y = .05) {
  for (let i = 0; i < 3; i++) { const m = ball(x + (i - 1) * r * .48, y + r * .52 + (i === 1 ? r * .22 : 0), z + Math.sin(i * 2.2) * r * .3, r, bushes[i], world, 1.05, .85, .9); shrubObjects.push(m); }
}
for (let i = 0; i < 20; i++) shrub(-7.15 + i * .7, -7.15, .34 + rand() * .18);
for (let i = 0; i < 10; i++) shrub(-7.3 + rand() * .35, -5.8 + i * .9, .34 + rand() * .15);
for (let i = 0; i < 8; i++) shrub(7.15, -5.2 + i * 1.1, .35 + rand() * .1);
for (const [x, z, r] of [[-.7, 1.7, .48], [.1, 1.4, .32], [-5.7, 2.9, .5], [6.45, 3.6, .4], [-.4, -6.3, .6], [-6.4, -2.6, .38], [1.1, -6.8, .38]]) shrub(x, z, r);
function flower(x, z, c, h = .4, p = flowers) {
  beam([x, .04, z], [x, h, z], .013, crop, p);
  const center = ball(x, h, z, .038, '#d7ba6a', p);
  for (let j = 0; j < 5; j++) { const a = j * Math.PI * 2 / 5; ball(x + Math.cos(a) * .067, h, z + Math.sin(a) * .067, .06, c, p, 1, .5, 1); }
  ball(x + .045, h * .5, z, .075, crop, p, 1, .22, .4).rotation.z = -.5;
  center.castShadow = false;
}
for (let i = 0; i < 85; i++) {
  let x, z;
  if (i < 30) { x = -6.7 + rand() * 1.1; z = -2.3 + rand() * 5.4; }
  else if (i < 60) { x = -6.5 + rand() * 12.8; z = -6.9 + rand() * .7; }
  else { x = 5.8 + rand(); z = 3 + rand() * 1.2; }
  flower(x, z, choose(['#ead8a2', '#e5a8a1', '#f4edcf', '#bdc6db']), .2 + rand() * .23);
}
// Back fence: transparent rails keep the diorama's silhouette light.
for (let x = -7.4; x < 7.5; x += .85) { box(x, .52, -7.45, .075, .95, .075, palette.woodLight); ball(x, 1.01, -7.45, .055, palette.woodLight); }
box(0, .38, -7.45, 15, .055, .055, palette.wood); box(0, .76, -7.45, 15, .055, .055, palette.wood);
// Broad, distinct canopy clusters with exposed branching and spring blossoms.
function tree(x, z, height, radius, kind = 'broad') {
  const g = group(x, 0, z);
  beam([0, 0, 0], [.13, height * .7, -.08], .13 + radius * .055, palette.trunk, g);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.399, r = radius * (.55 + rand() * .25), yy = height * .72 + rand() * .65;
    beam([.08, height * .4 + i * .07, 0], [Math.cos(a) * r, yy, Math.sin(a) * r], .052, palette.trunk, g);
    beam([Math.cos(a) * r * .7, yy - .3, Math.sin(a) * r * .7], [Math.cos(a + .7) * r * .9, yy + .25, Math.sin(a + .7) * r * .9], .025, palette.trunk, g);
    const m = ball(Math.cos(a) * r * .7, yy + .3, Math.sin(a) * r * .7, radius * .62, leaves[i % 4], g, 1.12, .84, 1.0);
    m.userData.originalScale = m.scale.clone(); m.userData.kind = kind; canopyObjects.push(m);
    const s = ball(x + Math.cos(a) * r * .7, yy + .69, z + Math.sin(a) * r * .7, radius * .59, '#edf0e8', snow, 1.08, .24, 1);
    if (kind === 'cherry') {
      for (let j = 0; j < 4; j++) {
        const b = ball(x + Math.cos(a) * r * .7 + (rand() - .5) * radius, yy + .3 + rand() * .6, z + Math.sin(a) * r * .7 + (rand() - .5) * radius, radius * .27, choose(['#efbfc4', '#e9b0b7', '#f4d0ca']), blossoms, 1.2, .75, 1);
        b.userData.treeBlossom = true;
      }
    }
    if (kind === 'fruit') { const f = ball(x + Math.cos(a) * r, yy + .1, z + Math.sin(a) * r, .105, '#df9f60'); fruitObjects.push(f); }
    s.castShadow = false;
  }
  for (let i = 0; i < 4; i++) { const a = i * 1.57; beam([0, .15, 0], [Math.cos(a) * .42, .03, Math.sin(a) * .42], .065, palette.trunk, g); }
  return g;
}
tree(-6.45, -5.85, 4.2, 1.05, 'cherry');
tree(6.25, -5.4, 4.2, 1.12, 'fruit');
tree(-6.65, 1.1, 3.8, .93, 'cherry');
tree(6.8, .3, 3.35, .86);
tree(.5, -6.75, 3.2, .88);

// Neighborhood nature house, pitched ceramic roof and a small open porch.
const cottage = group(-3.8, 0, -5.7);
box(0, .11, .25, 3.3, .22, 2.8, '#c7b992', cottage);
box(0, 1.31, 0, 2.9, 2.4, 1.9, '#f1e6c8', cottage);
const roofGeo = new T.BufferGeometry();
roofGeo.setAttribute('position', new T.Float32BufferAttribute([-1.7,0,-1.2,1.7,0,-1.2,0,1.15,-1.2, -1.7,0,1.2,0,1.15,1.2,1.7,0,1.2, -1.7,0,-1.2,0,1.15,-1.2,0,1.15,1.2, -1.7,0,-1.2,0,1.15,1.2,-1.7,0,1.2, 1.7,0,-1.2,1.7,0,1.2,0,1.15,1.2, 1.7,0,-1.2,0,1.15,1.2,0,1.15,-1.2], 3));
roofGeo.computeVertexNormals();
roofGeo.addGroup(0, 6, 0); roofGeo.addGroup(6, 12, 1);
mesh(roofGeo, [mat('#f1e6c8', { side: T.DoubleSide }), mat('#748c76', { side: T.DoubleSide })], 0, 2.49, 0, cottage);
const snowRoof = roofGeo.clone(); snowRoof.clearGroups(); snowRoof.setDrawRange(6, 12);
mesh(snowRoof, mat('#edf0e8', { side: T.DoubleSide }), -3.8, 2.535, -5.7, snow);
for (let z = -1.15; z <= 1.15; z += .23) { beam([-1.7, 2.51, z], [0, 3.66, z], .019, '#607963', cottage); beam([0, 3.66, z], [1.7, 2.51, z], .019, '#607963', cottage); }
beam([0,3.69,-1.25],[0,3.69,1.25],.075,'#5b745d',cottage);
for (const x of [-1.47,1.47]) { box(x,1.32,.95,.09,2.5,.095,palette.wood,cottage); }
const windowMat = mat('#b8cfbf', { emissive: '#ffbf60', emissiveIntensity: 0, roughness: .3 });
for (const x of [-.92, .92]) {
  box(x, 1.62, .962, .68, .85, .05, '#a3936b', cottage); box(x,1.62,1.0,.57,.74,.018,windowMat,cottage);
  box(x,1.62,1.02,.036,.78,.02,'#eee3bd',cottage);box(x,1.62,1.02,.59,.036,.02,'#eee3bd',cottage);
  box(x,1.17,1.07,.76,.095,.21,palette.woodLight,cottage);
}
box(0,.92,.98,.65,1.6,.09,'#8da58b',cottage);box(0,1.16,1.04,.44,.85,.02,windowMat,cottage);ball(.22,.77,1.04,.035,'#e4c482',cottage);
box(0,2.09,1.06,1.28,.28,.07,palette.woodLight,cottage);
function textSign(text, x, y, z, width, height, parent = world, bgcolor = '#d9c494', ink = '#526848') {
  const c = document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle=bgcolor;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=ink;ctx.font='500 50px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65);
  const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
  const m=mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map:tx,roughness:1}),x,y,z,parent);m.castShadow=false;return m;
}
textSign('自然小屋',0,2.09,1.1,1.14,.23,cottage);
box(0,2.13,1.6,3.25,.1,1.03,palette.woodLight,cottage);
for(const x of [-1.38,1.38])beam([x,.21,2.04],[x,2.12,2.04],.045,palette.wood,cottage);
for(let i=0;i<11;i++)box(-1.35+i*.27,.24,1.52,.014,.008,1.25,'#ad956d',cottage);
box(0,.12,2.18,1.13,.13,.38,'#d0ba90',cottage);
for(const x of [-1.06,1.06]) { cylinder(x,.34,1.85,.15,.28,'#b88b67',cottage,.2); ball(x,.67,1.85,.32,bushes[1],cottage,1,.9,1); }
box(.66,3.35,-.64,.35,.8,.33,'#e0d1af',cottage);box(.66,3.78,-.64,.46,.1,.43,'#978977',cottage);
// Barrel makes the roof-to-garden rainwater connection readable.
const barrel=group(-1.86,0,-4.67);cylinder(0,.48,0,.3,.84,'#8b9f87',barrel);for(const y of [.16,.7])torus(0,y,0,.303,.022,'#657c67',barrel).rotation.x=Math.PI/2;
beam([-2.39,2.4,-4.8],[-1.86,2.4,-4.8],.035,'#768777');beam([-1.86,2.4,-4.8],[-1.86,.92,-4.8],.035,'#768777');

// Heart of the model: open tree classroom, arranged so the children remain visible.
const classroom = activity('classroom', -2.15, -.25);
cylinder(0,.14,0,2.2,.25,palette.woodLight,classroom,2.2,64);
for(let i=-10;i<=10;i++) { const x=i*.2,len=2*Math.sqrt(Math.max(0,2.15**2-x*x));if(len)box(x,.269,0,.012,.007,len,'#b19c70',classroom); }
const treeCenter=tree(-2.7,-1.25,5.25,1.35);
// Half-ring seating encircles the tree, leaving an opening toward the street.
for(let i=0;i<11;i++) { const a=Math.PI*.05+i*Math.PI*1.36/10,x=Math.cos(a)*1.63,z=-.35+Math.sin(a)*1.63;const seat=box(x,.55,z,.56,.1,.34,palette.wood,classroom);seat.rotation.y=-a+Math.PI/2;for(const d of [-.15,.15])box(x+Math.cos(a)*d,.39,z+Math.sin(a)*d,.045,.3,.2,palette.trunk,classroom); }
function stool(x,z,parent=world,y=0) {cylinder(x,y+.35,z,.2,.07,palette.woodLight,parent);for(let i=0;i<3;i++){const a=i*2.1;beam([x+Math.cos(a)*.11,y+.32,z+Math.sin(a)*.11],[x+Math.cos(a)*.15,y+.05,z+Math.sin(a)*.15],.032,palette.wood,parent);}}
const table=cylinder(-.35,.72,.92,.6,.08,palette.woodLight,classroom,.6,32);cylinder(-.35,.45,.92,.09,.5,palette.wood,classroom);
for(const [x,z] of [[-.95,1.3],[.34,1.23],[-.23,1.8]])stool(x,z,classroom,.26);
box(-.53,.775,.98,.35,.018,.21,'#f4eed9',classroom).rotation.y=.3;
ball(-.28,.81,.85,.09,leaves[2],classroom,1,.4,.6);cylinder(-.09,.825,1.1,.055,.09,'#a2c3b6',classroom);
const chalk=group(1.36,.27,-.05,classroom);beam([-.39,0,.1],[-.39,1.07,0],.035,palette.wood,chalk);beam([.39,0,.1],[.39,1.07,0],.035,palette.wood,chalk);box(0,.77,0,.92,.66,.07,palette.woodLight,chalk);box(0,.77,.044,.81,.55,.018,'#5f7d61',chalk);textSign('今日：认识一片叶',0,.87,.061,.75,.14,chalk,'#5f7d61','#eef0d9');
beam([-.18,.58,.064],[.17,.72,.064],.01,'#d5e0bd',chalk);ball(0,.66,.065,.09,'#d5e0bd',chalk,1,.55,.05);
// Books, leaf specimens and magnifying glasses in a miniature cabinet.
box(-1.45,.6,-.61,.89,.7,.35,palette.wood,classroom);box(-1.45,.6,-.42,.78,.6,.025,'#785e46',classroom);
for(const yy of [.36,.63,.87]) {box(-1.45,yy,-.35,.88,.04,.47,palette.woodLight,classroom);for(let j=0;j<4;j++)box(-1.74+j*.16,yy+.11,-.36,.06,.2,.18,choose(['#91a47a','#cfb07e','#b89988','#a4b5af']),classroom);}

// Raised kitchen garden with edible crops, small labels and hand tools.
const garden = activity('garden', 3.25, -4.9);
for(let k=0;k<3;k++){
  const x=(k-1)*1.26;box(x,.23,0,1.05,.43,2.26,palette.wood,garden);box(x,.45,0,.88,.035,2.08,palette.soil,garden);
  for(const z of [-.83,0,.83])box(x,.23,z,1.065,.028,2.3/3,'#c9a77b',garden);
  for(let j=0;j<8;j++){
    const xx=x-.25+(j%2)*.5,zz=-.77+Math.floor(j/2)*.51;
    const cg=group(xx,.46,zz,garden);cropObjects.push(cg);
    if(k===0){for(let l=0;l<5;l++){const a=l*1.26;ball(Math.cos(a)*.1,.12,Math.sin(a)*.1,.15,crop,cg,.7,1,.4).rotation.z=Math.cos(a)*.55;}}
    if(k===1){beam([0,0,0],[0,.55,0],.018,crop,cg);for(let l=0;l<3;l++){const a=l*2.1;ball(Math.cos(a)*.11,.25+l*.07,Math.sin(a)*.1,.12,crop,cg,1,.35,1);const f=ball(Math.cos(a)*.12,.29+l*.07,Math.sin(a)*.12,.065,'#d28d60',cg);fruitObjects.push(f);}}
    if(k===2){ball(0,.12,0,.16,crop,cg,1.1,.65,1.1);for(let l=0;l<3;l++)beam([0,.12,0],[(l-1)*.11,.32,0],.015,crop,cg);}
  }
  beam([x,.4,1.0],[x,.87,1.0],.019,palette.wood,garden);box(x,.87,1.015,.37,.19,.028,palette.cream,garden);
  textSign(['生菜','番茄','胡萝卜'][k],x,.87,1.033,.3,.1,garden,'#eee6cb','#6c7756');
  box(x,.475,0,1.06,.04,2.26,'#edf0e6',snow).position.set(garden.position.x+x,.475,garden.position.z);
}
box(0,.21,1.68,3.6,.4,.045,'#c8b68c',garden);
for(const x of [-1.4,1.4])beam([x,.4,1.65],[x,.75,1.65],.026,palette.wood,garden);
box(0,.78,1.65,1.72,.27,.04,palette.woodLight,garden);textSign('小小种植家',0,.78,1.68,1.48,.18,garden);
// A light pergola and trellised vines behind the planting beds.
for(const x of [-1.65,1.65])for(const z of [-1.45,.6])beam([x,0,z],[x,2.05,z],.036,palette.wood,garden);
for(let x=-1.7;x<=1.7;x+=.24)box(x,2.07,-.42,.04,.05,2.5,palette.woodLight,garden);
for(const z of [-1.48,.66])box(0,2.02,z,3.5,.075,.06,palette.wood,garden);
for(let i=0;i<12;i++) {const x=-1.7+rand()*3.4,z=-1.5+rand()*2.1;ball(x,2.11,z,.17,crop,garden,1.5,.35,1);}
// Basket, watering can and trowel.
cylinder(1.87,.21,.87,.22,.26,'#d5b27c',garden,.29);torus(1.87,.5,.87,.23,.018,palette.wood,garden);
beam([1.94,.12,1.2],[2.04,.52,1.2],.019,palette.wood,garden);box(1.91,.1,1.2,.09,.12,.06,'#828c7d',garden);

// Rain garden: an irregular clear pool, lily pads, pebbles, a bridge and reeds.
const water = activity('water', 4.05, 1.25);
const poolShape=new T.Shape();poolShape.moveTo(-1.35,-.9);poolShape.bezierCurveTo(-1.95,-.25,-1.5,1.3,-.3,1.55);poolShape.bezierCurveTo(.6,1.85,1.8,.9,1.6,-.25);poolShape.bezierCurveTo(1.5,-1.4,-.55,-1.7,-1.35,-.9);
const pool=mesh(new T.ExtrudeGeometry(poolShape,{depth:.065,bevelEnabled:true,bevelThickness:.025,bevelSize:.04,bevelSegments:2,curveSegments:30}),pondMat,0,.08,0,water);pool.rotation.x=-Math.PI/2;
const edgePoints=poolShape.getPoints(55);
for(let i=0;i<edgePoints.length;i+=2){const p=edgePoints[i];const rock=ball(p.x,.14,-p.y,.17+rand()*.11,palette.stone,water,1.25,.56,1);rock.rotation.y=rand()*6;}
const ripples=[];
for(const [x,z,r] of [[-.3,-.45,.46],[.66,.28,.29],[-.67,.62,.31]]){const ring=torus(x,.154,z,r,.012,'#c7dfd4',water);ring.rotation.x=-Math.PI/2;ring.castShadow=false;ripples.push(ring);}
const pondPlants=group(0,0,0,water);
for(let i=0;i<7;i++){const x=-.85+rand()*1.7,z=-.9+rand()*1.4;cylinder(x,.154,z,.18,.014,crop,pondPlants,.18,20);if(i%3===0)flower(x,z,'#e9c6bd',.19,pondPlants);}
for(let i=0;i<20;i++){const a=rand()*1.9+.3,x=Math.cos(a)*1.55,z=Math.sin(a)*1.3;const h=.4+rand()*.6;beam([x,.05,z],[x+.08,h,z],.015,reedMat,water);if(i%2===0)ball(x+.08,h,z,.04,'#9c785b',water,.85,2.3,.85);beam([x,.1,z],[x-.15,h*.75,z+.07],.018,reedMat,water);}
const bridge=group(-.84,0,1.02,water);bridge.rotation.y=-.27;
for(let i=0;i<12;i++){const zz=-.8+i*.145,yy=.26+Math.sin(i/11*Math.PI)*.13;box(0,yy,zz,.85,.065,.127,palette.woodLight,bridge);}
for(const x of [-.43,.43]){beam([x,.21,-.85],[x,.21,.9],.04,palette.wood,bridge);for(const z of [-.7,.65])beam([x,.2,z],[x,.77,z],.026,palette.wood,bridge);beam([x,.71,-.73],[x,.71,.69],.023,palette.wood,bridge);}
beam([1.86,.1,-.1],[1.86,.78,-.1],.023,palette.wood,water);box(1.86,.79,-.1,.6,.27,.04,palette.woodLight,water);textSign('雨水花园',1.86,.79,-.071,.55,.16,water);
for(const [x,z]of [[2.4,.3],[1.65,-1.6],[-1.2,-1.7]])shrub(water.position.x+x,water.position.z+z,.33);

// Insect hotel: small bamboo tubes, log piles and an observation desk.
const bugs=activity('bugs',-5.35,-2.12);
box(0,.17,0,1.55,.3,1.4,'#e0d0a9',bugs);
for(const x of [-.43,.43])beam([x,.2,0],[x,1.84,0],.048,palette.wood,bugs);
box(0,1.14,0,1.03,1.3,.43,palette.wood,bugs);box(0,1.14,.23,.88,1.17,.025,'#6f5841',bugs);
for(const y of [.74,1.14,1.55])box(0,y,.25,.96,.04,.42,palette.woodLight,bugs);
for(let j=0;j<30;j++){const x=-.36+(j%6)*.143,y=.63+Math.floor(j/6)*.21;const ring=torus(x,y,.285,.051,.015,choose(['#d2b784','#baa171','#e0c797']),bugs);ring.castShadow=false;}
for(let i=0;i<2;i++){const roof=box((i?1:-1)*.29,1.97,0,.75,.095,.68,'#8c9b76',bugs);roof.rotation.z=(i?1:-1)*-.48;}
box(0,.3,.51,.9,.09,.44,palette.woodLight,bugs);
textSign('昆虫旅馆',0,1.73,.27,.83,.14,bugs);
for(let i=0;i<5;i++){const x=-.56+i*.25,z=-.52;const log=cylinder(x,.29,z,.105,.65,palette.trunk,bugs);log.rotation.x=Math.PI/2;const end=cylinder(x,.29,z+.33,.088,.012,palette.woodLight,bugs);end.rotation.x=Math.PI/2;}
// A timber nature-play area next to the classroom.
for(let i=0;i<7;i++){const a=i*.52;const x=-5.2+Math.sin(a)*1.25,z=2.32+Math.cos(a)*.64,h=.24+(i%3)*.09;cylinder(x,h/2+.05,z,.23,h,palette.trunk);cylinder(x,h+.054,z,.225,.02,palette.woodLight);torus(x,h+.068,z,.14,.01,'#aa8961').rotation.x=-Math.PI/2;}
beam([-4.6,.26,3.63],[-2.92,.26,3.63],.14,palette.trunk);for(const x of [-4.35,-3.12])cylinder(x,.11,3.63,.16,.22,palette.wood);
// Wooden benches along the street edge.
function bench(x,z,rot=0){const g=group(x,0,z);g.rotation.y=rot;for(let i=0;i<3;i++)box(0,.43,-.18+i*.14,1.38,.065,.115,palette.woodLight,g);for(let i=0;i<2;i++)box(0,.73+i*.13,-.28,1.38,.10,.065,palette.wood,g);for(const xx of [-.48,.48]){beam([xx,.06,-.24],[xx,.9,-.24],.027,palette.metal,g);beam([xx,.06,.19],[xx,.43,.19],.027,palette.metal,g);beam([xx,.36,-.24],[xx,.36,.19],.026,palette.metal,g);}}
bench(-.72,4.0);bench(1.05,4.0);
// Handcrafted bicycles, street sign and warm garden lanterns.
const bike=group(-6.25,0,4.33);bike.rotation.y=.3;
for(const x of [-.37,.37]){const wheel=torus(x,.3,0,.27,.027,'#646e62',bike);for(let i=0;i<6;i++){const a=i*Math.PI/3;beam([x,.3,0],[x+Math.cos(a)*.245,.3+Math.sin(a)*.245,0],.007,'#b2b9a4',bike);}}
for(const [a,b]of [[[-.37,.3,0],[-.1,.68,0]],[[-.1,.68,0],[.06,.31,0]],[[.06,.31,0],[-.37,.3,0]],[[.06,.31,0],[.27,.69,0]],[[.27,.69,0],[-.1,.68,0]],[[.27,.69,0],[.37,.3,0]]])beam(a,b,.025,'#bda675',bike);
box(-.11,.72,0,.2,.045,.13,'#7b7156',bike);beam([.27,.67,0],[.29,.88,0],.022,palette.metal,bike);beam([.29,.87,-.12],[.29,.87,.12],.022,palette.metal,bike);box(.39,.73,0,.24,.17,.22,'#d9bb87',bike);
const lanternMaterial=mat('#eddbac',{emissive:'#ffce80',emissiveIntensity:0});
const gardenLights=[];
function lamp(x,z,h=2.4){cylinder(x,h/2,z,.031,h,palette.metal);cylinder(x,.09,z,.13,.16,palette.metal);box(x,h+.04,z,.38,.09,.38,palette.metal);box(x,h-.18,z,.25,.35,.25,lanternMaterial);box(x,h-.38,z,.33,.07,.33,palette.metal);for(const dx of [-.12,.12])for(const dz of [-.12,.12])beam([x+dx,h-.35,z+dz],[x+dx,h,z+dz],.009,palette.metal);const l=new T.PointLight('#ffcf83',0,5,2);l.position.set(x,h-.2,z);scene.add(l);gardenLights.push(l);}
lamp(-6.8,4.43);lamp(6.6,4.43);lamp(.65,-2.85,1.7);
const streetSign=group(5.4,0,4.13);beam([0,0,0],[0,1.4,0],.042,palette.wood,streetSign);box(0,1.34,0,1.42,.4,.075,'#718767',streetSign);textSign('慢行 · 孩子在探索',0,1.34,.046,1.27,.2,streetSign,'#718767','#eee9d3');
// Tiny people: expressive hats, backpacks, poses and seasonal clothing.
function person(x,z,index=0,pose='read',angle=0,y=0,adult=false){
  const g=group(x,y,z);g.rotation.y=angle;if(adult)g.scale.setScalar(1.23);
  const shirt=coatMaterials[index%coatMaterials.length],skin=choose(['#e3b996','#d4ac86','#e9c7a4']),hair=choose(['#645241','#4e4939','#79634c']);
  for(const s of [-1,1]){beam([s*.085,.12,0],[s*.075,.41,0],.047,'#667a7b',g);box(s*.085,.085,.035,.13,.09,.21,'#867960',g);}
  cylinder(0,.55,0,.14,.32,shirt,g,.11,14);ball(0,.81,0,.055,skin,g);
  ball(0,.95,0,.168,skin,g,1,1.06,1,true);ball(0,1.035,-.03,.177,hair,g,1,.69,1,true);
  for(const s of [-1,1]) {ball(s*.17,.94,0,.035,skin,g);ball(s*.061,.963,.152,.011,'#494c37',g,1,1,.55,true);}
  ball(0,.906,.166,.015,'#cb987f',g,1,.4,.5,true);
  let hands;
  if(pose==='read'||pose==='study')hands=[[-.13,.66,.25],[.17,.68,.26]];
  else if(pose==='water')hands=[[-.18,.43,.11],[.28,.49,.27]];
  else if(pose==='point')hands=[[-.21,.46,.025],[.28,.87,.23]];
  else if(pose==='observe')hands=[[-.18,.51,.15],[.14,.99,.19]];
  else hands=[[-.2,.42,.04],[.2,.44,.04]];
  hands.forEach((b,i)=>{const a=[i? .12:-.12,.68,0],v=new T.Vector3(...b).sub(new T.Vector3(...a));const m=beam(a,new T.Vector3(...a).add(v.clone().multiplyScalar(.6)).toArray(),.042,shirt,g);sleeves.push({mesh:m,a:new T.Vector3(...a),v});beam(new T.Vector3(...a).add(v.clone().multiplyScalar(.48)).toArray(),b,.03,skin,g);ball(...b,.039,skin,g,1,1,1,true);});
  if(pose==='read'||pose==='study'){const b=box(0,.646,.28,.31,.025,.21,'#e9e4c9',g);b.rotation.z=.1;box(0,.661,.28,.008,.01,.19,'#c2b999',g);}
  if(pose==='study'||pose==='observe'){torus(.16,pose==='study'?.82:1.01,.29,.085,.012,'#a08a56',g);beam([.16,.75,.29],[.16,.64,.29],.013,palette.wood,g);}
  if(pose==='water'){cylinder(.32,.47,.29,.10,.17,'#7ca6a1',g);beam([.39,.5,.31],[.52,.52,.44],.021,'#7ca6a1',g);torus(.32,.56,.29,.095,.012,'#7ca6a1',g).rotation.x=-Math.PI/2;}
  if(pose==='point'){box(-.13,.51,.17,.16,.22,.02,'#ded7b5',g);}
  if(index%2===0){box(0,.55,-.14,.2,.22,.095,'#ad946d',g);beam([-.1,.64,-.1],[-.12,.5,.06],.014,'#d4b485',g);beam([.1,.64,-.1],[.12,.5,.06],.014,'#d4b485',g);}
  const hat=group(0,1.078,0,g);cylinder(0,.025,0,.218,.028,'#e4cc91',hat);cylinder(0,.07,0,.145,.1,'#ddbe83',hat,.118);cylinder(0,.03,0,.148,.032,'#b5a174',hat);summerHats.push(hat);
  const accessories=group(0,0,0,g);ball(0,1.073,-.028,.18,shirt,accessories,1,.55,1,true);ball(0,1.195,-.03,.049,'#e9e6ce',accessories,1,1,1,true);torus(0,.8,0,.092,.03,'#e8c17b',accessories).rotation.x=Math.PI/2;box(.09,.70,.147,.06,.22,.035,'#e8c17b',accessories);winterAccessories.push(accessories);
  return g;
}
person(-3.18,1.04,0,'read',.6,.27);person(-1.9,1.48,1,'study',-.52,.27);
person(-.83,.64,3,'point',-1.45,.27,true);person(-3.6,-.02,2,'observe',.95,.27);
person(2.23,-3.42,2,'water',2.8);person(4.68,-3.7,0,'point',-2.6);
person(2.54,2.1,1,'observe',.9,.13);person(-5.47,-.83,4,'study',Math.PI);
person(-3.92,2.46,5,'walk',.75,.19);person(.26,3.34,6,'read',-.25);
// Seedlings, stones and fallen leaves add a collectible-model level of detail.
for(let i=0;i<32;i++){const x=-6.7+rand()*13.4,z=-6.5+rand()*10.5;if(Math.hypot(x+2.3,z+.3)<2.7||Math.hypot(x-4,z-1.2)<2.2)continue;const leaf=ball(x,.082,z,.07,choose(['#c79351','#cbb167','#b07a49']),autumnLeaves,1.5,.18,.7);leaf.rotation.y=rand()*6;}
for(let i=0;i<17;i++){const x=-7+rand()*14,z=-6+rand()*10;if(Math.hypot(x+2.3,z+.3)<2.6||Math.hypot(x-4,z-1.2)<2.3)continue;ball(x,.08,z,.1+rand()*.05,'#bdbea5',world,1.2,.65,1);}
// Small birdhouse and a friendly bird resting on its perch.
const birdhouse=group(.14,0,-.22);beam([0,0,0],[0,2.02,0],.04,palette.wood,birdhouse);box(0,2.0,0,.38,.42,.33,'#e0ba83',birdhouse);ball(0,2.04,.18,.072,'#735e44',birdhouse,1,1,.08);for(const s of [-1,1])box(s*.12,2.26,0,.33,.05,.44,'#849975',birdhouse).rotation.z=-s*.55;beam([0,1.89,.15],[0,1.89,.32],.017,palette.wood,birdhouse);
const bird=group(.0,1.99,.29,birdhouse);ball(0,0,0,.07,'#adb7a5',bird,1,.8,1.3);ball(0,.075,.035,.045,'#748b7a',bird);ball(0,.068,.083,.018,'#c9a673',bird,1,.45,1.7);
const butterflies=[];
for(let i=0;i<6;i++){const g=group(-5+rand()*11,1.1+rand(),-4+rand()*7),c=choose(['#e6c77b','#d1a6a4','#e8dac0']);const l=ball(-.065,0,0,.09,c,g,.75,.12,1.25),r=ball(.065,0,0,.09,c,g,.75,.12,1.25);beam([0,0,-.055],[0,0,.07],.01,'#7e805a',g);butterflies.push({g,l,r,base:g.position.clone(),phase:rand()*7});}
// Contact shadows under the base give the miniature weight without a horizon.
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;const shadowCtx=shadowCanvas.getContext('2d');const gradient=shadowCtx.createRadialGradient(128,128,32,128,128,126);gradient.addColorStop(0,'rgba(54,69,38,.28)');gradient.addColorStop(.5,'rgba(54,69,38,.15)');gradient.addColorStop(1,'rgba(54,69,38,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,256,256);
const shadowTexture=new T.CanvasTexture(shadowCanvas);const shadowPlane=new T.Mesh(new T.PlaneGeometry(25,25),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));shadowPlane.rotation.x=-Math.PI/2;shadowPlane.position.y=-1.045;scene.add(shadowPlane);

// Floating seasonal particles remain inside the pedestal footprint.
const particleCount=95,particleData=new Float32Array(particleCount*3),particleSeeds=[];
for(let i=0;i<particleCount;i++){particleData[i*3]=-7+rand()*14;particleData[i*3+1]=.3+rand()*5;particleData[i*3+2]=-7+rand()*11;particleSeeds.push(rand()*7);}
const particleGeo=new T.BufferGeometry();particleGeo.setAttribute('position',new T.BufferAttribute(particleData,3));
const particleCanvas=document.createElement('canvas');particleCanvas.width=32;particleCanvas.height=32;const pctx=particleCanvas.getContext('2d');pctx.fillStyle='#fff';pctx.beginPath();pctx.arc(16,16,10,0,Math.PI*2);pctx.fill();
const particleMat=new T.PointsMaterial({color:'#f1c8cc',size:.06,map:new T.CanvasTexture(particleCanvas),transparent:true,alphaTest:.1,depthWrite:false,opacity:.7});
const particles=new T.Points(particleGeo,particleMat);world.add(particles);

const seasonConfig={
  spring:{name:'春',caption:'春日街角',weather:'万物生长中',title:'春 · 让好奇发芽',story:'樱花轻落，播下一颗种子，\n等待小小的生命破土而出。',symbol:'✿',grass:'#a9bb81',leaves:['#86a36b','#9db77b','#b9cb90','#739760'],bushes:['#91ab6c','#a9bd7a','#70975d'],crop:'#88a968',water:'#8dc4be',reed:'#90a870',flower:'#efdca7',coats:['#d18e79','#e0b967','#809faa','#a4aa78','#a69db4','#d0a271','#7f9990']},
  summer:{name:'夏',caption:'夏日街角',weather:'树荫与蝉鸣',title:'夏 · 和生命做朋友',story:'叶片舒展，番茄慢慢变红，\n在树荫与水边寻找小小邻居。',symbol:'☀',grass:'#8ead72',leaves:['#638958','#79a164','#a3bc7c','#507e53'],bushes:['#739960','#94ad69','#5f8c59'],crop:'#65934f',water:'#72b7b3',reed:'#6b985f',flower:'#e9c974',coats:['#edb193','#f1d291','#a3c6c7','#b9c88e','#cfbdd2','#e7c398','#9cc0a9']},
  autumn:{name:'秋',caption:'秋日街角',weather:'收藏一片落叶',title:'秋 · 收集大地的礼物',story:'叶子染上金黄，果实挂满枝头，\n把季节的颜色装进口袋。',symbol:'❧',grass:'#b9b17d',leaves:['#c19c59','#d4b46c','#d9bc8b','#a38655'],bushes:['#b0a364','#c5b377','#9a975c'],crop:'#a09b62',water:'#99bcb5',reed:'#b9a877',flower:'#cbb078',coats:['#b57e63','#c6a15e','#829a92','#aa9563','#9e8594','#b48e60','#80988d']},
  winter:{name:'冬',caption:'冬日街角',weather:'雪落，万物静候',title:'冬 · 听见安静的生长',story:'围上围巾，寻找雪地里的足迹，\n为小鸟留一份温暖的食物。',symbol:'❄',grass:'#c2c8b0',leaves:['#879989','#a2b2a2','#c1cabc','#718a7d'],bushes:['#9ba997','#b5beaa','#82968a'],crop:'#a1afa0',water:'#c7dde0',reed:'#b3b49b',flower:'#e5e7dc',coats:['#ad7265','#bc9a5e','#6e8898','#8e986f','#938397','#bd9067','#6b8984']}
};
let currentSeason='spring', hour=14, colorTargets=[], nightness=0;
let cameraMove=null;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function setSeason(name, instant=false){
  currentSeason=name;const config=seasonConfig[name];document.body.dataset.season=name;
  for(const b of document.querySelectorAll('button[data-season]'))b.setAttribute('aria-pressed',String(b.dataset.season===name));
  $('#scene-caption').textContent=config.caption;$('#scene-weather').textContent=config.weather;$('#season-symbol').textContent=config.symbol;$('#season-title').textContent=config.title;$('#season-description').innerText=config.story;
  const targets={grass:config.grass,crop:config.crop,water:config.water,reed:config.reed,flower:config.flower};
  config.leaves.forEach((c,i)=>targets['leaves'+i]=c);config.bushes.forEach((c,i)=>targets['bush'+i]=c);config.coats.forEach((c,i)=>targets['coat'+i]=c);
  colorTargets=Object.entries(targets).map(([key,color])=>({material:seasonalMaterials[key],color:new T.Color(color)}));
  if(instant||reducedMotion)for(const {material,color}of colorTargets)material.color.copy(color);
  blossoms.visible=name==='spring';snow.visible=name==='winter';flowers.visible=name==='spring'||name==='summer';autumnLeaves.visible=name==='autumn';
  winterAccessories.forEach(g=>g.visible=name==='winter');summerHats.forEach(g=>g.visible=name==='summer');fruitObjects.forEach(g=>g.visible=name==='summer'||name==='autumn');
  for(const m of canopyObjects){let scale=name==='winter'?.28:name==='summer'?1.10:name==='spring'? .94:1; m.scale.copy(m.userData.originalScale).multiplyScalar(scale);}
  cropObjects.forEach(g=>g.scale.setScalar(name==='winter'?.2:name==='spring'?.72:1));
  sleeves.forEach(({mesh:m,a,v})=>{const f=name==='summer'?.42:1;m.scale.y=f/.6;m.position.copy(a).add(v.clone().multiplyScalar(f/2));});
  pondPlants.visible=name!=='winter';
  pondMat.roughness=name==='winter'?.65:.27;
  butterflies.forEach(b=>b.g.visible=name==='spring'||name==='summer');
  particleMat.color.set(name==='winter'?'#f5f7f2':name==='autumn'?'#d3ae73':'#f1c8cc');particleMat.size=name==='winter'?.058:name==='autumn'?.075:.05;
  updateTime(hour);
}
function updateTime(value){
  hour=Number(value);const hh=Math.floor(hour),mm=Math.round((hour-hh)*60);const formatted=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  $('#time-output').textContent=formatted;$('#time').setAttribute('aria-valuetext',formatted);
  const daylightHours={spring:12.4,summer:14.5,autumn:11,winter:9.3}[currentSeason];
  const sunrise=12-daylightHours/2,sunset=12+daylightHours/2;
  const theta=(hour-sunrise)/daylightHours*Math.PI;
  const daylight=hour>sunrise&&hour<sunset?Math.max(0,Math.sin(theta)):0;
  nightness=1-T.MathUtils.smoothstep(daylight,0,.45);
  const dusk=daylight>0?Math.pow(1-daylight,3):0;
  ambient.intensity= .5+daylight*.87;ambient.color.set('#fff4dc').lerp(new T.Color('#adc3e3'),nightness);ambient.groundColor.set('#9caa7b').lerp(new T.Color('#536f89'),nightness);
  sun.intensity=T.MathUtils.lerp(.55+daylight*2.25,.42,nightness);
  const seasonalSun={spring:'#fff0d2',summer:'#fff3d9',autumn:'#ffe1b8',winter:'#e9eff6'}[currentSeason];
  const sunHeight={spring:19,summer:23,autumn:16,winter:12}[currentSeason];
  sun.color.set(seasonalSun).lerp(new T.Color('#ffcba0'),dusk).lerp(new T.Color('#a5bbe6'),nightness);
  sun.position.set(-Math.cos(theta)*14,T.MathUtils.lerp(4+daylight*sunHeight,12,nightness),7+Math.sin(theta)*4);
  fill.intensity=.2+daylight*.25;fill.color.set('#dce7dd').lerp(new T.Color('#809ac7'),nightness);
  gardenLights.forEach(l=>l.intensity=nightness*8);windowMat.emissiveIntensity=nightness*.8;lanternMaterial.emissiveIntensity=nightness*2.3;
  renderer.toneMappingExposure=1.06+daylight*.03;
  const bg=new T.Color('#eff0e7').lerp(new T.Color('#718291'),nightness*.68);viewport.style.background=`radial-gradient(ellipse at 52% 56%,${bg.getStyle()} 0%,transparent 73%)`;
  const label=hour<sunrise-1||hour>=21?'静谧夜晚':hour<sunrise+1.7?'晨光初醒':hour<12?'上午探索':hour<sunset-1.3?'午后时光':hour<sunset+.5?'日落时分':'灯火初上';
  $('#time-label').textContent=label;$('#time-icon use').setAttribute('href',nightness>.55?'#i-moon':'#i-sun');
  $('#time-note').textContent=nightness>.55?'灯光亮起，小街区在月色里轻轻入睡。':hour<8?'第一缕晨光，叫醒枝头和小小种植园。':hour>=17?'影子慢慢变长，带着今天的发现回家。':currentSeason==='winter'?'穿暖一点，和伙伴一起寻找雪地足迹。':'阳光暖暖的，去树荫下听一堂自然课。';
  particles.visible=currentSeason!=='summer'||nightness>.6;
  if(currentSeason==='summer'){particleMat.color.set('#e5e7a0');particleMat.size=.045;}
}
document.querySelectorAll('button[data-season]').forEach(b=>b.addEventListener('click',()=>setSeason(b.dataset.season)));
$('#time').addEventListener('input',e=>updateTime(e.target.value));
$('#rotate').addEventListener('click',()=>{controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',String(controls.autoRotate));cameraMove=null;});
function resetView(){controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');cameraMove={target:home.target.clone(),position:home.position.clone(),zoom:home.zoom};}
$('#reset').addEventListener('click',resetView);
$('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.experience').requestFullscreen();}catch{ $('#fullscreen').title='浏览器暂不支持全屏'; }});
const activityInfo={
  classroom:{title:'树下课堂',detail:'一棵大树，就是一间没有墙的教室。孩子们围坐在木质平台上，用放大镜观察叶脉，比较不同的叶形，再把自己的发现分享给伙伴。',tips:{spring:'春日任务：找到一片刚展开的新叶，看看叶脉的走向。',summer:'夏日任务：比较树荫与阳光下的温度，听听树上的声音。',autumn:'秋日任务：收集三种颜色的落叶，做一张季节标本卡。',winter:'冬日任务：观察没有叶子的树，寻找枝头的冬芽。'}},
  garden:{title:'小小种植家',detail:'从一颗种子到一份食物，孩子们参与播种、浇水和收获。抬高的种植床让小朋友轻松照料植物，雨水桶把屋顶收集的雨水送回花园。',tips:{spring:'春日任务：播下一粒种子，画出它每天的变化。',summer:'夏日任务：观察番茄由绿变红，给植物适量浇水。',autumn:'秋日任务：收获成熟的蔬菜，把种子留给下一年。',winter:'冬日任务：给种植床覆盖保温，观察土壤里的小生命。'}},
  water:{title:'雨水的旅行',detail:'街道雨水经过植物与土壤的过滤，汇入这片浅浅的雨水花园。孩子们站在小桥旁，观察水生植物，认识雨水从屋顶回到大地的旅程。',tips:{spring:'春日任务：找一找雨后出现的水滴，画出雨水的路线。',summer:'夏日任务：观察荷叶如何接住水滴，寻找水边的蜻蜓。',autumn:'秋日任务：看看水边植物的种子怎样随风传播。',winter:'冬日任务：在岸边观察薄冰，记录水的不同状态。'}},
  bugs:{title:'昆虫观察站',detail:'竹管、树枝和小木块组成了昆虫旅馆，为独居蜂等小昆虫提供栖息空间。孩子们用放大镜记录这些邻居的习性，学习保持距离、温柔观察。',tips:{spring:'春日任务：安静等待花边的小访客，记录它的颜色。',summer:'夏日任务：观察昆虫访问哪些花，画一张传粉地图。',autumn:'秋日任务：检查昆虫屋是否干燥，为小邻居准备越冬空间。',winter:'冬日任务：保持旅馆安静，寻找附近鸟儿留下的足迹。'}}
};
const dialog=$('#activity-dialog');
function showActivity(id){const info=activityInfo[id];$('#activity-title').textContent=info.title;$('#activity-detail').textContent=info.detail;$('#activity-tip').textContent=info.tips[currentSeason];dialog.showModal();}
document.querySelectorAll('[data-activity]').forEach(b=>b.addEventListener('click',()=>showActivity(b.dataset.activity)));
$('#close-dialog').addEventListener('click',()=>dialog.close());$('#back-to-scene').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
// The same places can also be explored directly on the 3D model.
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),tag=$('#location-tag');let pointerStart=null;
function pick(e){const r=viewport.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(Object.values(activities),true);if(!hits.length)return null;let obj=hits[0].object;while(obj&&!obj.userData.activity)obj=obj.parent;return obj?.userData.activity;}
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,button:e.button};cameraMove=null;});
renderer.domElement.addEventListener('pointerup',e=>{if(pointerStart?.button===0&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)<5){const id=pick(e);if(id)showActivity(id);}pointerStart=null;});
renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons){tag.hidden=true;return;}const id=pick(e);tag.hidden=!id;if(id){tag.textContent=activityInfo[id].title+' · 点击探索';const r=viewport.getBoundingClientRect();tag.style.left=Math.min(e.clientX-r.left+12,r.width-155)+'px';tag.style.top=Math.max(8,e.clientY-r.top-34)+'px';}});
renderer.domElement.addEventListener('pointerleave',()=>tag.hidden=true);
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;const view=Math.max(12.4,11.7/aspect);camera.left=-view*aspect;camera.right=view*aspect;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
new ResizeObserver(resize).observe(viewport);resize();setSeason('spring',true);
let lastTime=0;
function animate(ms){
  const t=ms*.001,dt=Math.min((ms-lastTime)*.001,.05);lastTime=ms;
  if(cameraMove){const f=1-Math.exp(-dt*5);controls.target.lerp(cameraMove.target,f);camera.position.lerp(cameraMove.position,f);camera.zoom=T.MathUtils.lerp(camera.zoom,cameraMove.zoom,f);camera.updateProjectionMatrix();if(camera.position.distanceTo(cameraMove.position)<.015&&controls.target.distanceTo(cameraMove.target)<.015)cameraMove=null;}
  for(const {material,color}of colorTargets)material.color.lerp(color,1-Math.exp(-dt*6));
  if(!reducedMotion){
    butterflies.forEach(({g,l,r,base,phase})=>{if(!g.visible)return;g.position.set(base.x+Math.sin(t*.4+phase)*.25,base.y+Math.sin(t*.8+phase)*.16,base.z+Math.cos(t*.4+phase)*.23);l.rotation.z=Math.sin(t*8+phase)*.75;r.rotation.z=-l.rotation.z;g.rotation.y=t*.2+phase;});
    for(let i=0;i<particleCount;i++){const speed=currentSeason==='winter'?.34:currentSeason==='summer'?-.07:.13;particleData[i*3+1]-=dt*speed;if(particleData[i*3+1]<.08)particleData[i*3+1]=4.7;if(particleData[i*3+1]>5)particleData[i*3+1]=.2;particleData[i*3]+=Math.sin(t*.4+particleSeeds[i])*dt*.03;}particleGeo.attributes.position.needsUpdate=true;
    ripples.forEach((r,i)=>{const sc=1+Math.sin(t*.65+i)*.055;r.scale.set(sc,sc,sc);});
  }
  controls.update();renderer.render(scene,camera);
}
renderer.setAnimationLoop(animate);
requestAnimationFrame(()=>{ $('#loading').classList.add('done');setTimeout(()=>$('#loading').hidden=true,500); });
// Read-only scene diagnostics for verifying the local experience.
window.forestLane={get state(){return{season:currentSeason,hour,nightness,canopies:canopyObjects.length,children:9,educators:1,activities:Object.keys(activities),snow:snow.visible,blossoms:blossoms.visible,coats:coatMaterials.map(m=>m.color.getHexString()),lamps:gardenLights.map(l=>l.intensity),sunPosition:sun.position.toArray(),camera:camera.position.toArray(),zoom:camera.zoom,meshes:renderer.info.render.calls};}};
