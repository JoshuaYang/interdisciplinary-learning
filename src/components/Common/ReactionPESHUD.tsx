import React, { useMemo, useRef, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export interface ReactionPESHUDProps {
  progress: number; // 0 to 1
  onSeek?: (prog: number) => void;
  stageName?: string;
  eaKj?: number; // Activation energy (kJ/mol), e.g. 58
  deltaHKj?: number; // Reaction enthalpy (kJ/mol), e.g. -75 (exothermic)
  className?: string;
}

export const ReactionPESHUD: React.FC<ReactionPESHUDProps> = ({
  progress,
  onSeek,
  stageName = 'Reaction Stage',
  eaKj = 64,
  deltaHKj = -52,
  className = '',
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // SVG Coordinate Box dimensions
  const W = 240;
  const H = 100;
  const padX = 24;
  const padY = 20;

  // Reactant, TS, Product Coordinates
  // Lower y in SVG means higher energy
  const yReact = H - 36;
  const yTS = padY + 4;
  const yProd = deltaHKj <= 0 ? H - 22 : H - 52; // Exothermic vs Endothermic
  const xReact = padX;
  const xTS = W / 2;
  const xProd = W - padX;

  // Cubic Bezier curve paths:
  // Segment 1: Reactant (xReact, yReact) -> TS (xTS, yTS)
  // Segment 2: TS (xTS, yTS) -> Product (xProd, yProd)
  const pathD = useMemo(() => {
    const cp1x = xReact + (xTS - xReact) * 0.55;
    const cp1y = yReact;
    const cp2x = xTS - (xTS - xReact) * 0.45;
    const cp2y = yTS;

    const cp3x = xTS + (xProd - xTS) * 0.45;
    const cp3y = yTS;
    const cp4x = xProd - (xProd - xTS) * 0.55;
    const cp4y = yProd;

    return `M ${xReact - 12} ${yReact} L ${xReact} ${yReact} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${xTS} ${yTS} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${xProd} ${yProd} L ${xProd + 12} ${yProd}`;
  }, [xReact, yReact, xTS, yTS, xProd, yProd]);

  // Interpolate ball coordinates on the PES curve based on current progress (0 to 1)
  const ballPos = useMemo(() => {
    const t = Math.max(0, Math.min(1, progress));
    if (t <= 0.5) {
      // First half: Reactant to TS
      const u = t * 2; // 0 -> 1
      const cp1x = xReact + (xTS - xReact) * 0.55;
      const cp1y = yReact;
      const cp2x = xTS - (xTS - xReact) * 0.45;
      const cp2y = yTS;

      const p0x = xReact;
      const p0y = yReact;
      const p1x = cp1x;
      const p1y = cp1y;
      const p2x = cp2x;
      const p2y = cp2y;
      const p3x = xTS;
      const p3y = yTS;

      const oneMinusU = 1 - u;
      const bx =
        Math.pow(oneMinusU, 3) * p0x +
        3 * Math.pow(oneMinusU, 2) * u * p1x +
        3 * oneMinusU * Math.pow(u, 2) * p2x +
        Math.pow(u, 3) * p3x;
      const by =
        Math.pow(oneMinusU, 3) * p0y +
        3 * Math.pow(oneMinusU, 2) * u * p1y +
        3 * oneMinusU * Math.pow(u, 2) * p2y +
        Math.pow(u, 3) * p3y;
      return { x: bx, y: by };
    } else {
      // Second half: TS to Product
      const u = (t - 0.5) * 2; // 0 -> 1
      const cp3x = xTS + (xProd - xTS) * 0.45;
      const cp3y = yTS;
      const cp4x = xProd - (xProd - xTS) * 0.55;
      const cp4y = yProd;

      const p0x = xTS;
      const p0y = yTS;
      const p1x = cp3x;
      const p1y = cp3y;
      const p2x = cp4x;
      const p2y = cp4y;
      const p3x = xProd;
      const p3y = yProd;

      const oneMinusU = 1 - u;
      const bx =
        Math.pow(oneMinusU, 3) * p0x +
        3 * Math.pow(oneMinusU, 2) * u * p1x +
        3 * oneMinusU * Math.pow(u, 2) * p2x +
        Math.pow(u, 3) * p3x;
      const by =
        Math.pow(oneMinusU, 3) * p0y +
        3 * Math.pow(oneMinusU, 2) * u * p1y +
        3 * oneMinusU * Math.pow(u, 2) * p2y +
        Math.pow(u, 3) * p3y;
      return { x: bx, y: by };
    }
  }, [progress, xReact, yReact, xTS, yTS, xProd, yProd]);

  // Is transition state peak active?
  const isTransitionPeak = progress >= 0.44 && progress <= 0.56;

  // Handle click / scrub on the PES curve to seek 3D animation
  const handleSeekEvent = (clientX: number) => {
    if (!svgRef.current || !onSeek) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const norm = Math.max(0, Math.min(1, (clickX - xReact) / (xProd - xReact)));
    onSeek(norm);
  };

  return (
    <div className={`pes-hud-card ${collapsed ? 'is-collapsed' : ''} ${className}`}>
      {/* Header bar */}
      <div className="pes-hud-header">
        <div className="pes-hud-title-wrap">
          <Activity size={14} className="pes-hud-icon" />
          <span className="pes-hud-title">Potential Energy Surface (PES)</span>
        </div>
        <button
          type="button"
          className="pes-hud-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand PES HUD' : 'Collapse PES HUD'}
          aria-label={collapsed ? 'Expand PES HUD' : 'Collapse PES HUD'}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {!collapsed && (
        <div className="pes-hud-body">
          {/* Energy metrics bar */}
          <div className="pes-hud-metrics">
            <span className="pes-metric-item">
              <strong className="pes-metric-label">Ea:</strong>
              <span className="pes-metric-val mono">{eaKj} kJ/mol</span>
            </span>
            <span className="pes-metric-divider">·</span>
            <span className="pes-metric-item">
              <strong className="pes-metric-label">ΔH:</strong>
              <span className="pes-metric-val mono">{deltaHKj > 0 ? `+${deltaHKj}` : deltaHKj} kJ/mol</span>
            </span>
            {isTransitionPeak && (
              <span className="pes-ts-badge">
                <Zap size={11} />
                <span>[TS]‡ Activated</span>
              </span>
            )}
          </div>

          {/* Interactive SVG Curve */}
          <div
            className="pes-svg-wrap"
            onPointerDown={(e) => {
              isDraggingRef.current = true;
              handleSeekEvent(e.clientX);
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (isDraggingRef.current) {
                handleSeekEvent(e.clientX);
              }
            }}
            onPointerUp={(e) => {
              isDraggingRef.current = false;
              try {
                (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              } catch {}
            }}
            title="Click or drag along the curve to seek reaction step"
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="pes-svg-canvas"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="pesCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <filter id="pesGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Baseline Reference Grid */}
              <line
                x1={xReact - 10}
                y1={yReact}
                x2={xProd + 10}
                y2={yReact}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Energy Curve */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#pesCurveGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* State Labels */}
              <text x={xReact - 8} y={yReact + 14} className="pes-node-label" textAnchor="start">
                Reactants
              </text>
              <text
                x={xTS}
                y={yTS - 7}
                className={`pes-node-label pes-ts-label ${isTransitionPeak ? 'is-active' : ''}`}
                textAnchor="middle"
              >
                [TS]‡
              </text>
              <text x={xProd + 8} y={yProd + 14} className="pes-node-label" textAnchor="end">
                Products
              </text>

              {/* Live Progress Energy Ball with Glow */}
              <g transform={`translate(${ballPos.x}, ${ballPos.y})`}>
                {isTransitionPeak && (
                  <circle
                    r="9"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    className="pes-ball-pulse-ring"
                  />
                )}
                <circle
                  r="5"
                  fill={isTransitionPeak ? '#ef4444' : progress < 0.5 ? '#3b82f6' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  filter="url(#pesGlow)"
                />
              </g>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
