import { useEffect, useRef } from 'react';
import * as THREE from 'three';

function currentTheme() {
  return (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'dark';
}

function fogColorFor(theme) {
  return theme === 'light' ? 0xf6f8ff : 0x07070d;
}

export default function Scene3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (_) {
      return;
    }

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(fogColorFor(currentTheme()), 0.0018);

    const observer = new MutationObserver(() => {
      scene.fog.color.setHex(fogColorFor(currentTheme()));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 15;

    const mouse = { x: 0, y: 0 };

    const count = 2800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const colorA = new THREE.Color(0x2dd4bf);
    const colorB = new THREE.Color(0xfbbf24);
    const colorC = new THREE.Color(0x14b8a6);

    for (let i = 0; i < count; i++) {
      const radius = 6 + Math.random() * 11;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.7;
      positions[i * 3 + 2] = radius * Math.cos(phi) * 0.5;

      const c = new THREE.Color().lerpColors(colorA, colorB, Math.random()).lerp(colorC, Math.random() * 0.18);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.09,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const nucleusGeo = new THREE.IcosahedronGeometry(1.1, 3);
    const nucleusMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, emissive: 0x0d9488, emissiveIntensity: 0.55, transparent: true, opacity: 0.92 });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    nucleus.position.z = -3;
    scene.add(nucleus);

    const orbitGroup = new THREE.Group();
    orbitGroup.position.z = -3;
    scene.add(orbitGroup);

    const orbitRings = [
      { r: 3.4, color: 0x2dd4bf, speed: 1.1, tilt: 0.4 },
      { r: 4.6, color: 0xfbbf24, speed: -0.75, tilt: 1.2 },
      { r: 5.8, color: 0x5eead4, speed: 0.6, tilt: 2.1 }
    ];

    const electrons = [];
    orbitRings.forEach((ring, idx) => {
      const ringGeo = new THREE.TorusGeometry(ring.r, 0.012, 8, 140);
      const ringMat = new THREE.MeshBasicMaterial({ color: ring.color, transparent: true, opacity: 0.35 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = ring.tilt;
      ringMesh.rotation.y = idx * 0.6;
      orbitGroup.add(ringMesh);

      const electronGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const electronMat = new THREE.MeshStandardMaterial({ color: ring.color, emissive: ring.color, emissiveIntensity: 0.9 });
      const electron = new THREE.Mesh(electronGeo, electronMat);
      const angle = (idx * Math.PI * 2) / 3;
      electron.position.set(ring.r * Math.cos(angle), 0, ring.r * Math.sin(angle));
      orbitGroup.add(electron);
      electrons.push({ mesh: electron, ring, angle });
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const point = new THREE.PointLight(0x2dd4bf, 30, 60);
    point.position.set(6, 6, 8);
    scene.add(point);

    const onMouseMove = (e) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      points.rotation.y = t * 0.05;
      points.rotation.x = Math.sin(t * 0.1) * 0.14;
      nucleus.rotation.y = t * 0.2;
      nucleus.rotation.x = t * 0.15;
      nucleus.scale.setScalar(1 + Math.sin(t * 1.5) * 0.06);
      orbitGroup.rotation.y = t * 0.1;
      orbitGroup.rotation.x = Math.sin(t * 0.12) * 0.15;
      electrons.forEach((e) => {
        e.angle += e.ring.speed * 0.012;
        e.mesh.position.set(
          e.ring.r * Math.cos(e.angle),
          Math.sin(t * 2 + e.ring.tilt) * 0.3,
          e.ring.r * Math.sin(e.angle)
        );
      });
      camera.position.x += (mouse.x * 2 - camera.position.x) * 0.03;
      camera.position.y += (-mouse.y * 1.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, -3);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      mat.dispose();
      nucleusGeo.dispose();
      nucleusMat.dispose();
      orbitRings.forEach((ring) => {
        const g = ring.geo || ring;
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
