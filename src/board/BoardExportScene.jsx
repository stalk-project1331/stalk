import React from 'react';
import { EXPORT_PADDING } from './constants';
import BoardEdgeLayer from './BoardEdgeLayer.jsx';
import BoardNodeCard from './BoardNodeCard.jsx';

export default function BoardExportScene({
  exportSceneRef,
  graphBounds,
  nodes,
  edges
}) {
  return (
    <div
      className="fixed -left-[20000px] -top-[20000px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        ref={exportSceneRef}
        style={{
          width: graphBounds.width,
          height: graphBounds.height,
          background: '#111111',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.06,
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '22px 22px'
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: EXPORT_PADDING - graphBounds.minX,
            top: EXPORT_PADDING - graphBounds.minY,
            width: graphBounds.width,
            height: graphBounds.height
          }}
        >
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              overflow: 'visible'
            }}
          >
            <BoardEdgeLayer
              edges={edges}
              nodes={nodes}
              forExport
            />
          </svg>

          {nodes.map((node) => (
            <BoardNodeCard
              key={node.id}
              node={node}
              forExport
              selectedNodeId={null}
              linkStartId={null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}