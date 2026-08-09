import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Atom3D({ className = '' }) {
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

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 300, mount.clientHeight || 300);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 11;

    const disposables = [];

    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.3, 2),
      new THREE.MeshStandardMaterial({ color: 0x14b8a6, emissive: 0x0d9488, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4 })
    );
    disposables.push(nucleus.geometry, nucleus.material);
    scene.add(nucleus);

    const group = new THREE.Group();
    scene.add(group);

    const rings = [
      { r: 3.1, color: 0x2dd4bf, tilt: 0.5, speed: 0.9 },
      { r: 3.9, color: 0xfbbf24, tilt: 1.3, speed: -0.6 },
      { r: 4.7, color: 0x5eead4, tilt: 2.2, speed: 0.45 }
    ];
    const electrons = [];
    rings.forEach((ring, i) => {
      const ringGeo = new THREE.TorusGeometry(ring.r, 0.02, 8, 120);
      const ringMat = new THREE.MeshBasicMaterial({ color: ring.color, transparent: true, opacity: 0.4 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = ring.tilt;
      ringMesh.rotation.y = i * 0.5;
      disposables.push(ringGeo, ringMat);
      group.add(ringMesh);

      const eGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const eMat = new THREE.MeshStandardMaterial({ color: ring.color, emissive: ring.color, emissiveIntensity: 1 });
      const e = new THREE.Mesh(eGeo, eMat);
      const angle = (i * Math.PI * 2) / 3;
      e.position.set(ring.r * Math.cos(angle), 0, ring.r * Math.sin(angle));
      disposables.push(eGeo, eMat);
      group.add(e);
      electrons.push({ mesh: e, ring, angle });
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const light = new THREE.PointLight(0x2dd4bf, 40, 50);
    light.position.set(4, 5, 6);
    scene.add(light);

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      nucleus.rotation.y = t * 0.3;
      nucleus.rotation.x = t * 0.2;
      nucleus.scale.setScalar(1 + Math.sin(t * 1.6) * 0.05);
      group.rotation.y = t * 0.15;
      group.rotation.x = Math.sin(t * 0.1) * 0.2;
      electrons.forEach((el) => {
        el.angle += el.ring.speed * 0.018;
        el.mesh.position.set(
          el.ring.r * Math.cos(el.angle),
          Math.sin(t * 2 + el.ring.tilt) * 0.3,
          el.ring.r * Math.sin(el.angle)
        );
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
