// src/components/Interactive3DLab.tsx
// Visualizador 3D de Estudio Interactivo & Suite WebXR de CRUDA.
// Entorno de iluminación HDRI de estudio (RoomEnvironment), textura procedural de concreto mineral,
// sombra de contacto dinámica, selector vertical de modelos .STL y acabados, y anclaje AR.

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Camera,
  RotateCcw,
  ShoppingBag,
  MessageSquare,
  Sparkles,
  Pause,
  Play,
  Plus,
  Layers,
} from 'lucide-react';
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

const SCALE_SPECS: Record<'S' | 'M' | 'L', { dimensions: string; weight: string; multiplier: number }> = {
  S: { dimensions: 'Ø 18 × H 20 cm', weight: '3.5 kg', multiplier: 0.8 },
  M: { dimensions: 'Ø 26 × H 30 cm', weight: '8.2 kg', multiplier: 1.0 },
  L: { dimensions: 'Ø 34 × H 40 cm', weight: '14.5 kg', multiplier: 1.45 },
};

/** Genera texturas procedurales de microporosidad mineral para concreto arquitectónico. */
function createConcreteTextures(): { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 256;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  if (bCtx && rCtx) {
    const bImg = bCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);

    for (let i = 0; i < bImg.data.length; i += 4) {
      const grain = Math.random();
      // Porosidad sutil de concreto UHPC
      const pore = grain < 0.04 ? 95 : 185 + Math.floor((grain - 0.5) * 42);
      const rough = 195 + Math.floor((grain - 0.5) * 50);

      bImg.data[i] = pore;
      bImg.data[i + 1] = pore;
      bImg.data[i + 2] = pore;
      bImg.data[i + 3] = 255;

      rImg.data[i] = rough;
      rImg.data[i + 1] = rough;
      rImg.data[i + 2] = rough;
      rImg.data[i + 3] = 255;
    }

    bCtx.putImageData(bImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 3);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3, 3);

  return { bumpMap, roughnessMap };
}

export const Interactive3DLab: React.FC<Props> = ({
  stlMateras,
  selectedStlUrl,
  onSelectStlUrl,
  onAddCustomToCart,
  onOpenAdminModal,
  whatsappPhone = '573108204522',
}) => {
  const [labMode, setLabMode] = useState<LabMode>(stlMateras.length > 0 ? 'stl-model' : 'procedural-cylinder');
  const [userPickedMode, setUserPickedMode] = useState<boolean>(false);
  const [activeColor, setActiveColor] = useState<string>(FINISH_COLORS[1]?.hex || '#E6E4DD');
  const [activeFinishName, setActiveFinishName] = useState<string>(FINISH_COLORS[1]?.name || 'Blanco Mineral Calizo');
  const [selectedScale, setSelectedScale] = useState<'S' | 'M' | 'L'>('M');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [isLoadingStl, setIsLoadingStl] = useState<boolean>(false);
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
    contactShadow?: THREE.Mesh;
    concreteTextures?: { bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture };
    hitTestSource?: any;
    xrSession?: any;
    placedAnchor?: any;
    currentGeometry?: THREE.BufferGeometry;
    currentMesh?: THREE.Mesh;
  }>({});

  // Cambiar automáticamente a modo STL cuando carguen los modelos del servidor si el usuario no eligió otro
  useEffect(() => {
    if (!userPickedMode && stlMateras.length > 0 && selectedStlUrl) {
      setLabMode('stl-model');
    }
  }, [stlMateras, selectedStlUrl, userPickedMode]);

  // Geometrías procedurales base del catálogo
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
    const geo = new THREE.CylinderGeometry(0.15, 0.15, 0.35, 64);
    geo.computeVertexNormals();
    geo.translate(0, 0.175, 0);
    return geo;
  };

  // Inicialización de Three.js con iluminación HDRI de estudio y sombras suaves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 30);
    camera.position.set(0.32, 0.36, 0.78);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.xr.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Entorno HDRI de estudio (RoomEnvironment) para reflejos y volumen realistas
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.65;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.maxDistance = 1.9;
    controls.minDistance = 0.42;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minPolarAngle = 0.25;
    controls.target.set(0, 0.15, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.05;

    // Luz principal de estudio con proyección de sombra suave
    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.85);
    keyLight.position.set(1.8, 3.2, 2.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 8;
    const d = 0.6;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Luz de contra/borde para separar la silueta del fondo claro
    const rimLight = new THREE.DirectionalLight(0xdce6ee, 0.9);
    rimLight.position.set(-2.2, 1.8, -1.8);
    scene.add(rimLight);

    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    const arGroup = new THREE.Group();
    scene.add(arGroup);

    // Plano receptor de sombra real en el suelo
    const shadowPlaneGeo = new THREE.PlaneGeometry(2.5, 2.5);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.001;
    shadowPlane.receiveShadow = true;
    previewGroup.add(shadowPlane);

    // Sombra de contacto radial suave debajo de la base
    const contactGeo = new THREE.PlaneGeometry(0.55, 0.55);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
      grad.addColorStop(0, 'rgba(23, 42, 56, 0.34)');
      grad.addColorStop(0.5, 'rgba(23, 42, 56, 0.12)');
      grad.addColorStop(1, 'rgba(23, 42, 56, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const contactTex = new THREE.CanvasTexture(shadowCanvas);
    const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false });
    const contactShadow = new THREE.Mesh(contactGeo, contactMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.0005;
    previewGroup.add(contactShadow);

    // Retícula WebXR para detección de superficies reales
    const reticleGeo = new THREE.RingGeometry(0.09, 0.11, 32).rotateX(-Math.PI / 2);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xb6a17e, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    const concreteTextures = createConcreteTextures();

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      previewGroup,
      arGroup,
      reticle,
      contactShadow,
      concreteTextures,
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return;
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 480;
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
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      contactTex.dispose();
      concreteTextures.bumpMap.dispose();
      concreteTextures.roughnessMap.dispose();
      envTarget.dispose();
      roomEnv.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [arActive]);

  // Sincronizar auto-rotación con OrbitControls
  useEffect(() => {
    if (threeRef.current.controls) {
      threeRef.current.controls.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Carga de geometría (STL subido o Procedural)
  useEffect(() => {
    const { previewGroup, concreteTextures, contactShadow } = threeRef.current;
    if (!previewGroup) return;

    const mountGeometry = (geometry: THREE.BufferGeometry) => {
      threeRef.current.currentGeometry = geometry;

      // Eliminar solo las mallas de producto anteriores (conservar planos de sombra en y <= 0)
      const meshesToRemove = previewGroup.children.filter(
        (child) => child.type === 'Mesh' && child.userData?.isPlanterMesh
      );
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
        roughness: 0.88,
        metalness: 0.04,
        bumpMap: concreteTextures?.bumpMap || null,
        bumpScale: 0.0022,
        roughnessMap: concreteTextures?.roughnessMap || null,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.userData.isPlanterMesh = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const scaleFactor = selectedScale === 'S' ? 0.82 : selectedScale === 'L' ? 1.22 : 1.0;
      mesh.scale.setScalar(scaleFactor);

      // Ajustar sombra de contacto al footprint de la geometría
      geometry.computeBoundingBox();
      if (contactShadow && geometry.boundingBox) {
        const bSize = new THREE.Vector3();
        geometry.boundingBox.getSize(bSize);
        const footprint = Math.max(bSize.x, bSize.z, 0.2) * 1.45 * scaleFactor;
        contactShadow.scale.set(footprint / 0.55, footprint / 0.55, 1);
      }

      previewGroup.add(mesh);
      threeRef.current.currentMesh = mesh;
      setIsLoadingStl(false);
    };

    if (labMode === 'stl-model' && selectedStlUrl) {
      setIsLoadingStl(true);
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
          const scale = 0.32 / maxDim;
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

  // Actualizar color y escala reactivamente sin recargar el STL
  useEffect(() => {
    const mesh = threeRef.current.currentMesh;
    const contactShadow = threeRef.current.contactShadow;
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(activeColor);
    const scaleFactor = selectedScale === 'S' ? 0.82 : selectedScale === 'L' ? 1.22 : 1.0;
    mesh.scale.setScalar(scaleFactor);

    if (contactShadow && threeRef.current.currentGeometry?.boundingBox) {
      const bSize = new THREE.Vector3();
      threeRef.current.currentGeometry.boundingBox.getSize(bSize);
      const footprint = Math.max(bSize.x, bSize.z, 0.2) * 1.45 * scaleFactor;
      contactShadow.scale.set(footprint / 0.55, footprint / 0.55, 1);
    }
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

      const { renderer, previewGroup, arGroup, reticle, concreteTextures } = threeRef.current;
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
          roughness: 0.88,
          metalness: 0.04,
          bumpMap: concreteTextures?.bumpMap || null,
          bumpScale: 0.0022,
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

  const computedPrice = Math.round((currentBasePrice * SCALE_SPECS[selectedScale].multiplier) / 1000) * 1000;

  const activeModelTitle =
    labMode === 'stl-model' && selectedStlObj
      ? selectedStlObj.nombre
      : labMode === 'procedural-octagon'
      ? 'Prisma Octagonal'
      : labMode === 'procedural-cone'
      ? 'Cono Truncado'
      : 'Cilindro Puro';

  const activeModelCode =
    labMode === 'stl-model' && selectedStlObj
      ? `STL-${selectedStlObj.id.slice(-4).toUpperCase()}`
      : labMode === 'procedural-octagon'
      ? 'CR-002'
      : labMode === 'procedural-cone'
      ? 'CR-003'
      : 'CR-001';

  const activeModelDescription =
    labMode === 'stl-model' && selectedStlObj?.descripcion
      ? selectedStlObj.descripcion
      : 'Pieza arquitectónica vaciada en concreto UHPC pigmentado en masa, con sellado hidrófugo mate y drenaje integrado.';

  const handleOrderWhatsApp = () => {
    const text = `Hola CRUDA, estoy interesado en adquirir/cotizar esta pieza del Estudio 3D:
• Modelo: ${activeModelTitle} (${activeModelCode})
• Acabado: ${activeFinishName} (${activeColor})
• Escala: ${selectedScale} (${SCALE_SPECS[selectedScale].dimensions})
• Precio estimado: $${computedPrice.toLocaleString('es-CO')} COP
¿Podrían confirmarme disponibilidad y tiempo de entrega?`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section
      id="visualizador-3d"
      className="py-20 sm:py-24 bg-[#F2F2F2] text-[#172A38] border-y border-[#E2E2DE]"
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 52%, #FFFFFF 0%, #F2F2F2 56%, #E8E8E4 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado limpio estilo vitrina de estudio */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#5C6B73] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#D95D24]" aria-hidden="true" />
            <span>Estudio 3D en Tiempo Real · Catálogo STL</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl text-[#172A38] tracking-tight">
            MATERAS <span className="font-light text-[#5C6B73]">Adaptadas a tu espacio</span>
          </h2>
        </div>

        {/* Composición en 3 columnas (Especificaciones | Visor 3D Flotante | Selector STL y Pigmentos) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          {/* COLUMNA IZQUIERDA: Ficha Técnica y Escala (3 cols) */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8C969E] block mb-1">
                {activeModelCode}
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-bold text-[#172A38] leading-tight">
                {activeModelTitle}
              </h3>
              <p className="mt-3 text-xs sm:text-sm text-[#4A555E] leading-relaxed font-light">
                {activeModelDescription}
              </p>
            </div>

            {/* Especificaciones apiladas estilo ficha industrial */}
            <div className="space-y-3 pt-4 border-t border-[#DCDCD6] text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[#6B7780] font-medium">Material</span>
                <span className="font-mono text-[#172A38] font-semibold">Concreto UHPC (&gt;65 MPa)</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[#6B7780] font-medium">Dimensiones</span>
                <span className="font-mono text-[#172A38] font-semibold">{SCALE_SPECS[selectedScale].dimensions}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[#6B7780] font-medium">Peso estimado</span>
                <span className="font-mono text-[#172A38] font-semibold">{SCALE_SPECS[selectedScale].weight}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[#6B7780] font-medium">Drenaje</span>
                <span className="font-mono text-[#172A38] font-semibold">Orificio + tapón goma</span>
              </div>
            </div>

            {/* Selector de Escala S / M / L */}
            <div className="pt-2">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-[#6B7780] mb-2">
                Escala de fabricación
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['S', 'M', 'L'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedScale(sz)}
                    className={`py-2 px-3 font-mono text-xs uppercase transition-all border ${
                      selectedScale === sz
                        ? 'border-[#172A38] bg-[#172A38] text-white font-bold shadow-sm'
                        : 'border-[#D4D4CE] bg-white/70 text-[#4A555E] hover:border-[#172A38]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Precio estimado */}
            <div className="pt-4 border-t border-[#DCDCD6]">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-[#6B7780]">
                Precio estimado
              </span>
              <div className="mt-1 font-serif text-3xl font-bold text-[#172A38]">
                ${computedPrice.toLocaleString('es-CO')}{' '}
                <span className="text-xs font-mono font-normal text-[#5C6B73]">COP</span>
              </div>
            </div>
          </div>

          {/* COLUMNA CENTRO: Visor 3D Flotante de Estudio (6 cols) */}
          <div className="lg:col-span-6 relative flex flex-col items-center order-1 lg:order-2">
            <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[520px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-grab active:cursor-grabbing"
              />

              {isLoadingStl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="px-4 py-2 bg-white/90 backdrop-blur border border-[#DCDCD6] font-mono text-[11px] uppercase tracking-widest text-[#172A38] shadow-sm">
                    Cargando geometría .STL…
                  </span>
                </div>
              )}

              {/* Controles flotantes minimalistas */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#DCDCD6] shadow-sm">
                <button
                  type="button"
                  onClick={() => setAutoRotate((prev) => !prev)}
                  title={autoRotate ? 'Pausar rotación' : 'Activar rotación 360°'}
                  className="p-1.5 rounded-full text-[#4A555E] hover:text-[#172A38] hover:bg-[#F2F2F2] transition-colors"
                  aria-label={autoRotate ? 'Pausar rotación' : 'Activar rotación 360°'}
                >
                  {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const camera = threeRef.current.camera;
                    const controls = threeRef.current.controls;
                    if (camera && controls) {
                      camera.position.set(0.32, 0.36, 0.78);
                      controls.target.set(0, 0.15, 0);
                      controls.update();
                    }
                  }}
                  title="Restablecer vista"
                  className="p-1.5 rounded-full text-[#4A555E] hover:text-[#172A38] hover:bg-[#F2F2F2] transition-colors"
                  aria-label="Restablecer posición de cámara"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <span className="h-3.5 w-px bg-[#DCDCD6]" aria-hidden="true" />

                <button
                  type="button"
                  onClick={startWebXR}
                  className="px-3 py-1 rounded-full bg-[#172A38] hover:bg-[#2C3B42] text-white font-mono text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3 h-3" aria-hidden="true" />
                  <span>Ver en AR</span>
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] text-[#7A848C] italic">
              *Arrastra 360° para inspeccionar el relieve. El poro y tono mineral pueden variar sutilmente en el vaciado artesanal.
            </p>
          </div>

          {/* COLUMNA DERECHA: Selector de Modelos .STL y Pigmentos (3 cols) */}
          <div className="lg:col-span-3 space-y-6 order-3">
            {/* 1. Selector de Modelos .STL subidos */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B7780] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#172A38]" />
                  Modelos .STL ({stlMateras.length})
                </span>
                <button
                  type="button"
                  onClick={onOpenAdminModal}
                  className="font-mono text-[10px] text-[#D95D24] hover:underline font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  Subir STL
                </button>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {stlMateras.map((m) => {
                  const isActive = labMode === 'stl-model' && selectedStlUrl === m.archivoUrl;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setUserPickedMode(true);
                        setLabMode('stl-model');
                        onSelectStlUrl(m.archivoUrl);
                      }}
                      className={`w-full text-left py-2 px-3 border-l-2 transition-all flex items-center justify-between gap-2 ${
                        isActive
                          ? 'border-[#172A38] bg-white shadow-sm text-[#172A38] font-semibold'
                          : 'border-transparent hover:border-[#B8C0C5] text-[#5C6B73] hover:text-[#172A38] hover:bg-white/50'
                      }`}
                    >
                      <span className="text-xs truncate">{m.nombre}</span>
                      <span className="font-mono text-[10px] text-[#8C969E] shrink-0">
                        ${Math.round(m.precio / 1000)}k
                      </span>
                    </button>
                  );
                })}

                {/* Formas base procedurales siempre disponibles */}
                {[
                  { id: 'procedural-cylinder' as const, label: 'Cilindro Puro (Base)' },
                  { id: 'procedural-octagon' as const, label: 'Prisma Octagonal (Base)' },
                  { id: 'procedural-cone' as const, label: 'Cono Truncado (Base)' },
                ].map((proc) => {
                  const isActive = labMode === proc.id;
                  return (
                    <button
                      key={proc.id}
                      type="button"
                      onClick={() => {
                        setUserPickedMode(true);
                        setLabMode(proc.id);
                      }}
                      className={`w-full text-left py-1.5 px-3 border-l-2 transition-all text-xs ${
                        isActive
                          ? 'border-[#172A38] bg-white shadow-sm text-[#172A38] font-semibold'
                          : 'border-transparent hover:border-[#B8C0C5] text-[#6B7780] hover:text-[#172A38] hover:bg-white/50'
                      }`}
                    >
                      {proc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Selector vertical de pigmentos estilo Patriot */}
            <div className="pt-4 border-t border-[#DCDCD6]">
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B7780] mb-3">
                Pigmento Mineral
              </span>

              <div className="space-y-1.5">
                {FINISH_COLORS.map((c) => {
                  const isSelected = activeColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveColor(c.hex);
                        setActiveFinishName(c.name);
                      }}
                      className="w-full flex items-center justify-between py-1.5 group text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-4 h-4 rounded-full border transition-transform ${
                            isSelected ? 'border-[#172A38] scale-110 ring-2 ring-[#172A38]/20' : 'border-[#C8C8C2]'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                        <span
                          className={`text-xs transition-colors ${
                            isSelected ? 'font-bold text-[#172A38]' : 'text-[#5C6B73] group-hover:text-[#172A38]'
                          }`}
                        >
                          {c.name}
                        </span>
                      </div>
                      {/* Línea indicadora horizontal estilo Patriot */}
                      <span
                        className={`h-[2px] transition-all ${
                          isSelected ? 'w-7 bg-[#172A38]' : 'w-0 bg-transparent group-hover:w-3 group-hover:bg-[#B8C0C5]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-[#E6E6E0]">
                <span className="font-mono text-[10px] uppercase text-[#6B7780]">Tono personalizado:</span>
                <input
                  type="color"
                  value={activeColor}
                  onChange={(e) => {
                    setActiveColor(e.target.value);
                    setActiveFinishName(`Tono Personalizado ${e.target.value.toUpperCase()}`);
                  }}
                  className="w-6 h-6 bg-transparent border border-[#C8C8C2] rounded cursor-pointer"
                  title="Elegir tono personalizado"
                />
              </div>
            </div>

            {arFeedback && (
              <div role="status" className="p-3 bg-white border border-[#172A38]/20 text-[11px] font-mono text-[#172A38]">
                {arFeedback}
              </div>
            )}

            {/* Botones de Acción */}
            <div className="pt-2 space-y-2">
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
                className="w-full py-3 px-4 bg-[#D95D24] hover:bg-[#BF4E1B] text-white font-mono text-[11px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>Añadir al Carrito</span>
              </button>

              <button
                type="button"
                onClick={handleOrderWhatsApp}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#172A38] text-[#172A38] hover:text-white border border-[#172A38] font-mono text-[11px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cotizar por WhatsApp</span>
              </button>
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
