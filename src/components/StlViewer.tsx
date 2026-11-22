// src/components/StlViewer.tsx
// Visor 3D contemporáneo y compacto: Three.js + STLLoader + Geometrías Procedurales + OrbitControls.
// Con estado de carga (Loader), fallback WebGL y limpieza estricta de memoria GPU.

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface StlViewerProps {
  url?: string;
  geometryType?: 'cylinder' | 'octagon' | 'cone' | 'organic' | 'monolith' | 'vessel' | 'stl';
  color?: string; // hex, ej. "#A7A7A2"
  className?: string;
  autoRotate?: boolean;
}

export const StlViewer: React.FC<StlViewerProps> = ({
  url,
  geometryType = 'stl',
  color = '#A7A7A2',
  className = '',
  autoRotate = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(url && (geometryType === 'stl' || !geometryType)));
  const [webglError, setWebglError] = useState<string | null>(null);

  // ── Cambio de color reactivo sin recargar la escena ──
  useEffect(() => {
    if (!meshRef.current) return;
    (meshRef.current.material as THREE.MeshStandardMaterial).color.set(color);
  }, [color]);

  // ── Inicialización de escena Three.js ─────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('Tu navegador o dispositivo no tiene soporte WebGL activo para renderizar 3D.');
      setIsLoading(false);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.position.set(0, 0.8, 2.4);

    // Iluminación arquitectónica suave para concreto
    const ambient = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff7ed, 2.2);
    sun.position.set(3, 4, 3);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xd5dbdb, 0.7);
    fill.position.set(-2, -1, -2);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.6;
    controls.maxDistance = 5;
    controls.minDistance = 0.8;

    let animId = 0;
    let isDisposed = false;

    const resize = () => {
      if (isDisposed) return;
      const w = canvas.clientWidth || 300;
      const h = canvas.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const disposeCurrentMesh = () => {
      if (!meshRef.current) return;
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (Array.isArray(meshRef.current.material)) {
        meshRef.current.material.forEach((m) => m.dispose());
      } else {
        meshRef.current.material.dispose();
      }
      meshRef.current = null;
    };

    const attachGeometry = (geo: THREE.BufferGeometry) => {
      if (isDisposed) {
        geo.dispose();
        return;
      }
      disposeCurrentMesh();

      geo.computeVertexNormals();
      geo.center();

      const box = new THREE.Box3().setFromBufferAttribute(geo.attributes.position as THREE.BufferAttribute);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);

      geo.computeBoundingBox();
      if (geo.boundingBox) {
        geo.translate(0, -geo.boundingBox.min.y, 0);
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.82,
        metalness: 0.05,
      });

      const mesh = new THREE.Mesh(geo, mat);
      const targetScale = 1.0 / maxDim;
      mesh.scale.setScalar(targetScale);
      mesh.position.y = -0.4;

      scene.add(mesh);
      meshRef.current = mesh;
      setIsLoading(false);
    };

    // Carga de archivo STL o geometría procedural
    if (url && (geometryType === 'stl' || !geometryType)) {
      setIsLoading(true);
      const loader = new STLLoader();
      loader.load(
        url,
        (geo) => {
          attachGeometry(geo);
        },
        undefined,
        () => {
          // Fallback a cilindro suave si el STL falla
          const fallback = new THREE.CylinderGeometry(0.35, 0.32, 0.7, 48);
          attachGeometry(fallback);
        }
      );
    } else {
      setIsLoading(false);
      let geo: THREE.BufferGeometry;
      switch (geometryType) {
        case 'octagon':
          geo = new THREE.CylinderGeometry(0.38, 0.32, 0.72, 8);
          break;
        case 'cone':
          geo = new THREE.CylinderGeometry(0.42, 0.25, 0.75, 48);
          break;
        case 'monolith':
          geo = new THREE.BoxGeometry(0.9, 0.45, 0.4);
          break;
        case 'vessel':
          geo = new THREE.CylinderGeometry(0.4, 0.25, 0.65, 32);
          break;
        case 'organic':
          geo = new THREE.SphereGeometry(0.38, 32, 24);
          geo.scale(1, 1.25, 1);
          break;
        case 'cylinder':
        default:
          geo = new THREE.CylinderGeometry(0.35, 0.35, 0.72, 64);
          break;
      }
      attachGeometry(geo);
    }

    const tick = () => {
      if (isDisposed) return;
      animId = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      disposeCurrentMesh();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, geometryType]);

  if (webglError) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center p-4 text-center font-mono text-xs text-[#8C8C87] bg-[#161818] ${className}`}>
        {webglError}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#161818]/60 backdrop-blur-sm pointer-events-none">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#B6A17E] px-3 py-1.5 bg-[#111313]/90 border border-[#B6A17E]/40">
            Cargando Geometría 3D...
          </span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};
