import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

const usernames = [
  "tomasdeane", "SSkullee", "DaraHeaphy", "LelouchYagami0",
  "EliteGrandmasterTom", "naem_haqofficial", "hazDaG", "NikScorch", "ushen"
];

// Fetch rating + games for a given mode
async function fetchStats(username, mode) {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/stats`);
  const data = await res.json();
  const e = data[`chess_${mode}`] || {};
  const last = e.last || {};
  const rec = e.record || {};
  const rating = last.rating || 0;
  const games = (rec.win||0)+(rec.loss||0)+(rec.draw||0);
  return { username, rating, games };
}

// Build table rows
async function updateBoard(mode) {
  const stats = await Promise.all(usernames.map(u => fetchStats(u, mode)));
  stats.sort((a,b) => b.rating - a.rating);

  const tbody = document.getElementById('board-body');
  tbody.innerHTML = stats.map((p,i) =>
    `<tr>
      <td>${i+1}</td>
      <td>${p.username}</td>
      <td>${p.rating}</td>
      <td>${p.games}</td>
    </tr>`
  ).join('');
}

// Initialize controls
function initControls() {
  const buttons = document.querySelectorAll('#controls button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      updateBoard(btn.dataset.mode);
    });
  });
  // load default
  updateBoard('rapid');
}

// Three.js mesh
function initThree() {
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 4;

  renderer.setSize(window.innerWidth/2, window.innerHeight);
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth/2, window.innerHeight);
    camera.aspect = (window.innerWidth/2)/window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Replace with Icosahedron geometry and thicker wireframe
  const geo = new THREE.IcosahedronGeometry(1.2, 0);
  const mat = new THREE.MeshBasicMaterial({ color:0x00fffc, wireframe:true, wireframeLinewidth:2 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  (function animate(){
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.006;
    mesh.rotation.y += 0.004;
    renderer.render(scene, camera);
  })();
}

// Entry point
window.addEventListener('DOMContentLoaded', () => {
  initControls();
  initThree();
});