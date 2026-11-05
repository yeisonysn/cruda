import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Camera, RotateCcw, Sun, Sparkles, Layers, ShoppingBag } from 'lucide-react';
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
}

type LabMode = 'procedural-cylinder' | 'procedural-octagon' | 'procedural-cone' | 'stl-model';

export const Interactive3DLab: React.FC<Props> = ({
  stlMateras,
  selectedStlUrl,
  onSelectStlUrl,
  onAddCustomToCart,
  onOpenAdminModal,
}) => {
  const [labMode, setLabMode] = useState<LabMode>(stlMateras.length > 0 ? 'stl-model' : 'procedural-cylinder');
  const [activeColor, setActiveColor] = useState<string>('#A7A7A2');
  const [activeFinishName, setActiveFinishName] = useState<string>('Gris Cemento Puro');
  const [sunAngle, setSunAngle] = useState<number>(45);
  const [roughness, setRoughness] = useState<number>(0.84);
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
    sunLight?: THREE.DirectionalLight;
    previewGroup?: THREE.Group;
    arGroup?: THREE.Group;
    reticle?: THREE.Mesh;
    hitTestSource?: any;
    xrSession?: any;
    placedAnchor?: any;
    currentGeometry?: THREE.BufferGeometry;
    currentMesh?: THREE.Mesh;
  }>({});

  // Build procedural geometries when needed
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
    const geo = new THREE.CylinderGeometry(0.16, 0.16, 0.30, 64);
    geo.computeVertexNormals();
    geo.translate(0, 0.15, 0);
    return geo;
  };

  // Initialize Three.js WebGL + WebXR Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, (canvas.clientWidth || 800) / (canvas.clientHeight || 500), 0.01, 25);
    camera.position.set(0.42, 0.38, 0.68);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 500, false);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.15, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.minDistance = 0.32;
    controls.maxDistance = 1.8;

    // Studio Lighting
    scene.add(new THREE.AmbientLight(0xf1f0eb, 1.15));

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.8);
    sunLight.position.set(1.5, 2.6, 1.5);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xd5c8b5, 0.85);
    fillLight.position.set(-1.8, 0.8, -1.4);
    scene.add(fillLight);

    // Architectural Pedestal Grid in 3D Preview
    const gridHelper = new THREE.GridHelper(1.2, 12, 0xb6a17e, 0x292b2b);
    (gridHelper.material as THREE.Material).opacity = 0.25;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    const arGroup = new THREE.Group();
    scene.add(arGroup);

    // WebXR Reticle
    const retGeo = new THREE.RingGeometry(0.09, 0.115, 36).rotateX(-Math.PI / 2);
    const retMat = new THREE.MeshBasicMaterial({ color: 0xb6a17e, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(retGeo, retMat);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      sunLight,
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
      renderer.dispose();
      controls.dispose();
    };
  }, [arActive]);

  // Load Geometry (STL or Procedural)
  useEffect(() => {
    const { previewGroup } = threeRef.current;
    if (!previewGroup) return;

    const mountGeometry = (geometry: THREE.BufferGeometry) => {
      threeRef.current.currentGeometry = geometry;
      previewGroup.clear();
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(activeColor),
        roughness,
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

  // Live update color, roughness, and scale
  useEffect(() => {
    const mesh = threeRef.current.currentMesh;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(activeColor);
    mat.roughness = roughness;
    const scaleFactor = selectedScale === 'S' ? 0.82 : selectedScale === 'L' ? 1.22 : 1.0;
    mesh.scale.setScalar(scaleFactor);
  }, [activeColor, roughness, selectedScale]);

  // Live update Sun Azimuth Angle
  useEffect(() => {
    const sun = threeRef.current.sunLight;
    if (!sun) return;
    const rad = (sunAngle * Math.PI) / 180;
    sun.position.set(Math.cos(rad) * 2.4, 2.4, Math.sin(rad) * 2.4);
  }, [sunAngle]);

  const startWebXR = async () => {
    setArFeedback(null);
    const nav = navigator as any;
    if (!nav.xr) {
      setArFeedback(
        'WebXR requiere Chrome en Android (con ARCore) bajo conexión HTTPS. En escritorio puedes inspeccionar la pieza en el visor 3D interactivo.'
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
          roughness,
          metalness: 0.05,
        });
        const model = new THREE.Mesh(threeRef.current.currentGeometry, mat);

        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        reticle.matrix.decompose(pos, quat, sc);

        model.position.copy(pos);
        model.quaternion.copy(quat);

        if (frame && 'createAnchor' in frame) {
          try {
            const transform = new (window as any).XRRigidTransform(
              { x: pos.x, y: pos.y, z: pos.z },
              { x: quat.x, y: quat.y, z: quat.z, w: quat.w }
            );
            const anchor = await frame.createAnchor(transform, refSpace);
            model.userData.anchor = anchor;
          } catch {
            // fallback to fixed pose
          }
        }

        if (arGroup) {
          arGroup.clear();
          arGroup.add(model);
          threeRef.current.placedAnchor = model;
        }
        reticle.visible = false;
        setArGuide('Matera anclada en tu espacio. Toca otra superficie para reubicarla.');
      });

      session.addEventListener('end', () => {
        setArActive(false);
        threeRef.current.xrSession = null;
        threeRef.current.hitTestSource = null;
        if (previewGroup) previewGroup.visible = true;
        if (arGroup) arGroup.visible = false;
        if (reticle) reticle.visible = false;
      });

      setArActive(true);
    } catch (err: any) {
      setArFeedback(`No fue posible iniciar sesión AR: ${err.message || 'Dispositivo no compatible'}`);
    }
  };

  const exitWebXR = () => {
    if (threeRef.current.xrSession) {
      threeRef.current.xrSession.end();
    }
  };

  const selectedStlObj = stlMateras.find(m => m.archivoUrl === selectedStlUrl);
  const currentBasePrice =
    labMode === 'stl-model' && selectedStlObj && selectedStlObj.precio > 0
      ? selectedStlObj.precio
      : labMode === 'procedural-octagon'
      ? 235000
      : labMode === 'procedural-cone'
      ? 290000
      : 185000;

  const scaleMultiplier = selectedScale === 'S' ? 0.8 : selectedScale === 'L' ? 1.55 : 1;
  const computedPrice = Math.round((currentBasePrice * scaleMultiplier) / 1000) * 1000;

  return (
    <section id="laboratorio-3d" className="py-24 bg-[#111313] text-[#F1F0EB] border-y border-[#292B2B] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#B6A17E]/40 bg-[#B6A17E]/10 text-[#B6A17E] font-mono text-[11px] uppercase tracking-widest mb-4">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Laboratorio Interactivo 3D · STL · WebXR AR</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-wide text-[#F1F0EB]">
              GEOMETRÍA, LUZ Y ESCALA EN VIVO
            </h2>
          </div>
          <p className="text-sm text-[#A7A7A2] max-w-md font-light leading-relaxed">
            Inspecciona en 360° nuestras matrices monolíticas o tus archivos <code className="text-[#B6A17E]">.STL</code> cargados al servidor. Simula la incidencia solar sobre el concreto UHPC o proyéctalo en tu espacio con Realidad Aumentada.
          </p>
        </div>

        {/* Main 3D Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#292B2B] bg-[#181A1A] shadow-sculptural">
          {/* Left: Interactive WebGL Canvas (7 cols) */}
          <div className="lg:col-span-7 relative min-h-[440px] sm:min-h-[540px] flex flex-col justify-between bg-concrete-dark border-b lg:border-b-0 lg:border-r border-[#292B2B]">
            {/* Top HUD Overlay */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
              <div className="bg-[#111313]/85 backdrop-blur px-3 py-1.5 border border-[#292B2B] font-mono text-[11px] text-[#A7A7A2]">
                MOTOR: <span className="text-[#F1F0EB]">THREE.JS WEBGL2 + STLLOADER</span>
              </div>
              <div className="bg-[#111313]/85 backdrop-blur px-3 py-1.5 border border-[#B6A17E]/40 font-mono text-[11px] text-[#B6A17E]">
                ESCALA {selectedScale} · LUZ {sunAngle}°
              </div>
            </div>

            {/* Canvas */}
            <div className="absolute inset-0">
              <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
            </div>

            {/* Bottom Canvas Bar */}
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 z-10 bg-gradient-to-t from-[#111313] via-[#111313]/80 to-transparent">
              <span className="font-mono text-[11px] text-[#A7A7A2]">
                Arrastra para orbitar · Rueda o pellizca para zoom
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSunAngle(45);
                    setRoughness(0.84);
                  }}
                  className="px-3 py-1.5 bg-[#181A1A] hover:bg-[#292B2B] border border-[#292B2B] text-xs font-mono uppercase tracking-wider text-[#F1F0EB] flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={startWebXR}
                  className="px-4 py-1.5 bg-[#B6A17E] hover:bg-[#c8b391] text-[#111313] font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Proyectar en AR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Parametric Control Panel (5 cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-[#161818]">
            <div className="space-y-6">
              {/* 1. Geometry / STL Selector */}
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-widest text-[#B6A17E] mb-2">
                  01 · Matriz Geométrica o Modelo .STL
                </span>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setLabMode('procedural-cylinder')}
                    className={`px-3 py-2.5 text-left font-mono text-xs border transition-all ${
                      labMode === 'procedural-cylinder'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/15 text-[#F1F0EB]'
                        : 'border-[#292B2B] bg-[#111313] text-[#A7A7A2] hover:border-[#A7A7A2]'
                    }`}
                  >
                    CR-001 · Cilindro
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('procedural-octagon')}
                    className={`px-3 py-2.5 text-left font-mono text-xs border transition-all ${
                      labMode === 'procedural-octagon'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/15 text-[#F1F0EB]'
                        : 'border-[#292B2B] bg-[#111313] text-[#A7A7A2] hover:border-[#A7A7A2]'
                    }`}
                  >
                    CR-002 · Octágono
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('procedural-cone')}
                    className={`px-3 py-2.5 text-left font-mono text-xs border transition-all ${
                      labMode === 'procedural-cone'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/15 text-[#F1F0EB]'
                        : 'border-[#292B2B] bg-[#111313] text-[#A7A7A2] hover:border-[#A7A7A2]'
                    }`}
                  >
                    CR-003 · Cono
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('stl-model')}
                    className={`px-3 py-2.5 text-left font-mono text-xs border transition-all ${
                      labMode === 'stl-model'
                        ? 'border-[#B6A17E] bg-[#B6A17E]/15 text-[#F1F0EB]'
                        : 'border-[#292B2B] bg-[#111313] text-[#A7A7A2] hover:border-[#A7A7A2]'
                    }`}
                  >
                    Archivo .STL ({stlMateras.length})
                  </button>
                </div>

                {labMode === 'stl-model' && (
                  <div className="p-3 bg-[#111313] border border-[#292B2B] space-y-2">
                    <label htmlFor="stl-lab-select" className="block font-mono text-[10px] uppercase tracking-wider text-[#A7A7A2]">
                      Modelos .STL en Servidor (/uploads):
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="stl-lab-select"
                        value={selectedStlUrl}
                        onChange={(e) => onSelectStlUrl(e.target.value)}
                        className="flex-1 bg-[#181A1A] border border-[#292B2B] text-xs font-mono px-2.5 py-2 text-[#F1F0EB]"
                      >
                        {stlMateras.length === 0 ? (
                          <option value="">Sin archivos STL cargados</option>
                        ) : (
                          stlMateras.map((m) => (
                            <option key={m.id} value={m.archivoUrl}>
                              {m.nombre} — ${m.precio.toLocaleString('es-CO')} COP
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={onOpenAdminModal}
                        className="px-3 py-2 bg-[#292B2B] hover:bg-[#B6A17E] hover:text-[#111313] text-xs font-mono uppercase tracking-wider transition-colors"
                      >
                        + Subir STL
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Mineral Finish & Pigment */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#B6A17E]">
                    02 · Pigmentación Mineral:
                  </span>
                  <span className="font-mono text-xs text-[#F1F0EB]">{activeFinishName}</span>
                </div>
                <div className="grid grid-cols-6 gap-2 items-center">
                  {FINISH_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveColor(c.hex);
                        setActiveFinishName(c.name);
                      }}
                      aria-label={`Seleccionar pigmento ${c.name}`}
                      className={`h-9 border transition-transform ${
                        activeColor.toLowerCase() === c.hex.toLowerCase()
                          ? 'border-[#B6A17E] scale-105 ring-2 ring-[#B6A17E]/40'
                          : 'border-[#292B2B] opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs">
                  <label htmlFor="custom-hex-picker" className="font-mono text-[10px] uppercase text-[#A7A7A2]">
                    Pigmento especial a medida (HEX):
                  </label>
                  <input
                    id="custom-hex-picker"
                    type="color"
                    value={activeColor}
                    onChange={(e) => {
                      setActiveColor(e.target.value);
                      setActiveFinishName(`Pigmento Especial ${e.target.value.toUpperCase()}`);
                    }}
                    className="w-8 h-7 bg-transparent border border-[#292B2B] cursor-pointer"
                  />
                </div>
              </div>

              {/* 3. Scale Selector (S / M / L) */}
              <div>
                <span className="block font-mono text-[11px] uppercase tracking-widest text-[#B6A17E] mb-2">
                  03 · Escala Arquitectónica (D6 Variantes)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['S', 'M', 'L'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedScale(sz)}
                      className={`py-2 px-3 border font-mono text-xs uppercase transition-all ${
                        selectedScale === sz
                          ? 'border-[#B6A17E] bg-[#B6A17E] text-[#111313] font-bold'
                          : 'border-[#292B2B] bg-[#111313] text-[#A7A7A2] hover:border-[#A7A7A2]'
                      }`}
                    >
                      Escala {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Solar Incidence & Texture Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label htmlFor="sun-angle-range" className="flex items-center justify-between font-mono text-[10px] uppercase text-[#A7A7A2] mb-1">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-[#B6A17E]" aria-hidden="true" /> Incidencia Solar
                    </span>
                    <span>{sunAngle}°</span>
                  </label>
                  <input
                    id="sun-angle-range"
                    type="range"
                    min="0"
                    max="360"
                    value={sunAngle}
                    onChange={(e) => setSunAngle(Number(e.target.value))}
                    className="w-full accent-[#B6A17E] cursor-pointer"
                  />
                </div>
                <div>
                  <label htmlFor="roughness-range" className="flex items-center justify-between font-mono text-[10px] uppercase text-[#A7A7A2] mb-1">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#B6A17E]" aria-hidden="true" /> Poro / Mate
                    </span>
                    <span>{Math.round(roughness * 100)}%</span>
                  </label>
                  <input
                    id="roughness-range"
                    type="range"
                    min="0.3"
                    max="0.98"
                    step="0.02"
                    value={roughness}
                    onChange={(e) => setRoughness(Number(e.target.value))}
                    className="w-full accent-[#B6A17E] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {arFeedback && (
              <div role="status" className="p-3 bg-[#111313] border border-[#B6A17E]/50 text-xs font-mono text-[#D5C8B5]">
                {arFeedback}
              </div>
            )}

            {/* Price & Add to Cart Action */}
            <div className="pt-4 border-t border-[#292B2B] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="block font-mono text-[10px] uppercase text-[#A7A7A2]">
                  Valor Estimado (IVA 19% inc.)
                </span>
                <span className="font-serif text-2xl text-[#F1F0EB]">
                  ${computedPrice.toLocaleString('es-CO')} <span className="text-xs font-mono text-[#B6A17E]">COP</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onAddCustomToCart({
                    name:
                      labMode === 'stl-model' && selectedStlObj
                        ? `Matera STL: ${selectedStlObj.nombre}`
                        : labMode === 'procedural-octagon'
                        ? 'CR-002 Prisma Facetado'
                        : labMode === 'procedural-cone'
                        ? 'CR-003 Cono Terrazo'
                        : 'CR-001 Cilindro Puro',
                    sku: `LAB-${selectedScale}-${activeColor.replace('#', '').toUpperCase()}`,
                    priceCop: computedPrice,
                    colorHex: activeColor,
                    finishName: activeFinishName,
                    size: selectedScale,
                    isCustomStl: labMode === 'stl-model',
                  })
                }
                className="px-6 py-3.5 bg-[#B6A17E] hover:bg-[#c8b391] text-[#111313] font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>Agregar Configuración</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Native WebXR DOM Overlay when inside mobile AR */}
      <div
        id="cruda-ar-dom-overlay"
        className={`fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-6 ${
          arActive ? 'block' : 'hidden'
        }`}
      >
        <div className="pointer-events-auto bg-[#111313]/85 backdrop-blur px-4 py-2.5 border border-[#B6A17E]/40 text-center max-w-md mx-auto">
          <p className="font-mono text-xs text-[#F1F0EB]">{arGuide}</p>
        </div>
        <div className="pointer-events-auto flex justify-center">
          <button
            type="button"
            onClick={exitWebXR}
            className="bg-red-900/90 hover:bg-red-800 text-white font-mono text-xs uppercase tracking-widest px-6 py-3 border border-white/30 backdrop-blur"
          >
            Salir de Realidad Aumentada
          </button>
        </div>
      </div>
    </section>
  );
};
