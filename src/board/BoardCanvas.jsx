import React, { useMemo } from 'react';
import BoardEdgeLayer from './BoardEdgeLayer.jsx';
import BoardNodeCard from './BoardNodeCard.jsx';
import { useI18n } from '../i18n';

export default function BoardCanvas({
  boardRef,
  canvasOffset,
  canvasScale,
  onBoardMouseDown,
  onPanStart,
  onWheelZoom,
  nodes,
  edges,
  isExportingPng,
  animateViewport,
  showZoomIndicator,
  onResetZoom,
  selectedNodeId,
  linkStartId,
  onNodeMouseDown,
  onLinkModeClick,
  onDeleteNode,
  onNodeResizeStart,
  onDeleteEdge
}) {
  const { t } = useI18n();

  const boardTransform = useMemo(
    () => ({
      transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
      transformOrigin: 'top left',
      transition: animateViewport
        ? 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)'
        : 'none',
      willChange: animateViewport ? 'transform' : 'auto'
    }),
    [canvasOffset.x, canvasOffset.y, canvasScale, animateViewport]
  );

  const handleCanvasMouseDown = (event) => {
    onBoardMouseDown(event);
    onPanStart(event);
  };

  return (
    <div className="flex-1 relative bg-[#111111] overflow-hidden min-w-0">
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '22px 22px'
          }}
        />
      </div>

      <div
        ref={boardRef}
        onMouseDown={handleCanvasMouseDown}
        onWheel={onWheelZoom}
        className="absolute inset-0 overflow-hidden cursor-default"
      >
        <div className="absolute inset-0" style={{ background: 'transparent' }}>
          <div className="absolute inset-0 pointer-events-none" style={boardTransform}>
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <BoardEdgeLayer
                edges={edges}
                nodes={nodes}
                isExportingPng={isExportingPng}
                onDeleteEdge={onDeleteEdge}
              />
            </svg>
          </div>

          <div className="absolute inset-0 pointer-events-none" style={boardTransform}>
            {nodes.map((node) => (
              <BoardNodeCard
                key={node.id}
                node={node}
                isExportingPng={isExportingPng}
                selectedNodeId={selectedNodeId}
                linkStartId={linkStartId}
                onNodeMouseDown={onNodeMouseDown}
                onLinkModeClick={onLinkModeClick}
                onDeleteNode={onDeleteNode}
                onNodeResizeStart={onNodeResizeStart}
              />
            ))}
          </div>
        </div>
      </div>

      {!isExportingPng && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] tracking-widest text-gray-600 opacity-90 pointer-events-none select-none">
          STALK - Assistant
        </div>
      )}

      {showZoomIndicator && !isExportingPng && (
        <button
          onClick={onResetZoom}
          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-md bg-black/60 border border-gray-800 text-xs text-gray-300 hover:bg-black/80 transition-opacity"
          title={t('board.canvas.resetZoom')}
        >
          {Math.round(canvasScale * 100)}%
        </button>
      )}
    </div>
  );
}