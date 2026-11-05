import React from 'react';
import { StlViewer } from './StlViewer';

interface Props {
  geometryType: 'cylinder' | 'octagon' | 'cone' | 'organic' | 'monolith' | 'vessel' | 'stl';
  colorHex?: string;
  stlUrl?: string;
  referenceCode?: string;
  dimensionsLabel?: string;
  showTechnicalLines?: boolean;
  className?: string;
}

export const ArchitecturalRender: React.FC<Props> = ({
  geometryType,
  colorHex = '#A7A7A2',
  stlUrl,
  referenceCode = 'CR-001',
  dimensionsLabel = 'Ø 28 × H 32 cm',
  showTechnicalLines = true,
  className = '',
}) => {
  if (geometryType === 'stl' && stlUrl) {
    return (
      <div className={`relative w-full h-full bg-[#161818] overflow-hidden ${className}`}>
        <div className="absolute inset-0 arch-grid-lines opacity-20 pointer-events-none" />
        <StlViewer url={stlUrl} color={colorHex} className="w-full h-full" />
        <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#111313]/85 border border-[#B6A17E]/50 text-[#B6A17E] font-mono text-[10px] tracking-widest uppercase">
            3D STL INTERACTIVO
          </span>
        </div>
        {showTechnicalLines && (
          <div className="absolute bottom-3 right-3 pointer-events-none font-mono text-[10px] text-[#A7A7A2] bg-[#111313]/80 px-2 py-0.5 border border-[#292B2B]">
            Arrastra para rotar 360°
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#EAE8E1] via-[#E2DFD7] to-[#D5CFC2] select-none ${className}`}
    >
      {/* Architectural Grid Overlay */}
      <div className="absolute inset-0 arch-grid-lines opacity-55 pointer-events-none" />

      {/* Dramatic Diagonal Sunbeam Shadow */}
      <div
        className="absolute -right-12 -bottom-12 w-3/4 h-3/4 bg-gradient-to-tl from-[#111313]/15 via-[#111313]/5 to-transparent transform -skew-x-12 pointer-events-none"
        aria-hidden="true"
      />

      {/* Technical Corner Coordinates */}
      {showTechnicalLines && (
        <>
          <div className="absolute top-3 left-3 font-mono text-[10px] tracking-widest uppercase text-[#292B2B]/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#B6A17E] inline-block" />
            <span>{referenceCode} · UHPC</span>
          </div>
          <div className="absolute bottom-3 left-3 font-mono text-[10px] tracking-wider text-[#292B2B]/65">
            {dimensionsLabel}
          </div>
          <div className="absolute top-3 right-3 font-mono text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-[#292B2B]/20 text-[#292B2B]/70 bg-[#F1F0EB]/60">
            ESCALA 1:5
          </div>
        </>
      )}

      {/* Bespoke Brutalist Architectural SVG Render */}
      <svg
        viewBox="0 0 320 320"
        className="w-4/5 h-4/5 max-w-[260px] max-h-[260px] drop-shadow-[0_24px_28px_rgba(17,19,19,0.22)] transition-transform duration-500 group-hover:scale-105"
        role="img"
        aria-label={`Representación arquitectónica de ${referenceCode}`}
      >
        <defs>
          <linearGradient id={`bodyGrad-${referenceCode}`} x1="0%" y1="0%" x2="100%" y2="20%">
            <stop offset="0%" stopColor={colorHex} stopOpacity="1" />
            <stop offset="55%" stopColor={colorHex} stopOpacity="0.88" />
            <stop offset="100%" stopColor="#1D1F1F" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`rimGrad-${referenceCode}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#111313" stopOpacity="0.45" />
            <stop offset="100%" stopColor={colorHex} stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id={`floorShadow-${referenceCode}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#111313" stopOpacity="0.38" />
            <stop offset="70%" stopColor="#111313" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#111313" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground Contact Shadow */}
        <ellipse cx="165" cy="264" rx="88" ry="18" fill={`url(#floorShadow-${referenceCode})`} />

        {/* Subtle Botanical Architectural Silhouette */}
        <g opacity="0.85">
          <path
            d="M160 95 C155 60, 125 38, 108 32 C122 52, 138 72, 152 96 Z"
            fill="#596153"
          />
          <path
            d="M162 92 C168 52, 198 30, 216 26 C204 50, 184 72, 166 95 Z"
            fill="#434A3E"
          />
          <path
            d="M158 96 C158 64, 160 35, 160 18 C165 42, 165 68, 162 96 Z"
            fill="#687161"
          />
        </g>

        {geometryType === 'cylinder' && (
          <g>
            {/* Main Cylinder Body */}
            <path
              d="M86 104 L96 92 L224 92 L234 104 L230 250 C230 260, 198 266, 160 266 C122 266, 90 260, 90 250 Z"
              fill={`url(#bodyGrad-${referenceCode})`}
              stroke="#111313"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            {/* 45 degree Chamfer Bevel */}
            <ellipse cx="160" cy="96" rx="68" ry="15" fill={colorHex} stroke="#111313" strokeWidth="0.8" strokeOpacity="0.3" />
            <ellipse cx="160" cy="96" rx="54" ry="10.5" fill={`url(#rimGrad-${referenceCode})`} />
            {/* Shadow Plinth Gap */}
            <path d="M102 256 C128 263, 192 263, 218 256" stroke="#111313" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
          </g>
        )}

        {geometryType === 'octagon' && (
          <g>
            {/* Left Facet (Light) */}
            <polygon points="82,102 122,114 126,256 90,242" fill={colorHex} stroke="#111313" strokeWidth="0.8" strokeOpacity="0.25" />
            {/* Center Facet (Mid) */}
            <polygon points="122,114 198,114 194,256 126,256" fill={`url(#bodyGrad-${referenceCode})`} stroke="#111313" strokeWidth="0.8" strokeOpacity="0.25" />
            {/* Right Facet (Shadow) */}
            <polygon points="198,114 238,102 230,242 194,256" fill="#292B2B" fillOpacity="0.68" stroke="#111313" strokeWidth="0.8" strokeOpacity="0.3" />
            {/* Octagonal Rim */}
            <polygon points="82,102 118,86 202,86 238,102 198,114 122,114" fill={colorHex} stroke="#111313" strokeWidth="1" strokeOpacity="0.35" />
            <polygon points="98,101 124,90 196,90 222,101 192,109 128,109" fill="#181A1A" fillOpacity="0.55" />
          </g>
        )}

        {geometryType === 'cone' && (
          <g>
            {/* Inverted Truncated Cone */}
            <path
              d="M72 98 L248 98 L206 256 C206 262, 185 266, 160 266 C135 266, 114 262, 114 256 Z"
              fill={`url(#bodyGrad-${referenceCode})`}
              stroke="#111313"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            {/* Terrazzo Mineral Specks */}
            <circle cx="125" cy="145" r="3.5" fill="#F1F0EB" opacity="0.7" />
            <polygon points="170,135 178,138 174,145" fill="#292B2B" opacity="0.55" />
            <circle cx="148" cy="190" r="4" fill="#B6A17E" opacity="0.65" />
            <polygon points="188,180 196,184 190,192" fill="#F1F0EB" opacity="0.6" />
            <circle cx="138" cy="222" r="2.8" fill="#292B2B" opacity="0.5" />
            <circle cx="176" cy="218" r="3.2" fill="#D5C8B5" opacity="0.75" />
            <ellipse cx="160" cy="98" rx="88" ry="16" fill={colorHex} stroke="#111313" strokeWidth="0.9" strokeOpacity="0.3" />
            <ellipse cx="160" cy="98" rx="74" ry="11.5" fill={`url(#rimGrad-${referenceCode})`} />
          </g>
        )}

        {geometryType === 'organic' && (
          <g>
            {/* Biomorphic Ribbed Vessel */}
            <path
              d="M96 98 C70 148, 74 218, 112 256 C132 264, 188 264, 208 256 C246 218, 250 148, 224 98 Z"
              fill={`url(#bodyGrad-${referenceCode})`}
              stroke="#111313"
              strokeWidth="1"
              strokeOpacity="0.22"
            />
            {/* Vertical Architectural Flutes */}
            <path d="M120 104 C102 155, 105 215, 128 256" stroke="#111313" strokeOpacity="0.18" strokeWidth="1.5" fill="none" />
            <path d="M145 106 C136 155, 138 215, 146 258" stroke="#111313" strokeOpacity="0.18" strokeWidth="1.5" fill="none" />
            <path d="M175 106 C184 155, 182 215, 174 258" stroke="#111313" strokeOpacity="0.22" strokeWidth="1.5" fill="none" />
            <path d="M200 104 C218 155, 215 215, 192 256" stroke="#111313" strokeOpacity="0.25" strokeWidth="1.5" fill="none" />
            <ellipse cx="160" cy="98" rx="64" ry="13" fill={colorHex} />
            <ellipse cx="160" cy="98" rx="50" ry="9" fill={`url(#rimGrad-${referenceCode})`} />
          </g>
        )}

        {geometryType === 'monolith' && (
          <g>
            {/* Isometric Linear Trough Monolith */}
            <polygon points="44,136 226,112 226,236 44,260" fill={`url(#bodyGrad-${referenceCode})`} stroke="#111313" strokeWidth="1" strokeOpacity="0.28" />
            <polygon points="226,112 278,134 278,254 226,236" fill="#181A1A" fillOpacity="0.58" stroke="#111313" strokeWidth="1" strokeOpacity="0.28" />
            <polygon points="44,136 98,114 278,134 226,112" fill={colorHex} stroke="#111313" strokeWidth="1" strokeOpacity="0.28" />
            <polygon points="62,134 102,118 260,134 220,118" fill="#111313" fillOpacity="0.45" />
          </g>
        )}

        {geometryType === 'vessel' && (
          <g>
            {/* Brutalist Plinth Base */}
            <polygon points="112,216 208,216 216,258 104,258" fill="#292B2B" fillOpacity="0.85" />
            {/* Upper Sculptural Chalice */}
            <path
              d="M78 96 L242 96 C242 168, 212 216, 160 216 C108 216, 78 168, 78 96 Z"
              fill={`url(#bodyGrad-${referenceCode})`}
              stroke="#111313"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            <ellipse cx="160" cy="96" rx="82" ry="14" fill={colorHex} />
            <ellipse cx="160" cy="96" rx="68" ry="10" fill={`url(#rimGrad-${referenceCode})`} />
          </g>
        )}

        {/* Dimension Callout Line */}
        {showTechnicalLines && (
          <g opacity="0.45">
            <line x1="258" y1="94" x2="258" y2="258" stroke="#111313" strokeWidth="0.75" strokeDasharray="3 3" />
            <line x1="253" y1="94" x2="263" y2="94" stroke="#111313" strokeWidth="0.75" />
            <line x1="253" y1="258" x2="263" y2="258" stroke="#111313" strokeWidth="0.75" />
          </g>
        )}
      </svg>
    </div>
  );
};

