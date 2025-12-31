import { useState, useCallback } from 'react';
import { CanvasItem } from '../types';
import { generateId } from '../utils/id';
import { PASTE_OFFSET } from '../constants/canvas';

interface UseClipboardProps {
  items: CanvasItem[];
  setItems: React.Dispatch<React.SetStateAction<CanvasItem[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  getMousePosition: () => { x: number; y: number };
}

interface UseClipboardReturn {
  clipboard: CanvasItem[];
  copy: () => void;
  cut: () => void;
  paste: () => void;
  duplicate: () => void;
  clearClipboard: () => void;
}

export function useClipboard({
  items,
  setItems,
  selectedIds,
  setSelectedIds,
  getMousePosition,
}: UseClipboardProps): UseClipboardReturn {
  const [clipboard, setClipboard] = useState<CanvasItem[]>([]);

  // 复制
  const copy = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    setClipboard(selectedItems);
  }, [items, selectedIds]);

  // 剪切
  const cut = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    setClipboard(selectedItems);
    setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
    setSelectedIds([]);
  }, [items, selectedIds, setItems, setSelectedIds]);

  // 粘贴到鼠标位置
  const paste = useCallback(() => {
    if (clipboard.length === 0) return;

    // 计算剪贴板元素的边界框中心
    const minX = Math.min(...clipboard.map(i => i.x));
    const minY = Math.min(...clipboard.map(i => i.y));
    const maxX = Math.max(...clipboard.map(i => i.x + i.width));
    const maxY = Math.max(...clipboard.map(i => i.y + i.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 计算偏移量：将中心移动到鼠标位置
    const mousePos = getMousePosition();
    const offsetX = mousePos.x - centerX;
    const offsetY = mousePos.y - centerY;

    const newItems = clipboard.map(item => ({
      ...item,
      id: generateId(),
      x: item.x + offsetX,
      y: item.y + offsetY,
      zIndex: items.length + 1,
      points: item.points?.map(p => ({ x: p.x + offsetX, y: p.y + offsetY })),
      startPoint: item.startPoint ? { x: item.startPoint.x + offsetX, y: item.startPoint.y + offsetY } : undefined,
      endPoint: item.endPoint ? { x: item.endPoint.x + offsetX, y: item.endPoint.y + offsetY } : undefined,
    }));

    setItems(prev => [...prev, ...newItems]);
    setSelectedIds(newItems.map(i => i.id));
  }, [clipboard, items, setItems, setSelectedIds, getMousePosition]);

  // 快速复制（原地偏移复制）
  const duplicate = useCallback(() => {
    if (selectedIds.length === 0) return;

    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const newItems = selectedItems.map(item => ({
      ...item,
      id: generateId(),
      x: item.x + PASTE_OFFSET,
      y: item.y + PASTE_OFFSET,
      zIndex: items.length + 1,
      points: item.points?.map(p => ({ x: p.x + PASTE_OFFSET, y: p.y + PASTE_OFFSET })),
      startPoint: item.startPoint ? { x: item.startPoint.x + PASTE_OFFSET, y: item.startPoint.y + PASTE_OFFSET } : undefined,
      endPoint: item.endPoint ? { x: item.endPoint.x + PASTE_OFFSET, y: item.endPoint.y + PASTE_OFFSET } : undefined,
    }));

    setItems(prev => [...prev, ...newItems]);
    setSelectedIds(newItems.map(i => i.id));
  }, [items, selectedIds, setItems, setSelectedIds]);

  // 清空剪贴板
  const clearClipboard = useCallback(() => {
    setClipboard([]);
  }, []);

  return {
    clipboard,
    copy,
    cut,
    paste,
    duplicate,
    clearClipboard,
  };
}
