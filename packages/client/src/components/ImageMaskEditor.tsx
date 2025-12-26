/**
 * 图片遮罩编辑器
 * 用于在图片上绘制遮罩区域，支持橡皮擦涂抹标记要擦除的区域
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Undo2, Redo2 } from 'lucide-react';

interface ImageMaskEditorProps {
  imageSrc: string;
  mode: 'erase' | 'repaint';  // 擦除 或 局部重绘
  onConfirm: (maskDataUrl: string, prompt?: string) => void;
  onCancel: () => void;
}

interface HistoryState {
  imageData: ImageData;
}

export function ImageMaskEditor({ imageSrc, mode, onConfirm, onCancel }: ImageMaskEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  // 历史记录
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasMask, setHasMask] = useState(false);

  // 局部重绘输入框
  const [repaintPrompt, setRepaintPrompt] = useState('');
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const [maskBounds, setMaskBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // 加载图片
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });

      // 计算适合显示的尺寸（最大宽度 800px，最大高度 600px）
      const maxWidth = Math.min(window.innerWidth - 80, 800);
      const maxHeight = Math.min(window.innerHeight - 200, 600);
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

      setDisplaySize({
        width: img.width * ratio,
        height: img.height * ratio,
      });
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 初始化 canvas
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !maskCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!ctx || !maskCtx) return;

    // 设置画布尺寸为原始图片尺寸
    canvas.width = imageSize.width;
    canvas.height = imageSize.height;
    maskCanvas.width = imageSize.width;
    maskCanvas.height = imageSize.height;

    // 绘制原始图片
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // 初始化遮罩画布为透明
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

      // 保存初始状态到历史记录
      const initialState = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      setHistory([{ imageData: initialState }]);
      setHistoryIndex(0);
    };
    img.src = imageSrc;
  }, [imageLoaded, imageSize, imageSrc]);

  // 计算画布坐标
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return { x: 0, y: 0 };

    const rect = maskCanvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 转换为原始图片坐标
    const scaleX = imageSize.width / rect.width;
    const scaleY = imageSize.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [imageSize]);

  // 上一个绘制点
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 绘制画笔（连续线条）
  const drawBrush = useCallback((x: number, y: number, isStart: boolean = false) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // 根据显示比例调整画笔大小
    const scaleRatio = imageSize.width / displaySize.width;
    const actualBrushSize = brushSize * scaleRatio;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)'; // 半透明蓝色
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = actualBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isStart || !lastPointRef.current) {
      // 起始点画一个圆
      ctx.beginPath();
      ctx.arc(x, y, actualBrushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 连续绘制线条
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPointRef.current = { x, y };
    setHasMask(true);
  }, [brushSize, imageSize, displaySize]);

  // 保存历史状态
  const saveHistoryState = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    // 删除当前位置之后的历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ imageData });

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // 鼠标/触摸事件处理
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPointRef.current = null; // 重置上一个点
    const coords = getCanvasCoords(e);
    drawBrush(coords.x, coords.y, true); // isStart = true
  }, [getCanvasCoords, drawBrush]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    drawBrush(coords.x, coords.y, false);
  }, [isDrawing, getCanvasCoords, drawBrush]);

  // 计算遮罩边界（用于定位输入框）
  const calculateMaskBounds = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;

    let minX = maskCanvas.width;
    let minY = maskCanvas.height;
    let maxX = 0;
    let maxY = 0;
    let hasPixels = false;

    for (let y = 0; y < maskCanvas.height; y++) {
      for (let x = 0; x < maskCanvas.width; x++) {
        const i = (y * maskCanvas.width + x) * 4;
        if (data[i + 3] > 0) {
          hasPixels = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (!hasPixels) return null;

    // 转换为显示坐标
    const scaleRatio = displaySize.width / imageSize.width;
    return {
      minX: minX * scaleRatio,
      minY: minY * scaleRatio,
      maxX: maxX * scaleRatio,
      maxY: maxY * scaleRatio,
    };
  }, [displaySize, imageSize]);

  const handleEnd = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      lastPointRef.current = null; // 清除上一个点
      saveHistoryState();

      // 局部重绘模式下计算输入框位置
      if (mode === 'repaint') {
        const bounds = calculateMaskBounds();
        if (bounds) {
          setMaskBounds(bounds);
          // 输入框位置：遮罩右侧中间
          setInputPosition({
            x: bounds.maxX + 20,
            y: (bounds.minY + bounds.maxY) / 2,
          });
          // 聚焦输入框
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    }
  }, [isDrawing, saveHistoryState, mode, calculateMaskBounds]);

  // 撤销
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);

    // 检查是否还有遮罩
    checkHasMask(history[newIndex].imageData);
  }, [historyIndex, history]);

  // 重做
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const newIndex = historyIndex + 1;
    ctx.putImageData(history[newIndex].imageData, 0, 0);
    setHistoryIndex(newIndex);
    setHasMask(true);
  }, [historyIndex, history]);

  // 清空遮罩
  const handleClear = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    saveHistoryState();
    setHasMask(false);
  }, [saveHistoryState]);

  // 检查是否有遮罩
  const checkHasMask = (imageData: ImageData) => {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        setHasMask(true);
        return;
      }
    }
    setHasMask(false);
  };

  // 导出遮罩
  const handleConfirm = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // 创建一个新的 canvas 来生成黑白遮罩
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageSize.width;
    outputCanvas.height = imageSize.height;
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return;

    // 黑色背景（保留区域）
    outputCtx.fillStyle = '#000000';
    outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

    // 获取遮罩数据
    const maskData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const outputData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);

    // 将有颜色的区域变成白色（擦除区域）
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 0) { // 如果有透明度（被涂抹）
        outputData.data[i] = 255;     // R
        outputData.data[i + 1] = 255; // G
        outputData.data[i + 2] = 255; // B
        outputData.data[i + 3] = 255; // A
      }
    }

    outputCtx.putImageData(outputData, 0, 0);

    // 导出为 data URL
    const maskDataUrl = outputCanvas.toDataURL('image/png');
    onConfirm(maskDataUrl, mode === 'repaint' ? repaintPrompt : undefined);
  }, [imageSize, onConfirm, mode, repaintPrompt]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, handleUndo, handleRedo]);

  if (!imageLoaded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
      {/* 顶部工具栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-4">
        {/* 画笔大小 */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <input
            type="range"
            min="5"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="w-6 h-6 rounded-full bg-gray-400" />
        </div>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* 撤销/重做 */}
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 size={18} className="text-gray-600" />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} className="text-gray-600" />
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200" />

        {/* 清空 */}
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          清空
        </button>
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
      >
        <X size={24} />
      </button>

      {/* 画布容器 */}
      <div
        ref={containerRef}
        className="relative mt-16 mb-20"
        style={{
          width: displaySize.width,
          height: displaySize.height,
          cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${brushSize}' height='${brushSize}' viewBox='0 0 ${brushSize} ${brushSize}'%3E%3Ccircle cx='${brushSize/2}' cy='${brushSize/2}' r='${brushSize/2 - 1}' fill='rgba(59,130,246,0.3)' stroke='white' stroke-width='1'/%3E%3C/svg%3E") ${brushSize/2} ${brushSize/2}, crosshair`,
        }}
      >
        {/* 原始图片 canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          style={{
            width: displaySize.width,
            height: displaySize.height,
          }}
        />

        {/* 遮罩绘制 canvas */}
        <canvas
          ref={maskCanvasRef}
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          style={{
            width: displaySize.width,
            height: displaySize.height,
          }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />

        {/* 局部重绘输入框 */}
        {mode === 'repaint' && hasMask && maskBounds && (
          <div
            className="absolute z-10"
            style={{
              left: inputPosition.x,
              top: inputPosition.y,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 px-4 py-2 min-w-[280px]">
              <input
                ref={inputRef}
                type="text"
                value={repaintPrompt}
                onChange={(e) => setRepaintPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && repaintPrompt.trim()) {
                    handleConfirm();
                  }
                }}
                placeholder="描述想重绘的内容..."
                className="flex-1 bg-transparent border-none focus:outline-none text-gray-700 text-sm placeholder-gray-400"
              />
              <button
                onClick={handleConfirm}
                disabled={!repaintPrompt.trim()}
                className="ml-2 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 底部确认按钮 - 仅擦除模式显示 */}
      {mode === 'erase' && (
        <div className="absolute bottom-8">
          <button
            onClick={handleConfirm}
            disabled={!hasMask}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full font-medium shadow-lg transition-colors"
          >
            擦除所选区域
          </button>
        </div>
      )}

      {/* 提示文字 */}
      {!hasMask && (
        <div className="absolute bottom-24 text-white/60 text-sm">
          {mode === 'erase' ? '用鼠标在图片上涂抹要擦除的区域' : '用鼠标在图片上涂抹要重绘的区域'}
        </div>
      )}
    </div>
  );
}
