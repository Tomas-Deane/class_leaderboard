import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

const usernames = [
  "tomas755865934756806",
  "SSkullee",
  "DaraHeaphy",
  "LelouchYagami0",
  "EliteGrandmasterTom",
  "naem_haqofficial",
  "hazDaG",
  "NikScorch",
  "ushen"
];

// Fetch stats (rating + total games) for one user/mode
async function fetchStats(username, modeKey) {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/stats`);
  if (!res.ok) throw new Error(`No stats for ${username}`);
  const stats = await res.json();
  const entry = stats[`chess_${modeKey}`];
  const rating = entry?.last?.rating ?? 0;
  const record = entry?.record;
  const games = record
    ? (record.win || 0) + (record.loss || 0) + (record.draw || 0)
    : 0;
  return { username, rating, games };
}

// Build and sort leaderboard for a single mode
async function buildBoard(modeKey, containerSelector) {
  const fetches = usernames.map(u => fetchStats(u, modeKey));
  const results = await Promise.all(fetches);
  results.sort((a, b) => b.rating - a.rating);

  const ol = document.querySelector(containerSelector);
  ol.innerHTML = results.map(
    p => `<li>
            <span>${p.username}</span>
            <span>${p.rating} (${p.games} games)</span>
          </li>`
  ).join("");
}

async function init() {
  await Promise.all([
    buildBoard("rapid", "#rapid-board ol"),
    buildBoard("blitz", "#blitz-board ol"),
    buildBoard("bullet", "#bullet-board ol")
  ]);
  initThree();
}

// Simpler wireframe background (lower segment counts)
function initThree() {
  const canvas = document.getElementById("bg");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.z = 4;

  renderer.setSize(innerWidth, innerHeight);
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // Simpler torus knot geometry
  const geo = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00fffc, wireframe: true });
  const knot = new THREE.Mesh(geo, mat);
  scene.add(knot);

  (function animate() {
    requestAnimationFrame(animate);
    knot.rotation.x += 0.008;
    knot.rotation.y += 0.005;
    renderer.render(scene, camera);
  })();
}

window.addEventListener("DOMContentLoaded", init);
