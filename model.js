import * as THREE from './vendor/three.module.js';
const params = {
  "length": 180,
  "width": 54,
  "height": 18,
  "puffiness": 0.65,
  "wrinkles": 0.5,
  "crimpLength": 16,
  "transLength": 18,
  "toothDepth": 2.5,
  "toothCount": 22,
  "crimpDepth": 1.2,
  "crimpFreq": 3,
  "flareAngle": 0.08,
  "finHeight": 6.5,
  "finFold": 0.85,
  "materialPreset": "foil",
  "roughness": 0.28,
  "metalness": 0.18,
  "clearcoat": 0.45,
  "clearcoatRoughness": 0.15,
  "opacity": 1,
  "showInnerBar": false,
  "xrayMode": false,
  "studioPreset": "softbox",
  "shadowOpacity": 0.35,
  "isPlaying": true,
  "animMode": "turntable",
  "animSpeed": 1.3,
  "wireframe": false
};
export async function createPackaging() {
 const loader = new THREE.TextureLoader();
 const [frontTex, backTex] = await Promise.all([loader.loadAsync('./assets/texture_front.png'),loader.loadAsync('./assets/texture_back.png')]);
 let packagingGroup, packagingMesh;
        function createGeometry() {
            packagingGroup = new THREE.Group();


            const L = params.length || 180;
            const W = params.width || 54;
            const H = params.height || 18;
            const crimpLength = params.crimpLength || 16;
            const transLength = params.transLength || 18;
            const toothDepth = params.toothDepth || 2.5;
            const toothCount = params.toothCount || 22;
            const crimpDepth = params.crimpDepth || 0.6;
            const crimpFreq = params.crimpFreq || 3.0;
            const puffiness = params.puffiness !== undefined ? params.puffiness : 0.65;
            const flareAngle = params.flareAngle || 0.08;

            const Nx = 96, Ny = 36;
            const positions = [], uvs = [], indices = [];
            const crimpStart = (L / 2) - crimpLength;
            const bodyEnd = Math.max(0, crimpStart - transLength);

            function getProfile(eta) {
                const pPow = 2.4 + (1.0 - puffiness) * 1.8;
                return Math.pow(Math.max(0, 1.0 - Math.pow(Math.min(1.0, Math.abs(eta)), pPow)), 0.5);
            }
            function getSawTooth(y) {
                const period = W / toothCount;
                const norm = (y / period) - Math.floor(y / period);
                return (Math.abs(norm - 0.5) * 2.0 - 0.5) * toothDepth;
            }
            function getCrimp(x) { return Math.sin(x * crimpFreq) * crimpDepth; }

            const foilThick = 0.4;

            // Cara Superior (Frontal)
            const topStart = 0;
            for (let ix = 0; ix <= Nx; ix++) {
                const u = ix / Nx;
                const baseX = -(L / 2) + u * L;
                for (let iy = 0; iy <= Ny; iy++) {
                    const v = iy / Ny;
                    const baseY = -(W / 2) + v * W;
                    let x = baseX;
                    const absBaseX = Math.abs(baseX);
                    if (absBaseX >= crimpStart) {
                        const factor = (absBaseX - crimpStart) / crimpLength;
                        x += (baseX < 0 ? 1 : -1) * getSawTooth(baseY) * factor;
                    }
                    const y = baseY;
                    const eta = y / (W / 2);
                    const prof = getProfile(eta);
                    const absX = Math.abs(x);
                    let hVal = foilThick, crimpVal = 0, flareVal = 0;
                    if (absX >= crimpStart) {
                        hVal = foilThick;
                        crimpVal = getCrimp(x);
                        flareVal = Math.pow(absX - crimpStart, 2) * (x > 0 ? flareAngle : -flareAngle) * 0.01;
                    } else if (absX > bodyEnd) {
                        let t = (crimpStart - absX) / transLength;
                        t = t * t * (3.0 - 2.0 * t);
                        hVal = foilThick + (H * prof - foilThick) * t;
                        crimpVal = getCrimp(x) * (1.0 - t);
                    } else {
                        const waist = 1.0 - 0.03 * Math.pow(x / (bodyEnd || 1), 2);
                        hVal = foilThick + (H * prof * waist - foilThick);
                    }
                    positions.push(x, y, (hVal / 2) + crimpVal + flareVal);
                    uvs.push(u, v);
                }
            }

            // Cara Inferior (Trasera)
            const stride = Ny + 1;
            const botStart = positions.length / 3;
            for (let ix = 0; ix <= Nx; ix++) {
                const u = ix / Nx;
                const baseX = -(L / 2) + u * L;
                for (let iy = 0; iy <= Ny; iy++) {
                    const v = iy / Ny;
                    const baseY = -(W / 2) + v * W;
                    let x = baseX;
                    const absBaseX = Math.abs(baseX);
                    if (absBaseX >= crimpStart) {
                        const factor = (absBaseX - crimpStart) / crimpLength;
                        x += (baseX < 0 ? 1 : -1) * getSawTooth(baseY) * factor;
                    }
                    const y = baseY;
                    const eta = y / (W / 2);
                    const prof = getProfile(eta);
                    const absX = Math.abs(x);
                    let hVal = foilThick, crimpVal = 0, flareVal = 0;
                    if (absX >= crimpStart) {
                        hVal = foilThick;
                        crimpVal = getCrimp(x);
                        flareVal = Math.pow(absX - crimpStart, 2) * (x > 0 ? flareAngle : -flareAngle) * 0.01;
                    } else if (absX > bodyEnd) {
                        let t = (crimpStart - absX) / transLength;
                        t = t * t * (3.0 - 2.0 * t);
                        hVal = foilThick + (H * prof - foilThick) * t;
                        crimpVal = getCrimp(x) * (1.0 - t);
                    } else {
                        const waist = 1.0 - 0.03 * Math.pow(x / (bodyEnd || 1), 2);
                        hVal = foilThick + (H * prof * waist - foilThick);
                    }
                    positions.push(x, y, -(hVal / 2) + crimpVal + flareVal);
                    uvs.push(1.0 - u, v);
                }
            }

            // Triángulos Superior (CCW)
            for (let ix = 0; ix < Nx; ix++) {
                for (let iy = 0; iy < Ny; iy++) {
                    const p0 = topStart + ix * stride + iy;
                    const p1 = p0 + 1;
                    const p2 = p0 + stride;
                    const p3 = p2 + 1;
                    indices.push(p0, p2, p3);
                    indices.push(p0, p3, p1);
                }
            }

            // Triángulos Inferior (CW)
            for (let ix = 0; ix < Nx; ix++) {
                for (let iy = 0; iy < Ny; iy++) {
                    const p0 = botStart + ix * stride + iy;
                    const p1 = p0 + 1;
                    const p2 = p0 + stride;
                    const p3 = p2 + 1;
                    indices.push(p0, p1, p3);
                    indices.push(p0, p3, p2);
                }
            }

            // Cierres Herméticos Perimetrales (0 Bordes Abiertos)
            for (let ix = 0; ix < Nx; ix++) {
                const t0 = topStart + ix * stride, t1 = topStart + (ix + 1) * stride;
                const b0 = botStart + ix * stride, b1 = botStart + (ix + 1) * stride;
                indices.push(t0, b0, t1);
                indices.push(t1, b0, b1);

                const tn0 = t0 + Ny, tn1 = t1 + Ny;
                const bn0 = b0 + Ny, bn1 = b1 + Ny;
                indices.push(tn0, tn1, bn0);
                indices.push(tn1, bn1, bn0);
            }
            for (let iy = 0; iy < Ny; iy++) {
                const tl0 = topStart + iy, tl1 = topStart + iy + 1;
                const bl0 = botStart + iy, bl1 = botStart + iy + 1;
                indices.push(tl0, tl1, bl0);
                indices.push(tl1, bl1, bl0);

                const tr0 = topStart + Nx * stride + iy, tr1 = tr0 + 1;
                const br0 = botStart + Nx * stride + iy, br1 = br0 + 1;
                indices.push(tr0, br0, tr1);
                indices.push(tr1, br0, br1);
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(indices);
            geo.computeVertexNormals();


            frontTex.colorSpace = THREE.SRGBColorSpace;
            backTex.colorSpace = THREE.SRGBColorSpace;

            const matFront = new THREE.MeshPhysicalMaterial({
                map: frontTex,
                roughness: params.roughness || 0.28,
                metalness: params.metalness || 0.18,
                clearcoat: params.clearcoat || 0.55
            });

            const matBack = new THREE.MeshPhysicalMaterial({
                map: backTex,
                roughness: (params.roughness || 0.28) + 0.05,
                metalness: (params.metalness || 0.18) * 0.8,
                clearcoat: (params.clearcoat || 0.55) * 0.6
            });

            geo.clearGroups();
            const countTri = Nx * Ny * 2;
            geo.addGroup(0, countTri * 3, 0);
            geo.addGroup(countTri * 3, countTri * 3, 1);
            geo.addGroup(countTri * 6, (Nx * 2 + Ny * 2) * 6, 0);

            packagingMesh = new THREE.Mesh(geo, [matFront, matBack]);
            packagingMesh.castShadow = true;
            packagingGroup.add(packagingMesh);
            return packagingGroup;
        }


return createGeometry();
}
