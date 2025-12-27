import { useState, useCallback } from 'react';
import { CanvasItem } from '../types';

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseCroppingProps {
  items: CanvasItem[];
  setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
}

interface UseCroppingReturn {
  croppingImageId: string | null;
  cropBox: CropBox;
  setCropBox: React.Dispatch<React.SetStateAction<CropBox>>;
  startCropping: (imageId: string) => void;
  applyCrop: () => void;
  cancelCrop: () => void;
  isCropping: boolean;
}

export function useCropping({ items, setItems }: UseCroppingProps): UseCroppingReturn {
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });

  // 开始裁切图片 - 使用原始图片（可还原设计）
  const startCropping = useCallback((imageId: string) => {
    const item = items.find(i => i.id === imageId);
    if (!item || item.type !== 'image') return;

    setCroppingImageId(imageId);

    // 如果有保存的裁剪位置，恢复到之前的裁剪状态
    if (item.originalSrc && item.cropX !== undefined && item.cropY !== undefined) {
      setCropBox({
        x: item.cropX,
        y: item.cropY,
        width: item.width,
        height: item.height
      });
    } else {
      // 首次裁剪，覆盖整个图片
      setCropBox({ x: 0, y: 0, width: item.width, height: item.height });
    }
  }, [items]);

  // 应用裁切
  const applyCrop = useCallback(() => {
    if (!croppingImageId) return;

    const item = items.find(i => i.id === croppingImageId);
    if (!item || item.type !== 'image') return;

    // 使用原始图片进行裁剪
    const originalSrc = item.originalSrc || item.src;
    const originalW = item.originalWidth || item.width;
    const originalH = item.originalHeight || item.height;

    // 如果裁剪区域就是完整图片，只需退出裁剪模式（或还原）
    if (cropBox.x === 0 && cropBox.y === 0 && cropBox.width === originalW && cropBox.height === originalH) {
      // 还原到原始图片
      if (item.originalSrc) {
        setItems(prev => prev.map(i =>
          i.id === croppingImageId
            ? {
                ...i,
                src: item.originalSrc!,
                // 恢复原始位置
                x: i.originalX ?? i.x,
                y: i.originalY ?? i.y,
                width: originalW,
                height: originalH,
                originalSrc: undefined,
                originalWidth: undefined,
                originalHeight: undefined,
                originalX: undefined,
                originalY: undefined,
                cropX: undefined,
                cropY: undefined
              }
            : i
        ));
      }
      setCroppingImageId(null);
      return;
    }

    // 创建 canvas 进行裁切
    const img = new window.Image();
    img.src = originalSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 计算实际裁切区域（相对于原图）
      const scaleX = img.naturalWidth / originalW;
      const scaleY = img.naturalHeight / originalH;

      canvas.width = cropBox.width * scaleX;
      canvas.height = cropBox.height * scaleY;

      ctx.drawImage(
        img,
        cropBox.x * scaleX,
        cropBox.y * scaleY,
        cropBox.width * scaleX,
        cropBox.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const croppedSrc = canvas.toDataURL('image/png');

      setItems(prev => prev.map(i => {
        if (i.id !== croppingImageId) return i;

        // 获取原始位置（首次裁剪用当前位置，再次裁剪用保存的原始位置）
        const origX = i.originalX ?? i.x;
        const origY = i.originalY ?? i.y;

        return {
          ...i,
          src: croppedSrc,
          // 更新位置：原始位置 + 裁剪框偏移（cropBox 是相对于原始图片的）
          x: origX + cropBox.x,
          y: origY + cropBox.y,
          width: cropBox.width,
          height: cropBox.height,
          // 保存原始图片信息（如果还没有）
          originalSrc: i.originalSrc || i.src,
          originalWidth: i.originalWidth || i.width,
          originalHeight: i.originalHeight || i.height,
          // 保存原始位置（用于还原）
          originalX: origX,
          originalY: origY,
          // 保存裁剪位置
          cropX: cropBox.x,
          cropY: cropBox.y,
        };
      }));

      setCroppingImageId(null);
    };
  }, [croppingImageId, cropBox, items, setItems]);

  // 取消裁切
  const cancelCrop = useCallback(() => {
    setCroppingImageId(null);
  }, []);

  return {
    croppingImageId,
    cropBox,
    setCropBox,
    startCropping,
    applyCrop,
    cancelCrop,
    isCropping: croppingImageId !== null,
  };
}
