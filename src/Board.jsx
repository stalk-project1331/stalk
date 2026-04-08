import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import JSZip from 'jszip';
import * as htmlToImage from 'html-to-image';
import BoardSidebar from './board/BoardSidebar.jsx';
import BoardCanvas from './board/BoardCanvas.jsx';
import BoardPropertiesPanel from './board/BoardPropertiesPanel.jsx';
import BoardExportScene from './board/BoardExportScene.jsx';
import { STORAGE_KEY } from './board/constants';
import {
  makeId,
  createNode,
  normalizeNode,
  getGraphBounds,
  getDisplayTypeLabel,
  getStatusMeta,
  getNodeMinWidth,
  getNodeMinHeight,
  getNodeSize
} from './board/utils';
import {
  runNodeAction,
  applyNodeActionResult,
  buildEnrichmentPatch
} from './board/enrichment/runNodeAction.js';
import { useI18n } from './i18n';

function resizeImageFile(file, { maxDimension = 1400, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        let { width, height } = image;

        if (width <= 0 || height <= 0) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Invalid image dimensions'));
          return;
        }

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height >= width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, width, height);

        const mimeType =
          file.type === 'image/png' && file.size < 1_500_000 ? 'image/png' : 'image/jpeg';
        const dataUrl =
          mimeType === 'image/png'
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', quality);

        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image failed to load'));
    };

    image.decoding = 'async';
    image.src = objectUrl;
  });
}

function ensureNodeEnrichment(node) {
  return {
    ...node,
    enrichment: {
      status: node?.enrichment?.status || 'idle',
      lastRunAt: node?.enrichment?.lastRunAt || null,
      lastActionId: node?.enrichment?.lastActionId || null,
      data: node?.enrichment?.data || {},
      suggestions: Array.isArray(node?.enrichment?.suggestions)
        ? node.enrichment.suggestions
        : [],
      errors: Array.isArray(node?.enrichment?.errors) ? node.enrichment.errors : []
    }
  };
}

export default function Board() {
  const { t } = useI18n();
  const boardRef = useRef(null);
  const exportSceneRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const saveTimerRef = useRef(null);
  const stalkImportInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const zoomTimerRef = useRef(null);
  const resizeRef = useRef(null);
  const viewportTransitionTimerRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [linkStartId, setLinkStartId] = useState(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [saveStatusKey, setSaveStatusKey] = useState('board.messages.notSaved');
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [animateViewport, setAnimateViewport] = useState(false);
  const [activeSidebarSection, setActiveSidebarSection] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasInternet, setHasInternet] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [propertiesPanelMode, setPropertiesPanelMode] = useState('details');

  const stopViewportTransition = useCallback(() => {
    if (viewportTransitionTimerRef.current) {
      clearTimeout(viewportTransitionTimerRef.current);
      viewportTransitionTimerRef.current = null;
    }

    setAnimateViewport(false);
  }, []);

  const pulseViewportTransition = useCallback((duration = 180) => {
    if (viewportTransitionTimerRef.current) {
      clearTimeout(viewportTransitionTimerRef.current);
    }

    setAnimateViewport(true);
    viewportTransitionTimerRef.current = setTimeout(() => {
      setAnimateViewport(false);
      viewportTransitionTimerRef.current = null;
    }, duration);
  }, []);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  const selectedNodeBacklinks = useMemo(() => {
    if (!selectedNodeId) {
      return { incoming: [], outgoing: [] };
    }

    const resolveNode = (id) => nodes.find((node) => node.id === id) || null;

    return {
      incoming: edges
        .filter((edge) => edge.to === selectedNodeId)
        .map((edge) => ({ edge, node: resolveNode(edge.from) }))
        .filter((item) => item.node),
      outgoing: edges
        .filter((edge) => edge.from === selectedNodeId)
        .map((edge) => ({ edge, node: resolveNode(edge.to) }))
        .filter((item) => item.node)
    };
  }, [edges, nodes, selectedNodeId]);

  const graphBounds = useMemo(() => getGraphBounds(nodes), [nodes]);

  const filteredNodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return nodes;

    return nodes.filter((node) => {
      const typeLabel = getDisplayTypeLabel(node, t).toLowerCase();
      const statusLabel = getStatusMeta(node.status, t)?.label?.toLowerCase() || '';
      const haystack = [
        node.title,
        node.description,
        node.customLabel,
        node.tags,
        node.source,
        node.notes,
        typeLabel,
        statusLabel
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [nodes, searchQuery, t]);

  const getSessionPayload = useCallback(
    (
      customNodes = nodes,
      customEdges = edges,
      customOffset = canvasOffset,
      customScale = canvasScale
    ) => ({
      format: 'stalk-session',
      version: 18,
      savedAt: Date.now(),
      nodes: customNodes,
      edges: customEdges,
      canvasOffset: customOffset,
      canvasScale: customScale
    }),
    [nodes, edges, canvasOffset, canvasScale]
  );

  const persistSession = useCallback(
    (
      customNodes = nodes,
      customEdges = edges,
      customOffset = canvasOffset,
      customScale = canvasScale,
      statusKey = 'board.messages.saved'
    ) => {
      try {
        const payload = getSessionPayload(
          customNodes,
          customEdges,
          customOffset,
          customScale
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSaveStatusKey(statusKey);

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          setSaveStatusKey('board.messages.ready');
        }, 1200);
      } catch (error) {
        console.error('Board save error:', error);
        setSaveStatusKey('board.messages.saveError');
      }
    },
    [getSessionPayload, nodes, edges, canvasOffset, canvasScale]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        setNodes(
          Array.isArray(parsed.nodes)
            ? parsed.nodes.map((node) => ensureNodeEnrichment(normalizeNode(node)))
            : []
        );
        setEdges(Array.isArray(parsed.edges) ? parsed.edges : []);
        setCanvasOffset(parsed.canvasOffset || { x: 0, y: 0 });
        setCanvasScale(parsed.canvasScale || 1);
        setSaveStatusKey('board.messages.sessionLoaded');
      } else {
        const initialNodes = [
          ensureNodeEnrichment(createNode('person', 140, 120)),
          ensureNodeEnrichment(createNode('email', 460, 180))
        ];

        setNodes(initialNodes);
        setEdges([]);
        setCanvasOffset({ x: 0, y: 0 });
        setCanvasScale(1);
        setSaveStatusKey('board.messages.newSession');
      }
    } catch (error) {
      console.error('Board load error:', error);
      setSaveStatusKey('board.messages.loadError');
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      if (viewportTransitionTimerRef.current) {
        clearTimeout(viewportTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setHasInternet(true);
    const handleOffline = () => setHasInternet(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (
      nodes.length === 0 &&
      edges.length === 0 &&
      canvasOffset.x === 0 &&
      canvasOffset.y === 0 &&
      canvasScale === 1
    ) {
      return;
    }

    persistSession(nodes, edges, canvasOffset, canvasScale, 'board.messages.autoSaved');
  }, [nodes, edges, canvasOffset, canvasScale, persistSession]);

  const handleResetZoom = useCallback(() => {
    if (!boardRef.current) {
      pulseViewportTransition(180);
      setCanvasScale(1);
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;
    const worldCenterX = (viewportCenterX - canvasOffset.x) / canvasScale;
    const worldCenterY = (viewportCenterY - canvasOffset.y) / canvasScale;
    const nextScale = 1;

    pulseViewportTransition(180);
    setCanvasScale(nextScale);
    setCanvasOffset({
      x: viewportCenterX - worldCenterX * nextScale,
      y: viewportCenterY - worldCenterY * nextScale
    });
    setShowZoomIndicator(true);

    if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
    zoomTimerRef.current = setTimeout(() => {
      setShowZoomIndicator(false);
    }, 1500);
  }, [canvasOffset.x, canvasOffset.y, canvasScale, pulseViewportTransition]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        persistSession(nodes, edges, canvasOffset, canvasScale, 'board.messages.sessionSaved');
      }

      if ((event.ctrlKey || event.metaKey) && event.key === '0') {
        event.preventDefault();
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [nodes, edges, canvasOffset, canvasScale, persistSession, handleResetZoom]);

  const toggleSidebarSection = useCallback((sectionKey) => {
    setActiveSidebarSection((prev) => (prev === sectionKey ? null : sectionKey));
  }, []);

  const exportPng = useCallback(async () => {
    if (!exportSceneRef.current) return;

    try {
      setSelectedNodeId(null);
      setLinkStartId(null);
      setIsExportingPng(true);

      await new Promise((resolve) => setTimeout(resolve, 120));

      const dataUrl = await htmlToImage.toPng(exportSceneRef.current, {
        cacheBust: true,
        backgroundColor: '#111111',
        pixelRatio: 2
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'stalk-board.png';
      link.click();

      setSaveStatusKey('board.messages.pngExported');
    } catch (error) {
      console.error('PNG export error:', error);
      setSaveStatusKey('board.messages.pngError');
    } finally {
      setIsExportingPng(false);
    }
  }, []);

  const exportStalk = useCallback(async () => {
    try {
      const zip = new JSZip();

      zip.file('session.json', JSON.stringify(getSessionPayload(), null, 2));
      zip.file(
        'meta.json',
        JSON.stringify(
          {
            app: 'STALK',
            format: 'stalk-project',
            version: 1,
            exportedAt: Date.now()
          },
          null,
          2
        )
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'project.stalk';
      link.click();

      setSaveStatusKey('board.messages.stalkExported');
    } catch (error) {
      console.error('.stalk export error:', error);
      setSaveStatusKey('board.messages.stalkError');
    }
  }, [getSessionPayload]);

  const handleImportStalk = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const zip = await JSZip.loadAsync(file);
        const sessionFile = zip.file('session.json');

        if (!sessionFile) {
          throw new Error(t('board.messages.archiveMissingSession'));
        }

        const sessionText = await sessionFile.async('string');
        const parsed = JSON.parse(sessionText);

        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error(t('board.messages.invalidStalkProject'));
        }

        const normalizedNodes = parsed.nodes.map((node) =>
          ensureNodeEnrichment(normalizeNode(node))
        );
        const nextOffset = parsed.canvasOffset || { x: 0, y: 0 };
        const nextScale = parsed.canvasScale || 1;

        setNodes(normalizedNodes);
        setEdges(parsed.edges);
        setCanvasOffset(nextOffset);
        setCanvasScale(nextScale);
        setSelectedNodeId(null);
        setLinkStartId(null);
        setPropertiesPanelMode('details');

        persistSession(
          normalizedNodes,
          parsed.edges,
          nextOffset,
          nextScale,
          'board.messages.stalkImported'
        );
      } catch (error) {
        console.error('.stalk import error:', error);
        setSaveStatusKey('board.messages.stalkImportError');
      } finally {
        event.target.value = '';
      }
    },
    [persistSession, t]
  );

  const resetBoard = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setLinkStartId(null);
    setCanvasOffset({ x: 0, y: 0 });
    setCanvasScale(1);
    setPropertiesPanelMode('details');

    localStorage.removeItem(STORAGE_KEY);
    setSaveStatusKey('board.messages.boardReset');
  }, []);

  const getViewportCenterInCanvasCoords = useCallback(() => {
    if (!boardRef.current) {
      return { x: 200, y: 200 };
    }

    const rect = boardRef.current.getBoundingClientRect();

    return {
      x: (rect.width / 2 - canvasOffset.x) / canvasScale,
      y: (rect.height / 2 - canvasOffset.y) / canvasScale
    };
  }, [canvasOffset.x, canvasOffset.y, canvasScale]);

  const handleNodeResizeStart = useCallback(
    (event, nodeId) => {
      event.stopPropagation();
      event.preventDefault();

      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return;

      setSelectedNodeId(nodeId);

      resizeRef.current = {
        nodeId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: node.width,
        startHeight: node.height,
        minWidth: getNodeMinWidth(node.type),
        minHeight: getNodeMinHeight(node.type)
      };

      const handleResizeMove = (moveEvent) => {
        if (!resizeRef.current) return;

        const dx = (moveEvent.clientX - resizeRef.current.startX) / canvasScale;
        const dy = (moveEvent.clientY - resizeRef.current.startY) / canvasScale;
        const currentNodeId = resizeRef.current.nodeId;
        const nextWidth = Math.max(
          resizeRef.current.minWidth,
          resizeRef.current.startWidth + dx
        );
        const nextHeight = Math.max(
          resizeRef.current.minHeight,
          resizeRef.current.startHeight + dy
        );

        setNodes((prev) =>
          prev.map((item) =>
            item.id === currentNodeId
              ? { ...item, width: nextWidth, height: nextHeight }
              : item
          )
        );
      };

      const handleResizeEnd = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };

      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    },
    [nodes, canvasScale]
  );

  const focusViewportOnNode = useCallback(
    (node, scale = canvasScale) => {
      const targetScale = Math.max(0.6, Math.min(2, scale));

      if (!boardRef.current) {
        setSelectedNodeId(node.id);
        setIsPropertiesOpen(true);
        return;
      }

      const rect = boardRef.current.getBoundingClientRect();
      const nodeCenterX = node.x + node.width / 2;
      const nodeCenterY = node.y + node.height / 2;

      pulseViewportTransition(220);
      setCanvasScale(targetScale);
      setCanvasOffset({
        x: rect.width / 2 - nodeCenterX * targetScale,
        y: rect.height / 2 - nodeCenterY * targetScale
      });
      setSelectedNodeId(node.id);
      setIsPropertiesOpen(true);
    },
    [canvasScale, pulseViewportTransition]
  );

  const centerOnNode = useCallback(
    (nodeId, scale = canvasScale) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return;

      focusViewportOnNode(node, scale);
    },
    [nodes, canvasScale, focusViewportOnNode]
  );

  const handleAddNode = useCallback(
    (type) => {
      const center = getViewportCenterInCanvasCoords();
      const size = getNodeSize(type);
      const spread = (nodes.length % 6) * 18;

      const newNode = ensureNodeEnrichment(
        createNode(
          type,
          center.x - size.width / 2 + spread,
          center.y - size.height / 2 + spread
        )
      );

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
      setIsPropertiesOpen(true);
      setPropertiesPanelMode('details');
    },
    [getViewportCenterInCanvasCoords, nodes.length]
  );

  const handleBoardMouseDown = useCallback((event) => {
    const clickedNode = event.target.closest('[data-node-card="true"]');
    if (!clickedNode) {
      setSelectedNodeId(null);
      setLinkStartId(null);
      setPropertiesPanelMode('details');
    }
  }, []);

  const handlePanStart = useCallback(
    (event) => {
      const clickedNode = event.target.closest('[data-node-card="true"]');
      if (clickedNode) return;

      stopViewportTransition();
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: canvasOffset.x,
        originY: canvasOffset.y
      };

      const handlePanMove = (moveEvent) => {
        if (!panRef.current) return;

        const dx = moveEvent.clientX - panRef.current.startX;
        const dy = moveEvent.clientY - panRef.current.startY;

        setCanvasOffset({
          x: panRef.current.originX + dx,
          y: panRef.current.originY + dy
        });
      };

      const handlePanEnd = () => {
        panRef.current = null;
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanEnd);
      };

      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanEnd);
    },
    [canvasOffset.x, canvasOffset.y, stopViewportTransition]
  );

  const handleWheelZoom = useCallback(
    (event) => {
      event.preventDefault();

      if (!boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const zoomStep = event.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = Math.max(0.5, Math.min(2, canvasScale * zoomStep));

      if (nextScale === canvasScale) return;

      const worldX = (mouseX - canvasOffset.x) / canvasScale;
      const worldY = (mouseY - canvasOffset.y) / canvasScale;

      pulseViewportTransition(170);
      setCanvasScale(nextScale);
      setCanvasOffset({
        x: mouseX - worldX * nextScale,
        y: mouseY - worldY * nextScale
      });
      setShowZoomIndicator(true);

      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = setTimeout(() => {
        setShowZoomIndicator(false);
      }, 1500);
    },
    [canvasOffset.x, canvasOffset.y, canvasScale, pulseViewportTransition]
  );

  const handleNodeMouseDown = useCallback(
    (event, nodeId) => {
      event.stopPropagation();

      if (event.target.closest('[data-node-resize-handle="true"]')) return;

      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return;

      setSelectedNodeId(nodeId);
      setPropertiesPanelMode('details');

      dragRef.current = {
        nodeId,
        startX: event.clientX,
        startY: event.clientY,
        nodeX: node.x,
        nodeY: node.y
      };

      const handleMouseMove = (moveEvent) => {
        if (!dragRef.current) return;

        const dx = (moveEvent.clientX - dragRef.current.startX) / canvasScale;
        const dy = (moveEvent.clientY - dragRef.current.startY) / canvasScale;
        const nextX = dragRef.current.nodeX + dx;
        const nextY = dragRef.current.nodeY + dy;
        const currentNodeId = dragRef.current.nodeId;

        setNodes((prev) =>
          prev.map((item) =>
            item.id === currentNodeId
              ? { ...item, x: nextX, y: nextY }
              : item
          )
        );
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [nodes, canvasScale]
  );

  const handleDeleteNode = useCallback(
    (nodeId) => {
      setNodes((prev) => prev.filter((node) => node.id !== nodeId));
      setEdges((prev) => prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId));

      if (selectedNodeId === nodeId) setSelectedNodeId(null);
      if (linkStartId === nodeId) setLinkStartId(null);
      if (selectedNodeId === nodeId) setPropertiesPanelMode('details');
    },
    [selectedNodeId, linkStartId]
  );

  const handleDeleteEdge = useCallback((edgeId) => {
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
  }, []);

  const handleUpdateSelectedNode = useCallback(
    (field, value) => {
      if (!selectedNodeId) return;

      setNodes((prev) =>
        prev.map((node) =>
          node.id === selectedNodeId
            ? { ...node, [field]: value, updatedAt: Date.now() }
            : node
        )
      );
    },
    [selectedNodeId]
  );

  const handleUpdateSelectedType = useCallback(
    (type) => {
      if (!selectedNodeId) return;

      setNodes((prev) =>
        prev.map((node) => {
          if (node.id !== selectedNodeId) return node;

          const size = getNodeSize(type);

          return {
            ...node,
            type,
            width: Math.max(node.width, size.width),
            height: Math.max(node.height, size.height),
            updatedAt: Date.now(),
            enrichment: {
              status: 'idle',
              lastRunAt: null,
              lastActionId: null,
              data: {},
              suggestions: [],
              errors: []
            }
          };
        })
      );
      setPropertiesPanelMode('details');
    },
    [selectedNodeId]
  );

  const handleImageUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file || !selectedNodeId) return;

      try {
        const optimizedImageSrc = await resizeImageFile(file, {
          maxDimension: 1400,
          quality: 0.82
        });

        setNodes((prev) =>
          prev.map((node) =>
            node.id === selectedNodeId
              ? {
                  ...node,
                  type: 'image',
                  imageSrc: optimizedImageSrc,
                  width: Math.max(node.width, 280),
                  height: Math.max(node.height, 240),
                  title: node.title || file.name,
                  updatedAt: Date.now(),
                  enrichment: {
                    status: 'idle',
                    lastRunAt: null,
                    lastActionId: null,
                    data: {},
                    suggestions: [],
                    errors: []
                  }
                }
              : node
          )
        );

        setSaveStatusKey('board.messages.imageUploaded');
        setPropertiesPanelMode('details');
      } catch (error) {
        console.error('Image processing error:', error);
        setSaveStatusKey('board.messages.saveError');
      } finally {
        event.target.value = '';
      }
    },
    [selectedNodeId]
  );

  const handleRunSelectedNodeAction = useCallback(
    async (actionId) => {
      if (!selectedNode) return;

      setNodes((prev) =>
        prev.map((node) =>
          node.id === selectedNode.id
            ? {
                ...node,
                enrichment: {
                  ...(node.enrichment || {}),
                  status: 'loading',
                  lastActionId: actionId
                }
              }
            : node
        )
      );

      try {
        const actionResponse = await runNodeAction(selectedNode, actionId, {
          hasInternet
        });

        setNodes((prev) =>
          prev.map((node) =>
            node.id === selectedNode.id
              ? applyNodeActionResult(node, actionResponse)
              : node
          )
        );
      } catch (error) {
        setNodes((prev) =>
          prev.map((node) =>
            node.id === selectedNode.id
              ? {
                  ...node,
                  enrichment: buildEnrichmentPatch(node.enrichment, {
                    ok: false,
                    actionId,
                    nodeType: selectedNode.type,
                    error: error.message || 'Action failed',
                    result: null
                  }),
                  updatedAt: Date.now()
                }
              : node
          )
        );
      }
    },
    [selectedNode, hasInternet]
  );

  const handleOpenIntelligence = useCallback(() => {
    if (!selectedNode) return;
    setPropertiesPanelMode('intelligence');
    setIsPropertiesOpen(true);
  }, [selectedNode]);

  const handleBackToDetails = useCallback(() => {
    setPropertiesPanelMode('details');
  }, []);

  const handleLinkModeClick = useCallback(
    (nodeId) => {
      if (!linkStartId) {
        setLinkStartId(nodeId);
        return;
      }

      if (linkStartId === nodeId) {
        setLinkStartId(null);
        return;
      }

      const exists = edges.some(
        (edge) =>
          (edge.from === linkStartId && edge.to === nodeId) ||
          (edge.from === nodeId && edge.to === linkStartId)
      );

      if (!exists) {
        setEdges((prev) => [...prev, { id: makeId(), from: linkStartId, to: nodeId }]);
      }

      setLinkStartId(null);
    },
    [linkStartId, edges]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8 mb-8 h-[calc(100vh-140px)] rounded-lg shadow-xl overflow-hidden flex"
    >
      <BoardSidebar
        activeSidebarSection={activeSidebarSection}
        onToggleSidebarSection={toggleSidebarSection}
        onAddNode={handleAddNode}
        onExportPng={exportPng}
        onExportStalk={exportStalk}
        stalkImportInputRef={stalkImportInputRef}
        onImportStalk={handleImportStalk}
        onResetBoard={resetBoard}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        nodes={nodes}
        filteredNodes={filteredNodes}
        selectedNodeId={selectedNodeId}
        onCenterOnNode={centerOnNode}
      />

      <div className="min-w-0 flex-1 flex">
        <BoardCanvas
          boardRef={boardRef}
          canvasOffset={canvasOffset}
          canvasScale={canvasScale}
          onBoardMouseDown={handleBoardMouseDown}
          onPanStart={handlePanStart}
          onWheelZoom={handleWheelZoom}
          nodes={nodes}
          edges={edges}
          isExportingPng={isExportingPng}
          animateViewport={animateViewport}
          showZoomIndicator={showZoomIndicator}
          onResetZoom={handleResetZoom}
          selectedNodeId={selectedNodeId}
          linkStartId={linkStartId}
          onNodeMouseDown={handleNodeMouseDown}
          onLinkModeClick={handleLinkModeClick}
          onDeleteNode={handleDeleteNode}
          onNodeResizeStart={handleNodeResizeStart}
          onDeleteEdge={handleDeleteEdge}
        />

        <BoardPropertiesPanel
          isPropertiesOpen={isPropertiesOpen}
          onTogglePropertiesPanel={() => setIsPropertiesOpen((prev) => !prev)}
          saveStatus={t(saveStatusKey)}
          selectedNode={selectedNode}
          onUpdateSelectedType={handleUpdateSelectedType}
          onUpdateSelectedNode={handleUpdateSelectedNode}
          selectedNodeBacklinks={selectedNodeBacklinks}
          onCenterOnNode={centerOnNode}
          imageInputRef={imageInputRef}
          onImageUpload={handleImageUpload}
          onDeleteNode={handleDeleteNode}
          hasInternet={hasInternet}
          onRunSelectedNodeAction={handleRunSelectedNodeAction}
          mode={propertiesPanelMode}
          onOpenIntelligence={handleOpenIntelligence}
          onBackToDetails={handleBackToDetails}
        />
      </div>

      <BoardExportScene
        exportSceneRef={exportSceneRef}
        graphBounds={graphBounds}
        nodes={nodes}
        edges={edges}
      />
    </motion.div>
  );
}