// src/components/Interactive3DLab.tsx
// Visualizador 3D interactivo y suite de Realidad Aumentada (WebXR) de CRUDA.
// Soporta renderizado de archivos .STL del servidor, geometrías puras de catálogo,
// rotación/zoom con mouse y touch, selección de acabados de concreto en vivo y anclaje AR.

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Camera, RotateCcw, ShoppingBag, MessageSquare, Sparkles, Check } from 'lucide-react';
import { FINISH_COLORS } from '../data/catalogData';

export interface ServerStlMatera {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  color?: string;
  archivo: string;
  archivoUrl: string;
  creadoEn?: string;
}

interface Props {
  stlMateras: ServerStlMatera[];
  selectedStlUrl: string;
  onSelectStlUrl: (url: string) => void;
  onAddCustomToCart: (item: {
    name: string;
    sku: string;
    priceCop: number;
    colorHex: string;
    finishName: string;
    size: 'S' | 'M' | 'L';
    isCustomStl: boolean;
  }) => void;
  onOpenAdminModal: () => void;
  whatsappPhone?: string;
}

type LabMode = 'procedural-cylinder' | 'procedural-octagon' | 'procedural-cone' | 'stl-model';

export const Interactive3DLab: React.FC<Props> = ({
  stlMateras,
  selectedStlUrl,
  onSelectStlUrl,
  onAddCustomToCart,
  onOpenAdminModal,
  whatsappPhone = '573108204522',
}) => {
  const [labMode, setLabMode] = useState<LabMode>(stlMateras.length > 0 ? 'stl-model' : 'procedural-cylinder');
  const [activeColor, setActiveColor] = useState<string>('#A7A7A2');
  const [activeFinishName, setActiveFinishName] = useState<string>('Gris Cemento Puro');
  const [selectedScale, setSelectedScale] = useState<'S' | 'M' | 'L'>('M');
  const [arActive, setArActive] = useState<boolean>(false);
  const [arGuide, setArGuide] = useState<string>('Apunta al suelo para detectar superficies y toca para anclar la matera');
  const [arFeedback, setArFeedback] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    controls?: OrbitControls;
    previewGroup?: THREE.Group;
    arGroup?: THREE.Group;
    reticle?: THREE.Mesh;
    hitTestSource?: any;
    xrSession?: any;
    placedAnchor?: any;
    currentGeometry?: THREE.BufferGeometry;
    currentMesh?: THREE.Mesh;
  }>({});

  // Geometrías procedurales del catálogo
  const createProceduralGeometry = (mode: LabMode): THREE.BufferGeometry => {
    if (mode === 'procedural-octagon') {
      const geo = new THREE.CylinderGeometry(0.16, 0.13, 0.32, 8);
      geo.computeVertexNormals();
      geo.translate(0, 0.16, 0);
      return geo;
    }
    if (mode === 'procedural-cone') {
      const geo = new THREE.CylinderGeometry(0.18, 0.11, 0.34, 48);
      geo.computeVertexNormals();
      geo.translate(0, 0.17, 0);
      return geo;
    }
    // Procedural cylinder (CR-001)
    const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 64);
    geo.computeVertexNormals();
    geo.translate(0, 0.175, 0);
    return geo;
  };

  // Inicialización de Three.js & WebXR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 30);
    camera.position.set(0, 0.42, 0.85);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.xr.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 2.2;
    controls.minDistance = 0.35;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;

    // Iluminación arquitectónica
    scene.add(new THREE.AmbientLight(0xffffff, 1.3));

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
    sunLight.position.set(2.2, 3.8, 2.2);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xd5dbdb, 0.8);
    fillLight.position.set(-2, -1, -2);
    scene.add(fillLight);

    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    const arGroup = new THREE.Group();
    scene.add(arGroup);

    // Retícula WebXR para detección de superficies reales
    const reticleGeo = new THREE.RingGeometry(0.09, 0.11, 32).rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xb6a17e, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Sombra de contacto en el piso virtual
    const shadowGeo = new THREE.PlaneGeometry(0.65, 0.65);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, 'rgba(17, 19, 19, 0.45)');
      grad.addColorStop(0.5, 'rgba(17, 19, 19, 0.15)');
      grad.addColorStop(1, 'rgba(17, 19, 19, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.002;
    previewGroup.add(shadowMesh);

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      previewGroup,
      arGroup,
      reticle,
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return;
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(canvas);

    renderer.setAnimationLoop((_timestamp: number, frame?: any) => {
      if (arActive && frame) {
        const refSpace = renderer.xr.getReferenceSpace();
        if (threeRef.current.hitTestSource) {
          const hitTestResults = frame.getHitTestResults(threeRef.current.hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(refSpace);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
            }
          } else {
            reticle.visible = false;
          }
        }
        if (threeRef.current.placedAnchor?.userData?.anchor) {
          const anchorPose = frame.getPose(threeRef.current.placedAnchor.userData.anchor.anchorSpace, refSpace);
          if (anchorPose) {
            threeRef.current.placedAnchor.matrix.fromArray(anchorPose.transform.matrix);
          }
        }
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
    });

    return () => {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();

      // Limpieza explícita de memoria GPU (geometrías, materiales y texturas)
      const disposeHierarchy = (group: THREE.Object3D) => {
        group.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      };

      disposeHierarchy(previewGroup);
      disposeHierarchy(arGroup);
      reticleGeo.dispose();
      reticleMat.dispose();
      shadowGeo.dispose();
      shadowTex.dispose();
      renderer.dispose();
    };
  }, [arActive]);

  // Carga de geometría (STL o Procedural)
  useEffect(() => {
    const { previewGroup } = threeRef.current;
    if (!previewGroup) return;

    const mountGeometry = (geometry: THREE.BufferGeometry) => {
      threeRef.current.currentGeometry = geometry;

      // Limpiar y liberar memoria GPU de mallas previas excepto la sombra base
      const meshesToRemove = previewGroup.children.filter((child) => child.type === 'Mesh' && child.position.y > 0);
      meshesToRemove.forEach((m) => {
        const mesh = m as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => mat.dispose());
        } else {
          mesh.material?.dispose();
        }
        previewGroup.remove(mesh);
      });

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(activeColor),
        roughness: 0.85,
        metalness: 0.05,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      previewGroup.add(mesh);
      threeRef.current.currentMesh = mesh;
    };

    if (labMode === 'stl-model' && selectedStlUrl) {
      const loader = new STLLoader();
      loader.load(
        selectedStlUrl,
        (geometry) => {
          geometry.computeVertexNormals();
          geometry.center();
          const box = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position as THREE.BufferAttribute);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const scale = 0.28 / maxDim;
          geometry.scale(scale, scale, scale);
          geometry.computeBoundingBox();
          if (geometry.boundingBox) {
            geometry.translate(0, -geometry.boundingBox.min.y, 0);
          }
          mountGeometry(geometry);
        },
        undefined,
        () => {
          mountGeometry(createProceduralGeometry('procedural-cylinder'));
        }
      );
    } else {
      mountGeometry(createProceduralGeometry(labMode));
    }
  }, [labMode, selectedStlUrl]);

  // Actualizar color y escala reactivamente
  useEffect(() => {
    const mesh = threeRef.current.currentMesh;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(activeColor);
    const scaleFactor = selectedScale === 'S' ? 0.82 : selectedScale === 'L' ? 1.25 : 1.0;
    mesh.scale.setScalar(scaleFactor);
  }, [activeColor, selectedScale]);

  // Flujo WebXR (Realidad Aumentada móvil con hit-test y anclaje)
  const startWebXR = async () => {
    setArFeedback(null);
    const nav = navigator as any;
    if (!nav.xr) {
      setArFeedback(
        'La Realidad Aumentada requiere Google Chrome en Android (con soporte ARCore) bajo conexión HTTPS. En este dispositivo puedes rotar e inspeccionar libremente el modelo 3D.'
      );
      return;
    }

    try {
      const session = await nav.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['anchors', 'local-floor', 'dom-overlay'],
        domOverlay: { root: document.getElementById('cruda-ar-dom-overlay') },
      });

      const { renderer, previewGroup, arGroup, reticle } = threeRef.current;
      if (!renderer) return;

      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(session);
      threeRef.current.xrSession = session;

      if (previewGroup) previewGroup.visible = false;
      if (arGroup) {
        arGroup.visible = true;
        arGroup.clear();
      }

      const viewerSpace = await session.requestReferenceSpace('viewer');
      threeRef.current.hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

      session.addEventListener('select', async (event: any) => {
        if (!reticle || !reticle.visible || !threeRef.current.currentGeometry) return;

        const frame = event.frame;
        const refSpace = renderer.xr.getReferenceSpace();

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(activeColor),
          roughness: 0.85,
          metalness: 0.05,
        });
        const model = new THREE.Mesh(threeRef.current.currentGeometry, mat);

        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        reticle.matrix.decompose(pos, quat, sc);

        model.position.copy(pos);
        model.quaternion.copy(quat);

        // Anclar en el espacio del mundo real (XRAnchor)
        if (frame && 'createAnchor' in frame) {
          try {
            const transform = new (window as any).XRRigidTransform(
              { x: pos.x, y: pos.y, z: pos.z },
              { x: quat.x, y: quat.y, z: quat.z, w: quat.w }
            );
            const anchor = await frame.createAnchor(transform, refSpace);
            model.userData.anchor = anchor;
          } catch (e) {
            console.warn('createAnchor omitido:', e);
          }
        }

        if (arGroup) {
          arGroup.clear();
          arGroup.add(model);
          threeRef.current.placedAnchor = model;
        }

        reticle.visible = false;
        setArGuide('Matera anclada en el espacio. Camina a su alrededor o toca nuevamente para reubicarla.');
      });

      session.addEventListener('end', () => {
        setArActive(false);
        threeRef.current.xrSession = null;
        threeRef.current.hitTestSource = null;
        if (previewGroup) previewGroup.visible = true;
        if (arGroup) arGroup.visible = false;
        if (reticle) reticle.visible = false;
        setArGuide('Apunta al suelo para detectar superficies y toca para anclar la matera');
      });

      setArActive(true);
    } catch (err: any) {
      setArFeedback(`No fue posible iniciar la sesión AR: ${err.message || 'Dispositivo no compatible'}`);
    }
  };

  const exitWebXR = () => {
    if (threeRef.current.xrSession) {
      threeRef.current.xrSession.end();
    }
  };

  const selectedStlObj = stlMateras.find((m) => m.archivoUrl === selectedStlUrl);
  const currentBasePrice =
    labMode === 'stl-model' && selectedStlObj && selectedStlObj.precio > 0
      ? selectedStlObj.precio
      : labMode === 'procedural-octagon'
      ? 235000
      : labMode === 'procedural-cone'
      ? 290000
      : 185000;

  const scaleMultiplier = selectedScale === 'S' ? 0.8 : selectedScale === 'L' ? 1.45 : 1;
  const computedPrice = Math.round((currentBasePrice * scaleMultiplier) / 1000) * 1000;

  const activeModelTitle =
    labMode === 'stl-model' && selectedStlObj
      ? selectedStlObj.nombre
      : labMode === 'procedural-octagon'
      ? 'Prisma Octagonal (CR-002)'
      : labMode === 'procedural-cone'
      ? 'Cono Truncado (CR-003)'
      : 'Cilindro Puro (CR-001)';

  const handleOrderWhatsApp = () => {
    const text = `Hola CRUDA, estoy interesado en adquirir/cotizar esta pieza del Visualizador 3D:
• Modelo: ${activeModelTitle}
• Acabado: ${activeFinishName} (${activeColor})
• Escala: ${selectedScale}
• Precio estimado: $${computedPrice.toLocaleString('es-CO')} COP
¿Podrían confirmarme disponibilidad y tiempo de entrega?`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section id="visualizador-3d" className="py-20 bg-[#161818] text-[#F1F0EB] border-t border-[#292B2B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado de la sección */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#242626] border border-[#3A3D3D] text-[#B6A17E] font-mono text-[10px] uppercase tracking-widest mb-3">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              <span>Visualizador 3D Interactivo & AR</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#F1F0EB] tracking-wide">
              EXPLORA EN 3D Y REALIDAD AUMENTADA
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#A7A7A2] max-w-md font-light leading-relaxed">
            Rota 360°, haz zoom, cambia el color mineral en tiempo real o proyecta la pieza en tu espacio físico con la cámara del celular.
          </p>
        </div>

        {/* Contenedor principal de la experiencia 3D */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#2B2D2D] bg-[#111313] overflow-hidden">
          {/* Columna Izquierda: Canvas WebGL 3D (7 cols) */}
          <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[480px] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#2B2D2D] bg-gradient-to-b from-[#161818] to-[#0F1010]">
            {/* HUD Superior */}
            <div className="p-4 flex items-center justify-between z-10 pointer-events-none">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#A7A7A2] bg-[#111313]/70 px-2.5 py-1 border border-[#2B2D2D]">
                {activeModelTitle}
              </span>
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#B6A17E] bg-[#111313]/70 px-2.5 py-1 border border-[#2B2D2D]">
                Escala {selectedScale}
              </span>
            </div>

            {/* Canvas Three.js */}
            <div className="absolute inset-0">
              <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
            </div>

            {/* Barra Inferior del Canvas */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-2 z-10 bg-gradient-to-t from-[#111313] via-[#111313]/80 to-transparent">
              <span className="font-mono text-[10px] text-[#A7A7A2]">
                Arrastra para rotar · Rueda o pellizca para zoom
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const camera = threeRef.current.camera;
                    if (camera) {
                      camera.position.set(0, 0.42, 0.85);
                      camera.lookAt(0, 0.17, 0);
                    }
                  }}
                  title="Restablecer vista"
                  className="p-2 bg-[#1A1C1C] hover:bg-[#242626] border border-[#2B2D2D] text-[#A7A7A2] hover:text-[#F1F0EB] transition-colors"
                  aria-label="Restablecer posición de cámara"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={startWebXR}
                  className="px-3.5 py-2 bg-[#B6A17E] hover:bg-[#C5B18E] text-[#111313] font-mono text-[11px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ver en AR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Panel de Configuración (5 cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#161818]">
            <div className="space-y-6">
              {/* 1. Selector de Modelo */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[#B6A17E] mb-2.5">
                  1. Modelo a Visualizar
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLabMode('procedural-cylinder')}
                    className={`py-2 px-3 text-left font-mono text-xs border transition-all ${
                      labMode === 'procedural-cylinder'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/10 text-[#F1F0EB]'
                        : 'border-[#2B2D2D] bg-[#111313] text-[#A7A7A2] hover:border-[#3A3D3D]'
                    }`}
                  >
                    Cilindro Puro
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('procedural-octagon')}
                    className={`py-2 px-3 text-left font-mono text-xs border transition-all ${
                      labMode === 'procedural-octagon'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/10 text-[#F1F0EB]'
                        : 'border-[#2B2D2D] bg-[#111313] text-[#A7A7A2] hover:border-[#3A3D3D]'
                    }`}
                  >
                    Prisma Octagonal
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('procedural-cone')}
                    className={`py-2 px-3 text-left font-mono text-xs border transition-all ${
                      labMode === 'procedural-cone'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/10 text-[#F1F0EB]'
                        : 'border-[#2B2D2D] bg-[#111313] text-[#A7A7A2] hover:border-[#3A3D3D]'
                    }`}
                  >
                    Cono Truncado
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('stl-model')}
                    className={`py-2 px-3 text-left font-mono text-xs border transition-all ${
                      labMode === 'stl-model'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/10 text-[#F1F0EB]'
                        : 'border-[#2B2D2D] bg-[#111313] text-[#A7A7A2] hover:border-[#3A3D3D]'
                    }`}
                  >
                    Archivos .STL ({stlMateras.length})
                  </button>
                </div>

                {labMode === 'stl-model' && (
                  <div className="p-3 bg-[#111313] border border-[#2B2D2D] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#A7A7A2]">
                        Selecciona archivo STL:
                      </span>
                      <button
                        type="button"
                        onClick={onOpenAdminModal}
                        className="font-mono text-[10px] text-[#B6A17E] hover:underline"
                      >
                        + Subir nuevo STL
                      </button>
                    </div>
                    <select
                      value={selectedStlUrl}
                      onChange={(e) => onSelectStlUrl(e.target.value)}
                      className="w-full bg-[#1A1C1C] border border-[#2B2D2D] text-xs font-mono p-2 text-[#F1F0EB] outline-none focus:border-[#B6A17E]"
                    >
                      {stlMateras.length === 0 ? (
                        <option value="">No hay archivos STL cargados</option>
                      ) : (
                        stlMateras.map((m) => (
                          <option key={m.id} value={m.archivoUrl}>
                            {m.nombre} — ${m.precio.toLocaleString('es-CO')} COP
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Acabado Mineral y Color */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-[#B6A17E]">
                    2. Acabado Mineral
                  </label>
                  <span className="font-mono text-xs text-[#EAE5DC]">{activeFinishName}</span>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {FINISH_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveColor(c.hex);
                        setActiveFinishName(c.name);
                      }}
                      title={c.name}
                      aria-label={`Seleccionar acabado ${c.name}`}
                      className={`h-9 border transition-all flex items-center justify-center ${
                        activeColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-[#B6A17E] ring-2 ring-[#B6A17E]/40 scale-105'
                          : 'border-[#2B2D2D] opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {activeColor.toLowerCase() === c.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-[#111313]" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] uppercase text-[#A7A7A2]">Color libre personalizado:</span>
                  <input
                    type="color"
                    value={activeColor}
                    onChange={(e) => {
                      setActiveColor(e.target.value);
                      setActiveFinishName(`Tono Personalizado ${e.target.value.toUpperCase()}`);
                    }}
                    className="w-7 h-7 bg-transparent border border-[#2B2D2D] cursor-pointer"
                    title="Elegir tono personalizado"
                  />
                </div>
              </div>

              {/* 3. Escala */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[#B6A17E] mb-2">
                  3. Escala / Dimensiones
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['S', 'M', 'L'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedScale(sz)}
                      className={`py-2 px-3 border font-mono text-xs uppercase transition-all ${
                        selectedScale === sz
                          ? 'border-[#B6A17E] bg-[#B6A17E] text-[#111313] font-bold'
                          : 'border-[#2B2D2D] bg-[#111313] text-[#A7A7A2] hover:border-[#3A3D3D]'
                      }`}
                    >
                      Escala {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {arFeedback && (
              <div role="status" className="p-3 bg-[#1A1C1C] border border-[#B6A17E]/40 text-xs font-mono text-[#D5C8B5]">
                {arFeedback}
              </div>
            )}

            {/* Acciones de compra / cotización */}
            <div className="pt-4 border-t border-[#2B2D2D] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[#A7A7A2]">Precio estimado</span>
                <span className="font-serif text-2xl text-[#F1F0EB]">
                  ${computedPrice.toLocaleString('es-CO')} <span className="text-xs font-mono text-[#B6A17E]">COP</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleOrderWhatsApp}
                  className="py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-[#111313] font-mono text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                  <span>Pedir por WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onAddCustomToCart({
                      name: activeModelTitle,
                      sku: `LAB-${selectedScale}-${activeColor.replace('#', '').toUpperCase()}`,
                      priceCop: computedPrice,
                      colorHex: activeColor,
                      finishName: activeFinishName,
                      size: selectedScale,
                      isCustomStl: labMode === 'stl-model',
                    })
                  }
                  className="py-3 px-4 bg-[#B6A17E] hover:bg-[#C5B18E] text-[#111313] font-mono text-[11px] uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                  <span>Añadir al Carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capa nativa de overlay durante Realidad Aumentada (WebXR) */}
      <div
        id="cruda-ar-dom-overlay"
        className={`fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6 ${
          arActive ? 'block' : 'hidden'
        }`}
      >
        <div className="pointer-events-auto bg-[#111313]/90 backdrop-blur px-4 py-2.5 border border-[#B6A17E]/40 text-center max-w-md mx-auto">
          <p className="font-mono text-xs text-[#F1F0EB]">{arGuide}</p>
        </div>
        <div className="pointer-events-auto flex justify-center">
          <button
            type="button"
            onClick={exitWebXR}
            className="bg-red-900/90 hover:bg-red-800 text-white font-mono text-xs uppercase tracking-widest px-6 py-3 border border-white/30 backdrop-blur shadow-2xl"
          >
            Salir de Realidad Aumentada
          </button>
        </div>
      </div>
    </section>
  );
};
