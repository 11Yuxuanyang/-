import { useState, useRef, useCallback } from 'react';
import { CanvasItem } from '../types';
import * as API from '../services/api';
import { COLORS } from '../constants/canvas';

interface UseMaskEditingProps {
  items: CanvasItem[];
  setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
  selectedIds: string[];
  addProcessingId: (id: string) => void;
  removeProcessingId: (id: string) => void;
}

interface UseMaskEditingReturn {
  maskEditingId: string | null;
  maskEditMode: 'erase' | 'repaint';
  maskBrushSize: number;
  setMaskBrushSize: (size: number) => void;
  repaintPrompt: string;
  setRepaintPrompt: (prompt: string) => void;
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isMaskDrawing: boolean;
  setIsMaskDrawing: (value: boolean) => void;
  hasMaskContent: boolean;
  openMaskEdit: (mode?: 'erase' | 'repaint') => void;
  cancelMaskEdit: () => void;
  clearMask: () => void;
  confirmMaskEdit: () => Promise<void>;
  drawMaskBrush: (x: number, y: number, isStart?: boolean) => void;
  resetLastPoint: () => void;
}

export function useMaskEditing({
  items,
  setItems,
  selectedIds,
  addProcessingId,
  removeProcessingId,
}: UseMaskEditingProps): UseMaskEditingReturn {
  const [maskEditingId, setMaskEditingId] = useState<string | null>(null);
  const [maskEditMode, setMaskEditMode] = useState<'erase' | 'repaint'>('erase');
  const [maskBrushSize, setMaskBrushSize] = useState(30);
  const [repaintPrompt, setRepaintPrompt] = useState('');
  const [isMaskDrawing, setIsMaskDrawing] = useState(false);
  const [hasMaskContent, setHasMaskContent] = useState(false);

  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskLastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 开始内联遮罩编辑
  const openMaskEdit = useCallback((mode: 'erase' | 'repaint' = 'erase') => {
    const selectedItem = selectedIds.length > 0 ? items.find(i => i.id === selectedIds[0]) : null;
    if (!selectedItem || selectedItem.type !== 'image') return;

    setMaskEditingId(selectedItem.id);
    setMaskEditMode(mode);
    setHasMaskContent(false);
    setRepaintPrompt('');
    maskLastPointRef.current = null;
  }, [items, selectedIds]);

  // 取消遮罩编辑
  const cancelMaskEdit = useCallback(() => {
    setMaskEditingId(null);
    setHasMaskContent(false);
    setRepaintPrompt('');
    maskLastPointRef.current = null;
  }, []);

  // 清空遮罩
  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasMaskContent(false);
  }, []);

  // 确认遮罩编辑
  const confirmMaskEdit = useCallback(async () => {
    if (!maskEditingId || !maskCanvasRef.current) return;

    const editingItem = items.find(i => i.id === maskEditingId);
    if (!editingItem || editingItem.type !== 'image') return;

    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 生成黑白遮罩
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // 黑色背景
    outputCtx.fillStyle = '#000000';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // 将有颜色的区域变成白色
    const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const outputData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 0) {
        outputData.data[i] = 255;
        outputData.data[i + 1] = 255;
        outputData.data[i + 2] = 255;
        outputData.data[i + 3] = 255;
      }
    }
    outputCtx.putImageData(outputData, 0, 0);
    const maskDataUrl = outputCanvas.toDataURL('image/png');

    const id = maskEditingId;
    const src = editingItem.src;
    const mode = maskEditMode;
    const prompt = repaintPrompt;

    // 关闭编辑模式
    cancelMaskEdit();
    addProcessingId(id);

    try {
      const newImageSrc = await API.inpaintImage({
        image: src,
        mask: maskDataUrl,
        prompt: mode === 'repaint' ? prompt : undefined,
      });

      if (newImageSrc) {
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, src: newImageSrc } : item
        ));
      }
    } catch (e) {
      console.error(mode === 'erase' ? '图片擦除失败:' : '局部重绘失败:', e);
      alert(mode === 'erase' ? '擦除失败，请检查后端服务是否正常运行。' : '重绘失败，请检查后端服务是否正常运行。');
    } finally {
      removeProcessingId(id);
    }
  }, [maskEditingId, maskEditMode, repaintPrompt, items, setItems, addProcessingId, removeProcessingId, cancelMaskEdit]);

  // 遮罩画笔绘制
  const drawMaskBrush = useCallback((x: number, y: number, isStart: boolean = false) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = COLORS.MASK_BRUSH;
    ctx.fillStyle = COLORS.MASK_BRUSH;
    ctx.lineWidth = maskBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isStart || !maskLastPointRef.current) {
      ctx.beginPath();
      ctx.arc(x, y, maskBrushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(maskLastPointRef.current.x, maskLastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    maskLastPointRef.current = { x, y };
    setHasMaskContent(true);
  }, [maskBrushSize]);

  // 重置最后绘制点
  const resetLastPoint = useCallback(() => {
    maskLastPointRef.current = null;
  }, []);

  return {
    maskEditingId,
    maskEditMode,
    maskBrushSize,
    setMaskBrushSize,
    repaintPrompt,
    setRepaintPrompt,
    maskCanvasRef,
    isMaskDrawing,
    setIsMaskDrawing,
    hasMaskContent,
    openMaskEdit,
    cancelMaskEdit,
    clearMask,
    confirmMaskEdit,
    drawMaskBrush,
    resetLastPoint,
  };
}
