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

// Fetch stats + avatar for one user
async function fetchPlayer(username) {
  const statsRes = await fetch(`https://api.chess.com/pub/player/${username}/stats`);
  if (!statsRes.ok) throw new Error(`No stats for ${username}`);
  const stats = await statsRes.json();

  let avatar = null;
  try {
    const profileRes = await fetch(`https://api.chess.com/pub/player/${username}`);
    const profile = await profileRes.json();
    avatar = profile.avatar || null;
  } catch { /* ignore */ }

  return {
    username,
    avatar,
    rapid: stats.chess_rapid?.last?.rating ?? "N/A",
    blitz: stats.chess_blitz?.last?.rating ?? "N/A",
    bullet: stats.chess_bullet?.last?.rating ?? "N/A"
  };
}

// Build a card DOM element
function makeCard({ username, avatar, rapid, blitz, bullet }) {
  const div = document.createElement("div");
  div.className = "card";

  const img = document.createElement("img");
  img.src = avatar || "https://via.placeholder.com/96?text=No+Avatar";
  img.alt = username;
  div.appendChild(img);

  const h2 = document.createElement("h2");
  h2.textContent = username;
  div.appendChild(h2);

  ["Rapid", "Blitz", "Bullet"].forEach(mode => {
    const p = document.createElement("p");
    p.textContent = `${mode}: ${ { Rapid: rapid, Blitz: blitz, Bullet: bullet }[mode] }`;
    div.appendChild(p);
  });

  return div;
}

// Initialize leaderboard and 3D background
async function init() {
  const board = document.getElementById("leaderboard");
  for (let u of usernames) {
    try {
      const player = await fetchPlayer(u);
      board.appendChild(makeCard(player));
    } catch (e) {
      console.warn(e);
    }
  }
  initThree();
}

// Three.js spinning wireframe knot
function initThree() {
  const canvas = document.getElementById("bg");
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  camera.position.z = 5;

  renderer.setSize(innerWidth, innerHeight);
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const geo = new THREE.TorusKnotGeometry(1, 0.3, 200, 32);
  const mat = new THREE.MeshBasicMaterial({ color: 0x00fffc, wireframe: true });
  const knot = new THREE.Mesh(geo, mat);
  scene.add(knot);

  function animate() {
    requestAnimationFrame(animate);
    knot.rotation.x += 0.01;
    knot.rotation.y += 0.007;
    renderer.render(scene, camera);
  }
  animate();
}

window.addEventListener("DOMContentLoaded", init);
