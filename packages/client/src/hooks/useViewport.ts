import { useState, useCallback, useRef, useEffect } from 'react';
import { MIN_SCALE, MAX_SCALE } from '../constants/canvas';

interface ViewportState {
  scale: number;
  pan: { x: number; y: number };
}

interface UseViewportProps {
  initialScale?: number;
  initialPan?: { x: number; y: number };
}

interface UseViewportReturn {
  scale: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  handleZoom: (delta: number) => void;
  resetView: () => void;
  startPan: (clientX: number, clientY: number) => void;
  updatePan: (clientX: number, clientY: number) => void;
  endPan: () => void;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  canvasToScreen: (canvasX: number, canvasY: number) => { x: number; y: number };
  getViewportCenter: () => { x: number; y: number };
  mousePositionRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function useViewport({
  initialScale = 1,
  initialPan = { x: 0, y: 0 },
}: UseViewportProps = {}): UseViewportReturn {
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState(initialPan);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // 鼠标位置（画布坐标）
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 缩放
  const handleZoom = useCallback((delta: number) => {
    setScale(prev => Math.min(Math.max(MIN_SCALE, prev + delta), MAX_SCALE));
  }, []);

  // 重置视图
  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // 开始平移
  const startPan = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setPanStart({ x: clientX, y: clientY });
  }, []);

  // 更新平移
  const updatePan = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;

    setPan(prev => ({
      x: prev.x + (clientX - panStart.x),
      y: prev.y + (clientY - panStart.y),
    }));
    setPanStart({ x: clientX, y: clientY });
  }, [isPanning, panStart]);

  // 结束平移
  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 屏幕坐标转画布坐标
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvasX = (screenX - window.innerWidth / 2 - pan.x) / scale;
    const canvasY = (screenY - window.innerHeight / 2 - pan.y) / scale;
    return { x: canvasX, y: canvasY };
  }, [scale, pan]);

  // 画布坐标转屏幕坐标
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    const screenX = canvasX * scale + pan.x + window.innerWidth / 2;
    const screenY = canvasY * scale + pan.y + window.innerHeight / 2;
    return { x: screenX, y: screenY };
  }, [scale, pan]);

  // 获取视口中心（画布坐标）
  const getViewportCenter = useCallback(() => {
    return {
      x: -pan.x / scale,
      y: -pan.y / scale,
    };
  }, [scale, pan]);

  return {
    scale,
    pan,
    isPanning,
    setScale,
    setPan,
    handleZoom,
    resetView,
    startPan,
    updatePan,
    endPan,
    screenToCanvas,
    canvasToScreen,
    getViewportCenter,
    mousePositionRef,
  };
}
