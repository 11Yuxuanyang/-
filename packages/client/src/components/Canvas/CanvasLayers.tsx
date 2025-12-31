/**
 * 画布图层面板
 * 显示所有图片元素，支持选择和删除
 */

import { useState } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import { CanvasItem } from '@/types';

interface CanvasLayersProps {
  items: CanvasItem[];
  selectedIds: string[];
  onSelect: (item: CanvasItem) => void;
  onDelete: (id: string) => void;
}

export function CanvasLayers({ items, selectedIds, onSelect, onDelete }: CanvasLayersProps) {
  const [showLayers, setShowLayers] = useState(false);

  // 只显示有图片的图层
  const imageItems = items.filter(item => item.type === 'image' && item.src);

  if (imageItems.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40">
      <button
        onClick={() => setShowLayers(!showLayers)}
        className={`p-2.5 rounded-xl shadow-sm border transition-colors ${
          showLayers
            ? 'bg-violet-50 border-violet-300 text-violet-600'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
        title="图层"
      >
        <Layers size={18} />
      </button>

      {/* 图层下拉面板 */}
      {showLayers && (
        <div className="absolute top-full right-0 mt-2 w-72 max-h-96 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">图层</h3>
            <span className="text-xs text-gray-400">{imageItems.length} 张图片</span>
          </div>
          <div className="overflow-y-auto max-h-80">
            <div className="py-1">
              {[...imageItems].sort((a, b) => b.zIndex - a.zIndex).map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setShowLayers(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                    selectedIds.includes(item.id)
                      ? 'bg-violet-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* 缩略图 */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    <img src={item.src} alt="" className="w-full h-full object-cover" />
                  </div>

                  {/* 名称 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      图片 {index + 1}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{item.prompt || '无提示词'}</p>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
