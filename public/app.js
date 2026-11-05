/**
 * ============================================================================
 * CRUDA — STL & WebXR Immersive AR Viewer
 * ============================================================================
 * Flujo:
 * 1. Inicialización de Three.js con soporte WebXR habilitado.
 * 2. Carga y previsualización 3D interactiva del modelo STL con MeshStandardMaterial.
 * 3. Selector de color reactivo en tiempo real sobre el material.
 * 4. Sesión Immersive-AR (WebXR) con Hit-Test y XRAnchor:
 *    - Detección de planos/superficies con retícula visual (Reticle).
 *    - Anclaje exacto mediante XRAnchor API (o fallback de transformación fija).
 *    - Botón de salida para restaurar la vista 3D estándar.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

// --- Estado Global de la Aplicación ---
const state = {
  selectedModelUrl: '',
  currentColor: '#9e9e99',
  loadedGeometry: null,
  currentMesh: null,
  isARMode: false
};

// --- Referencias a Elementos del DOM ---
const container = document.getElementById('canvas-container');
const stlSelect = document.getElementById('stl-select');
const colorPicker = document.getElementById('color-picker');
const startArBtn = document.getElementById('start-ar-btn');
const exitArBtn = document.getElementById('exit-ar-btn');
const arOverlay = document.getElementById('ar-overlay');
const arGuideText = document.getElementById('ar-guide-text');
const toggleAdminBtn = document.getElementById('toggle-admin-btn');
const closeAdminBtn = document.getElementById('close-admin-btn');
const adminPanel = document.getElementById('admin-panel');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');

// --- Variables de Three.js y WebXR ---
let renderer, scene, camera, controls;
let previewGroup, arGroup;
let reticle;
let hitTestSource = null;
let hitTestSourceRequested = false;
let xrSession = null;
let placedAnchor = null; // Referencia al objeto o ancla fijada

/**
 * Inicialización de la escena Three.js
 */
function init() {
  // 1. Escena
  scene = new THREE.Scene();

  // 2. Cámara (PerspectiveCamera estándar)
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 20);
  camera.position.set(0, 0.4, 0.8);

  // 3. Renderer con soporte WebXR habilitado
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true; // Activa las capacidades WebXR
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // 4. Controles orbitales para el modo Preview
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);

  // 5. Iluminación realista para MeshStandardMaterial
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
  dirLight.position.set(2, 4, 2);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xd5dbdb, 0.8);
  fillLight.position.set(-2, -1, -2);
  scene.add(fillLight);

  // 6. Grupos para separar el modo Vista Previa y el modo AR
  previewGroup = new THREE.Group();
  scene.add(previewGroup);

  arGroup = new THREE.Group();
  scene.add(arGroup);

  // 7. Retícula (Reticle) para Hit-Test en AR
  initReticle();

  // 8. Eventos de interacción y redimensionamiento
  window.addEventListener('resize', onWindowResize);
  setupEvents();

  // 9. Comprobar soporte WebXR Immersive-AR
  checkXRSupport();

  // 10. Cargar lista de modelos STL desde la API
  fetchModels();

  // 11. Bucle de renderizado continuo (compatible con WebXR y modo normal)
  renderer.setAnimationLoop(render);
}

/**
 * Construye la retícula visual utilizada en AR para indicar la superficie detectada
 */
function initReticle() {
  const geometry = new THREE.RingGeometry(0.1, 0.12, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0xb6a17e,
    side: THREE.DoubleSide
  });
  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);
}

/**
 * Carga de modelos STL usando STLLoader
 */
const stlLoader = new STLLoader();

function loadSTL(url) {
  if (!url) return;

  startArBtn.disabled = true;
  startArBtn.textContent = 'Cargando...';

  stlLoader.load(
    url,
    (geometry) => {
      // Normalizar normales y centrar geometría
      geometry.computeVertexNormals();
      geometry.center();

      // Calcular caja delimitadora para escalar a tamaño adecuado (~25 cm de altura)
      const box = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 0.25; // 25 cm en escala métrica de Three.js / WebXR
      const scaleFactor = targetSize / (maxDim || 1);
      geometry.scale(scaleFactor, scaleFactor, scaleFactor);

      // Desplazar pivote a la base de la matera para que repose en el suelo
      geometry.computeBoundingBox();
      const minY = geometry.boundingBox.min.y;
      geometry.translate(0, -minY, 0);

      state.loadedGeometry = geometry;
      updatePreviewModel();

      startArBtn.disabled = false;
      startArBtn.textContent = 'Ver en AR';
    },
    undefined,
    (error) => {
      console.error('Error al cargar archivo STL:', error);
      alert('No se pudo cargar el archivo STL seleccionado.');
      startArBtn.textContent = 'Error al cargar';
    }
  );
}

/**
 * Actualiza el modelo mostrado en el visor de vista previa
 */
function updatePreviewModel() {
  // Limpiar modelo previo
  while (previewGroup.children.length > 0) {
    const obj = previewGroup.children[0];
    previewGroup.remove(obj);
  }

  if (!state.loadedGeometry) return;

  // Crear MeshStandardMaterial con el color seleccionado
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(state.currentColor),
    roughness: 0.85,
    metalness: 0.05
  });

  state.currentMesh = new THREE.Mesh(state.loadedGeometry, material);
  previewGroup.add(state.currentMesh);

  // Centrar y posicionar en la vista orbital
  previewGroup.position.set(0, -0.1, 0);
  previewGroup.visible = !state.isARMode;
}

/**
 * Actualiza el color en tiempo real sin recargar la geometría
 */
function updateColor(colorHex) {
  state.currentColor = colorHex;
  if (state.currentMesh && state.currentMesh.material) {
    state.currentMesh.material.color.set(colorHex);
  }
}

/**
 * ============================================================================
 * FLUJO WEBXR: IMMERSIVE-AR, HIT-TEST Y ANCLAJE (XRANCHOR)
 * ============================================================================
 */

/**
 * Verifica si el dispositivo y navegador soportan sesiones 'immersive-ar'
 */
async function checkXRSupport() {
  if ('xr' in navigator && navigator.xr.isSessionSupported) {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    if (!supported) {
      startArBtn.title = 'WebXR Immersive-AR no está soportado en este dispositivo/navegador.';
    }
  } else {
    startArBtn.title = 'Navegador sin API WebXR. Requiere navegador compatible con WebXR (ej. Chrome en Android con ARCore).';
  }
}

/**
 * Inicia la sesión WebXR Immersive-AR
 */
async function startAR() {
  if (!navigator.xr) {
    alert('Tu navegador no cuenta con la API WebXR. Asegúrate de usar Chrome en un dispositivo compatible con ARCore y conexión HTTPS.');
    return;
  }

  try {
    // Solicitamos la sesión con funciones 'hit-test' y 'anchors' opcionales
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['anchors', 'local-floor', 'dom-overlay'],
      domOverlay: { root: arOverlay }
    });

    xrSession = session;
    renderer.xr.setReferenceSpaceType('local');
    await renderer.xr.setSession(session);

    // Ajustar visibilidad
    state.isARMode = true;
    previewGroup.visible = false;
    arGroup.visible = true;
    arOverlay.classList.remove('hidden');
    reticle.visible = false;
    placedAnchor = null;

    // Limpiar objetos previamente colocados en AR
    while (arGroup.children.length > 0) {
      arGroup.remove(arGroup.children[0]);
    }

    // Configurar Hit-Test y Controlador de Toque (select)
    setupXRHitTest(session);

    session.addEventListener('end', onAREnd);
  } catch (error) {
    console.error('Error al iniciar sesión WebXR:', error);
    alert('No se pudo iniciar la sesión AR: ' + error.message);
  }
}

/**
 * Configura la fuente de Hit-Test para detectar planos/superficies en el mundo real
 */
async function setupXRHitTest(session) {
  const viewerSpace = await session.requestReferenceSpace('viewer');
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  // Evento al tocar la pantalla (colocación y anclaje)
  session.addEventListener('select', onScreenTouch);
}

/**
 * Evento al tocar la pantalla en AR:
 * Coloca y ancla el modelo STL (con su color) exactamente en la posición de la retícula
 */
async function onScreenTouch(event) {
  if (!reticle.visible || !state.loadedGeometry) return;

  const frame = event.frame;
  const referenceSpace = renderer.xr.getReferenceSpace();

  // 1. Crear nuevo Mesh con el modelo y el color actual
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(state.currentColor),
    roughness: 0.85,
    metalness: 0.05
  });
  const model = new THREE.Mesh(state.loadedGeometry, material);

  // 2. Extraer la posición/orientación desde la matriz de la retícula
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  reticle.matrix.decompose(position, quaternion, scale);

  model.position.copy(position);
  // Mantener orientación vertical nivelada
  model.quaternion.copy(quaternion);

  // 3. Uso de XRAnchor (si está disponible en el navegador / WebXR Anchor API)
  if (frame && 'createAnchor' in frame) {
    try {
      const transform = new XRRigidTransform(
        { x: position.x, y: position.y, z: position.z },
        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
      );
      const anchor = await frame.createAnchor(transform, referenceSpace);
      model.userData.anchor = anchor;
      console.log('Modelo fijado con XRAnchor oficial');
    } catch (err) {
      console.warn('createAnchor falló, usando anclaje de posición fija:', err);
    }
  }

  // 4. Si ya existía un modelo, lo reemplazamos o agregamos
  arGroup.clear();
  arGroup.add(model);
  placedAnchor = model;

  // Desactivar retícula una vez colocado
  reticle.visible = false;
  arGuideText.textContent = 'Matera fijada en el espacio. Toca de nuevo para reubicarla.';
}

/**
 * Finalizar la sesión AR y restaurar vista 3D estándar
 */
function exitAR() {
  if (xrSession) {
    xrSession.end();
  }
}

function onAREnd() {
  state.isARMode = false;
  xrSession = null;
  hitTestSource = null;
  hitTestSourceRequested = false;

  arOverlay.classList.add('hidden');
  reticle.visible = false;
  arGroup.visible = false;
  previewGroup.visible = true;

  arGuideText.textContent = 'Apunta al suelo para detectar superficies y toca para anclar';
}

/**
 * Bucle de Renderizado Principal
 * Actualiza OrbitControls en Preview y el Hit-Test / XRAnchors en AR
 */
function render(timestamp, frame) {
  if (state.isARMode && frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    // 1. Procesamiento de Hit-Test en cada fotograma
    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);

        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else {
        reticle.visible = false;
      }
    }

    // 2. Si hay anclas XR activas, actualizar la posición del modelo con respecto al tracking del mundo
    if (placedAnchor && placedAnchor.userData.anchor) {
      const anchorPose = frame.getPose(placedAnchor.userData.anchor.anchorSpace, referenceSpace);
      if (anchorPose) {
        placedAnchor.matrix.fromArray(anchorPose.transform.matrix);
      }
    }
  } else {
    // Modo 3D estándar: actualizar controles de cámara y rotación suave
    controls.update();
  }

  renderer.render(scene, camera);
}

/**
 * Redimensionamiento de ventana
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * ============================================================================
 * GESTIÓN DE MODELOS Y PANEL DE ADMINISTRACIÓN
 * ============================================================================
 */

/**
 * Obtener lista de modelos guardados en el servidor
 */
async function fetchModels() {
  try {
    const res = await fetch('/api/materas');
    if (!res.ok) throw new Error('Error al consultar /api/materas');
    const data = await res.json();

    stlSelect.innerHTML = '';
    if (data.length === 0) {
      stlSelect.innerHTML = '<option value="">Sin modelos (sube uno en Admin)</option>';
      startArBtn.disabled = true;
      return;
    }

    data.forEach((matera, index) => {
      const opt = document.createElement('option');
      opt.value = matera.archivoUrl;
      opt.textContent = matera.nombre;
      stlSelect.appendChild(opt);

      if (index === 0) {
        state.selectedModelUrl = matera.archivoUrl;
      }
    });

    // Cargar el primer modelo
    if (state.selectedModelUrl) {
      loadSTL(state.selectedModelUrl);
    }
  } catch (err) {
    console.warn('API no disponible o error de red:', err);
    stlSelect.innerHTML = '<option value="">No se pudo conectar con el servidor</option>';
  }
}

/**
 * Configuración de eventos de UI
 */
function setupEvents() {
  // Cambio de modelo en el select
  stlSelect.addEventListener('change', (e) => {
    state.selectedModelUrl = e.target.value;
    if (state.selectedModelUrl) {
      loadSTL(state.selectedModelUrl);
    }
  });

  // Color picker en tiempo real
  colorPicker.addEventListener('input', (e) => {
    updateColor(e.target.value);
  });

  // Botón iniciar AR
  startArBtn.addEventListener('click', startAR);

  // Botón salir de AR
  exitArBtn.addEventListener('click', exitAR);

  // Toggle de panel admin
  toggleAdminBtn.addEventListener('click', () => {
    adminPanel.classList.toggle('hidden');
    uploadStatus.textContent = '';
  });

  closeAdminBtn.addEventListener('click', () => {
    adminPanel.classList.add('hidden');
  });

  // Envío del formulario de subida de STL
  uploadForm.addEventListener('submit', handleUpload);
}

/**
 * Subida de archivo STL al servidor mediante POST /api/materas con autenticación
 */
async function handleUpload(e) {
  e.preventDefault();

  const password = document.getElementById('admin-password').value;
  const modelName = document.getElementById('model-name').value;
  const fileInput = document.getElementById('stl-file');
  const file = fileInput.files[0];

  if (!file) {
    uploadStatus.textContent = 'Selecciona un archivo .stl';
    uploadStatus.className = 'status-msg error';
    return;
  }

  uploadStatus.textContent = 'Autenticando y subiendo archivo...';
  uploadStatus.className = 'status-msg';

  try {
    // 1. Login para obtener token JWT
    const loginRes = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(loginData.error || 'Contraseña incorrecta');
    }

    const token = loginData.token;

    // 2. Subida multipart con Multer
    const formData = new FormData();
    formData.append('stl', file);
    formData.append('nombre', modelName);
    formData.append('precio', '0'); // Precio opcional/default

    const uploadRes = await fetch('/api/materas', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.error || 'Error al subir STL');
    }

    uploadStatus.textContent = `¡Modelo "${modelName}" subido exitosamente!`;
    uploadStatus.className = 'status-msg success';
    uploadForm.reset();

    // Actualizar lista desplegable
    await fetchModels();

    // Cerrar panel tras 1.5s
    setTimeout(() => {
      adminPanel.classList.add('hidden');
      uploadStatus.textContent = '';
    }, 1500);
  } catch (err) {
    uploadStatus.textContent = err.message;
    uploadStatus.className = 'status-msg error';
  }
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', init);
