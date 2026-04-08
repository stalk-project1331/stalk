import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { readSettings, SETTINGS_CHANGED_EVENT } from '../settingsStore';

function getAnchorPoints(from, to) {
  const fromCenterX = from.x + from.width / 2;
  const fromCenterY = from.y + from.height / 2;
  const toCenterX = to.x + to.width / 2;
  const toCenterY = to.y + to.height / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x1: dx >= 0 ? from.x + from.width : from.x,
      y1: fromCenterY,
      x2: dx >= 0 ? to.x : to.x + to.width,
      y2: toCenterY
    };
  }

  return {
    x1: fromCenterX,
    y1: dy >= 0 ? from.y + from.height : from.y,
    x2: toCenterX,
    y2: dy >= 0 ? to.y : to.y + to.height
  };
}

function getBezierPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  if (horizontal) {
    const control = Math.max(60, Math.abs(dx) * 0.35);

    return `
      M ${x1} ${y1}
      C ${x1 + (dx >= 0 ? control : -control)} ${y1},
        ${x2 - (dx >= 0 ? control : -control)} ${y2},
        ${x2} ${y2}
    `;
  }

  const control = Math.max(60, Math.abs(dy) * 0.35);

  return `
    M ${x1} ${y1}
    C ${x1} ${y1 + (dy >= 0 ? control : -control)},
      ${x2} ${y2 - (dy >= 0 ? control : -control)},
      ${x2} ${y2}
  `;
}

function getStraightPath(x1, y1, x2, y2) {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function getBezierMidpoint(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const horizontal = Math.abs(dx) >= Math.abs(dy);

  let cx1;
  let cy1;
  let cx2;
  let cy2;

  if (horizontal) {
    const control = Math.max(60, Math.abs(dx) * 0.35);
    cx1 = x1 + (dx >= 0 ? control : -control);
    cy1 = y1;
    cx2 = x2 - (dx >= 0 ? control : -control);
    cy2 = y2;
  } else {
    const control = Math.max(60, Math.abs(dy) * 0.35);
    cx1 = x1;
    cy1 = y1 + (dy >= 0 ? control : -control);
    cx2 = x2;
    cy2 = y2 - (dy >= 0 ? control : -control);
  }

  const t = 0.5;
  const mt = 1 - t;

  const midX =
    mt * mt * mt * x1 +
    3 * mt * mt * t * cx1 +
    3 * mt * t * t * cx2 +
    t * t * t * x2;

  const midY =
    mt * mt * mt * y1 +
    3 * mt * mt * t * cy1 +
    3 * mt * t * t * cy2 +
    t * t * t * y2;

  return { midX, midY };
}

function getStraightMidpoint(x1, y1, x2, y2) {
  return {
    midX: (x1 + x2) / 2,
    midY: (y1 + y2) / 2
  };
}

export default function BoardEdgeLayer({
  edges,
  nodes,
  forExport = false,
  isExportingPng = false,
  onDeleteEdge
}) {
  const { t } = useI18n();
  const [edgeSettings, setEdgeSettings] = useState(() => readSettings().boardEdges);

  useEffect(() => {
    const handleSettingsChanged = (event) => {
      setEdgeSettings(event.detail?.boardEdges || readSettings().boardEdges);
    };

    window.addEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, handleSettingsChanged);
    };
  }, []);

  const nodesById = useMemo(() => {
    const map = new Map();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const strokeDasharray = edgeSettings.dashed ? '8 6' : undefined;
  const mainStroke = `rgba(148,163,184,${edgeSettings.opacity})`;
  const glowStroke = edgeSettings.glow ? 'rgba(96,165,250,0.22)' : 'rgba(96,165,250,0)';
  const glowWidth = Math.max(edgeSettings.width + 5, 6);

  return edges.map((edge) => {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) return null;

    const { x1, y1, x2, y2 } = getAnchorPoints(from, to);

    const isStraight = edgeSettings.style === 'straight';

    const pathD = isStraight
      ? getStraightPath(x1, y1, x2, y2)
      : getBezierPath(x1, y1, x2, y2);

    const { midX, midY } = isStraight
      ? getStraightMidpoint(x1, y1, x2, y2)
      : getBezierMidpoint(x1, y1, x2, y2);

    return (
      <g key={edge.id} className="group">
        {!forExport && !isExportingPng && (
          <path
            d={pathD}
            fill="none"
            stroke="transparent"
            strokeWidth={Math.max(edgeSettings.width + 18, 20)}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          />
        )}

        {edgeSettings.glow && (
          <path
            d={pathD}
            fill="none"
            stroke={glowStroke}
            strokeWidth={glowWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            className="transition-all duration-200"
            pointerEvents="none"
          />
        )}

        <path
          d={pathD}
          fill="none"
          stroke={mainStroke}
          strokeWidth={edgeSettings.width}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          className="transition-all duration-200 opacity-80 group-hover:opacity-100"
          pointerEvents="none"
        />

        {!forExport && !isExportingPng && (
          <foreignObject
            x={midX - 14}
            y={midY - 14}
            width="28"
            height="28"
            className="opacity-0 group-hover:opacity-100 transition-all duration-150"
            style={{ pointerEvents: 'auto', overflow: 'visible' }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEdge?.(edge.id);
              }}
              className="w-7 h-7 rounded-full bg-[#1f1f1f] border border-gray-600 text-gray-200 hover:bg-red-600 hover:border-red-400 hover:text-white flex items-center justify-center text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_14px_rgba(0,0,0,0.45)] hover:shadow-[0_0_0_1px_rgba(248,113,113,0.35),0_0_18px_rgba(220,38,38,0.35)]"
              title={t('board.edges.delete')}
            >
              ×
            </button>
          </foreignObject>
        )}
      </g>
    );
  });
}