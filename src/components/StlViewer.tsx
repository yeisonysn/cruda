// src/components/StlViewer.tsx
// Visor 3D compacto: STLLoader + OrbitControls + color configurable.
// Reutilizable en Admin (lista de materas) y vista AR (preview antes de entrar).

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface Props {
  url: string;
  color?: string;   // hex, ej. "#9e9e99"
  className?: string;
}

export const StlViewer: React.FC<Props> = ({ url, color = '#9e9e99', className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef   = useRef<THREE.Mesh | null>(null);

  // ── Cambio de color sin reconstruir la escena ──
  useEffect(() => {
    if (!meshRef.current) return;
    (meshRef.current.material as THREE.MeshStandardMaterial).color.set(color);
  }, [color]);

  // ── Escena principal ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 500);
    camera.position.set(0, 1, 3);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const sun = new THREE.DirectionalLight(0xfff7ed, 2);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xd5dbdb, 0.5);
    fill.position.set(-3, -2, -3);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.8;

    let animId = 0;

    const resize = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loader = new STLLoader();
    loader.load(
      url,
      (geo) => {
        geo.computeVertexNormals();
        geo.center();
        const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);

        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.04 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.setScalar(1.5 / maxDim);
        scene.add(mesh);
        meshRef.current = mesh;
      },
      undefined,
      () => { /* error silencioso en el visor */ }
    );

    const tick = () => {
      animId = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        (meshRef.current.material as THREE.Material).dispose();
        meshRef.current = null;
      }
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
};

