import * as THREE from 'three';

export interface AROptions {
  container?: HTMLElement;
  onExit?: () => void;
  onError?: (errorMsg: string) => void;
}

export interface ARSession {
  stop: () => void;
}

/**
 * Solicita permiso para acceder a los sensores de orientación en iOS 13+.
 * Debe llamarse directamente dentro del evento de clic del usuario.
 */
export async function requestOrientationPermission(): Promise<boolean> {
  const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof DeviceOrientationEventAny?.requestPermission === 'function') {
    try {
      const state = await DeviceOrientationEventAny.requestPermission();
      return state === 'granted';
    } catch (err) {
      console.warn('Error al solicitar permiso de DeviceOrientation:', err);
      return false;
    }
  }

  return true;
}

/**
 * Inicializa la experiencia de Realidad Aumentada (AR) para CRUDA.
 * - Activa la cámara trasera en un <video> de fondo.
 * - Monta un WebGLRenderer transparente de Three.js.
 * - Renderiza un cilindro de concreto (modelo CR-001) fijo en el espacio a 1.5 metros.
 * - Utiliza sensores de orientación (deviceorientation) para mantener el objeto anclado al girar el dispositivo.
 */
export async function initAR(options: AROptions = {}): Promise<ARSession> {
  const { onExit, onError } = options;

  // 1. Crear el contenedor fullscreen de AR
  const root = document.createElement('div');
  root.id = 'cruda-ar-overlay';
  root.className = 'fixed inset-0 z-50 overflow-hidden bg-black flex flex-col items-center justify-between select-none';
  root.style.overscrollBehavior = 'contain';

  // 2. Elemento de Video para la cámara
  const video = document.createElement('video');
  video.setAttribute('playsinline', 'true');
  video.setAttribute('autoplay', 'true');
  video.setAttribute('muted', 'true');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.className = 'absolute inset-0 w-full h-full object-cover z-0 pointer-events-none';
  root.appendChild(video);

  // 3. Canvas de Three.js superpuesto
  const canvas = document.createElement('canvas');
  canvas.className = 'absolute inset-0 w-full h-full z-10';
  root.appendChild(canvas);

  // 4. Capa de interfaz de usuario con diseño CRUDA (Tailwind)
  const uiLayer = document.createElement('div');
  uiLayer.className = 'absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6';
  uiLayer.innerHTML = `
    <!-- Top Bar -->
    <div className="flex items-center justify-between w-full pointer-events-auto">
      <div className="flex items-center space-x-3 bg-black/70 backdrop-blur-md px-3.5 py-2 border border-white/20 text-white">
        <div className="w-5 h-5 border border-white flex items-center justify-center font-serif text-[10px] font-bold">C</div>
        <div>
          <span className="font-serif text-xs tracking-widest uppercase block font-semibold">CRUDA AR</span>
          <span className="font-mono text-[9px] text-[#B6A17E] uppercase block">Ref. CR-001 • Cilindro Puro</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button id="ar-recenter-btn" title="Centrar cilindro en tu vista" className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 text-[11px] font-mono uppercase tracking-wider backdrop-blur-md border border-white/20 transition-colors">
          Centrar
        </button>
        <button id="ar-exit-btn" className="bg-[#111313]/90 hover:bg-[#111313] text-white px-4 py-2 text-xs font-mono uppercase tracking-widest border border-white/30 backdrop-blur-md transition-all shadow-lg flex items-center space-x-1.5">
          <span>✕</span>
          <span>Salir</span>
        </button>
      </div>
    </div>

    <!-- Error/Warning Notification Banner (Hidden by default) -->
    <div id="ar-error-banner" className="hidden pointer-events-auto bg-red-950/90 border border-red-500/60 text-white p-4 max-w-md mx-auto backdrop-blur-md text-xs font-sans text-center shadow-2xl">
      <p id="ar-error-text" className="mb-3 font-light leading-relaxed"></p>
      <button id="ar-error-close-btn" className="bg-white text-black px-4 py-1.5 uppercase font-mono text-[10px] tracking-wider font-semibold">
        Regresar a la tienda
      </button>
    </div>

    <!-- Bottom Instructions Footer -->
    <div className="pointer-events-auto text-center max-w-lg mx-auto w-full">
      <div className="bg-black/75 backdrop-blur-md border border-white/15 px-4 py-3 text-white shadow-xl">
        <div className="flex items-center justify-center space-x-2 text-[11px] font-mono uppercase tracking-wider text-[#B6A17E] mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Cilindro Anclado a 1.5 Metros</span>
        </div>
        <p className="text-xs text-white/90 font-light leading-snug">
          Gira tu teléfono en 360° para inspeccionar la pieza en tu entorno real.
        </p>
        <p className="text-[10px] text-white/50 font-mono mt-1">
          (Orientación 3DOF: el objeto se mantiene en su posición angular al rotar)
        </p>
      </div>
    </div>
  `;
  root.appendChild(uiLayer);

  // Añadir al DOM
  const targetContainer = options.container || document.body;
  targetContainer.appendChild(root);

  // Manejador de errores en UI
  const showError = (msg: string) => {
    const banner = root.querySelector('#ar-error-banner');
    const text = root.querySelector('#ar-error-text');
    if (banner && text) {
      text.textContent = msg;
      banner.classList.remove('hidden');
    }
    if (onError) onError(msg);
  };

  // Variables de recursos para limpieza
  let stream: MediaStream | null = null;
  let animId: number | null = null;
  let isCleanedUp = false;

  // 5. Iniciar la Cámara
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    } else {
      const legacyGetUserMedia =
        (navigator as unknown as { getUserMedia?: Function }).getUserMedia ||
        (navigator as unknown as { webkitGetUserMedia?: Function }).webkitGetUserMedia ||
        (navigator as unknown as { mozGetUserMedia?: Function }).mozGetUserMedia;

      if (legacyGetUserMedia) {
        stream = await new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(
            navigator,
            { video: { facingMode: 'environment' } },
            resolve,
            reject
          );
        });
      } else {
        throw new Error('Tu navegador no cuenta con soporte para acceso a cámara (getUserMedia).');
      }
    }

    video.srcObject = stream;
    await video.play();
  } catch (err: unknown) {
    const error = err as Error;
    let message = 'No fue posible acceder a la cámara de tu dispositivo.';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      message = 'Permiso de cámara denegado. Para proyectar la matera en AR, habilita el permiso de cámara en los ajustes de tu navegador.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      message = 'No se detectó una cámara trasera disponible en este dispositivo.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      message = 'La cámara está ocupada por otra aplicación. Ciérrala e intenta de nuevo.';
    } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      message = 'La Realidad Aumentada requiere conexión HTTPS para que el navegador permita acceder a la cámara y a los sensores.';
    } else if (error.message) {
      message = error.message;
    }
    showError(message);
  }

  // 6. Configurar la Escena de Three.js con WebGLRenderer (alpha: true)
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // 7. Iluminación realista para concreto arquitectónico
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
  scene.add(ambientLight);

  // Luz solar directa (proyecta sombras y resalta la arista del cilindro)
  const sunLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
  sunLight.position.set(2, 4, 2);
  scene.add(sunLight);

  // Luz de rebote mineral fría
  const bounceLight = new THREE.DirectionalLight(0xd5dbdb, 0.8);
  bounceLight.position.set(-2, -1, -2);
  scene.add(bounceLight);

  // 8. Crear el Cilindro Fijo en el Espacio (Modelo CRUDA CR-001)
  // Ubicado a 1.5 metros al frente: x = 0, y = -0.35 (en el piso/mesa), z = -1.5
  const cylinderGroup = new THREE.Group();
  cylinderGroup.position.set(0, -0.35, -1.5);

  // Cuerpo cilíndrico de concreto (dimensiones a escala real: 34 cm diámetro, 42 cm altura)
  const cylinderGeometry = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 64);
  const concreteMaterial = new THREE.MeshStandardMaterial({
    color: 0x9e9e99, // Gris cemento natural CRUDA
    roughness: 0.88,
    metalness: 0.04,
  });
  const cylinderMesh = new THREE.Mesh(cylinderGeometry, concreteMaterial);
  cylinderGroup.add(cylinderMesh);

  // Bisel superior y cavidad interior de la matera
  const innerGeometry = new THREE.CylinderGeometry(0.145, 0.14, 0.08, 48);
  const soilMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1a17, // Tierra fértil profunda
    roughness: 0.95,
  });
  const soilMesh = new THREE.Mesh(innerGeometry, soilMaterial);
  soilMesh.position.y = 0.18;
  cylinderGroup.add(soilMesh);

  // Planta botánica escultórica (tallo y hojas minimalistas en verde oliva #596153)
  const plantGroup = new THREE.Group();
  plantGroup.position.y = 0.21;

  const stemGeo = new THREE.CylinderGeometry(0.008, 0.01, 0.25, 16);
  const plantMat = new THREE.MeshStandardMaterial({
    color: 0x47533f,
    roughness: 0.6,
  });
  const stem = new THREE.Mesh(stemGeo, plantMat);
  stem.position.y = 0.12;
  plantGroup.add(stem);

  // Hojas escultóricas tipo Ficus/Monstera
  for (let i = 0; i < 3; i++) {
    const leafGeo = new THREE.SphereGeometry(0.06, 16, 8);
    leafGeo.scale(1, 0.2, 2.2);
    const leaf = new THREE.Mesh(leafGeo, plantMat);
    const angle = (i * Math.PI * 2) / 3;
    leaf.position.set(Math.cos(angle) * 0.05, 0.18 + i * 0.04, Math.sin(angle) * 0.05);
    leaf.rotation.y = angle;
    leaf.rotation.x = 0.45;
    plantGroup.add(leaf);
  }
  cylinderGroup.add(plantGroup);

  // Sombra de contacto suave sobre el suelo real
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(17, 19, 19, 0.65)');
    grad.addColorStop(0.5, 'rgba(17, 19, 19, 0.25)');
    grad.addColorStop(1, 'rgba(17, 19, 19, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(0.55, 0.55);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.21;
  cylinderGroup.add(shadowMesh);

  scene.add(cylinderGroup);

  // 9. Sensores de Orientación del Dispositivo (deviceorientation)
  // Mantiene el cilindro fijo en el espacio real mientras la cámara rota.
  const zee = new THREE.Vector3(0, 0, 1);
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 alrededor del eje X

  let baseAzimuth: number | null = null;
  let currentOrientation = {
    alpha: 0,
    beta: 90, // Dispositivo sostenido verticalmente
    gamma: 0,
  };
  let hasReceivedSensorEvent = false;

  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha === null || event.beta === null) return;
    hasReceivedSensorEvent = true;

    // Al recibir la primera lectura, calibramos para que el cilindro quede al frente
    if (baseAzimuth === null) {
      baseAzimuth = event.alpha;
    }

    currentOrientation.alpha = event.alpha - baseAzimuth;
    currentOrientation.beta = event.beta;
    currentOrientation.gamma = event.gamma || 0;
  };

  // Solicitar permisos de sensor si es iOS
  const orientationGranted = await requestOrientationPermission();
  if (orientationGranted) {
    window.addEventListener('deviceorientation', handleDeviceOrientation, true);
  } else {
    showError(
      'Permiso de sensores de orientación denegado en iOS. La rotación espacial requiere acceso al acelerómetro/giroscopio.'
    );
  }

  // 10. Soporte táctil / ratón como alternativa o en navegadores de escritorio
  let isPointerDown = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let manualYaw = 0;
  let manualPitch = 0;

  const handlePointerDown = (e: MouseEvent | TouchEvent) => {
    isPointerDown = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointerX = clientX;
    lastPointerY = clientY;
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isPointerDown) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - lastPointerX;
    const deltaY = clientY - lastPointerY;
    lastPointerX = clientX;
    lastPointerY = clientY;

    manualYaw -= deltaX * 0.005;
    manualPitch -= deltaY * 0.005;
    manualPitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, manualPitch));
  };

  const handlePointerUp = () => {
    isPointerDown = false;
  };

  canvas.addEventListener('mousedown', handlePointerDown);
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', handlePointerDown, { passive: true });
  window.addEventListener('touchmove', handlePointerMove, { passive: true });
  window.addEventListener('touchend', handlePointerUp);

  // 11. Redimensionamiento Responsivo
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
  window.addEventListener('resize', handleResize);

  // 12. Botón "Centrar" (Recalibrar orientación frontal)
  const recenterBtn = root.querySelector('#ar-recenter-btn');
  recenterBtn?.addEventListener('click', () => {
    baseAzimuth = null; // Reinicia el acimut base en la siguiente lectura
    manualYaw = 0;
    manualPitch = 0;
  });

  // 13. Bucle de Renderizado con setAnimationLoop
  renderer.setAnimationLoop(() => {
    if (isCleanedUp) return;

    if (hasReceivedSensorEvent) {
      // Orientación del dispositivo (fórmula oficial Three.js DeviceOrientationControls)
      const screenOrientation =
        (window.screen.orientation && window.screen.orientation.angle) ||
        (window.orientation as number) ||
        0;

      const alphaRad = THREE.MathUtils.degToRad(currentOrientation.alpha);
      const betaRad = THREE.MathUtils.degToRad(currentOrientation.beta);
      const gammaRad = THREE.MathUtils.degToRad(currentOrientation.gamma);
      const orientRad = THREE.MathUtils.degToRad(screenOrientation);

      euler.set(betaRad, alphaRad, -gammaRad, 'YXZ');
      camera.quaternion.setFromEuler(euler);
      camera.quaternion.multiply(q1);
      camera.quaternion.multiply(q0.setFromAxisAngle(zee, -orientRad));
    } else {
      // Modo manual con ratón/táctil para pruebas o dispositivos sin giroscopio
      euler.set(manualPitch, manualYaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(euler);
    }

    renderer.render(scene, camera);
  });

  // 14. Función de Parada y Limpieza Completa ("Salir")
  const stop = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    // Detener la cámara
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    video.srcObject = null;

    // Detener bucle de Three.js y liberar memoria WebGL
    renderer.setAnimationLoop(null);
    if (animId !== null) cancelAnimationFrame(animId);

    window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handlePointerMove);
    window.removeEventListener('mouseup', handlePointerUp);
    window.removeEventListener('touchmove', handlePointerMove);
    window.removeEventListener('touchend', handlePointerUp);

    // Liberar geometrías y materiales
    cylinderGeometry.dispose();
    concreteMaterial.dispose();
    innerGeometry.dispose();
    soilMaterial.dispose();
    stemGeo.dispose();
    plantMat.dispose();
    shadowGeo.dispose();
    shadowMat.dispose();
    shadowTexture.dispose();
    renderer.dispose();

    // Remover del DOM
    if (root.parentElement) {
      root.parentElement.removeChild(root);
    }

    if (onExit) onExit();
  };

  // Botón Salir y botón cerrar error
  const exitBtn = root.querySelector('#ar-exit-btn');
  exitBtn?.addEventListener('click', stop);

  const errorCloseBtn = root.querySelector('#ar-error-close-btn');
  errorCloseBtn?.addEventListener('click', stop);

  return { stop };
}

