// Components
export { CanvasLayers } from './CanvasLayers';
export { CanvasToolbar } from './CanvasToolbar';

// Hooks
export { useCanvasState, type CanvasStateReturn } from './hooks/useCanvasState';
export { useAutoSave } from './hooks/useAutoSave';
export {
  useCanvasInteraction,
  screenToCanvas,
  canvasToScreen,
  findClickedItem,
  calculateBoundingBox,
  type InteractionHandlers,
} from './hooks/useCanvasInteraction';
