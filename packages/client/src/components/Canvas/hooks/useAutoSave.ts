import { useEffect, useRef, useCallback } from 'react';
import { CanvasItem, Project } from '@/types';
import * as ProjectService from '@/services/projectService';

export interface UseAutoSaveProps {
  project: Project;
  items: CanvasItem[];
  projectName: string;
  scale: number;
  pan: { x: number; y: number };
  debounceMs?: number;
}

export function useAutoSave({
  project,
  items,
  projectName,
  scale,
  pan,
  debounceMs = 500,
}: UseAutoSaveProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);

  const save = useCallback(() => {
    const firstImage = items.find((i) => i.type === 'image');
    const updatedProject: Project = {
      ...project,
      name: projectName,
      items,
      thumbnail: firstImage?.src,
      viewport: { scale, pan },
      updatedAt: Date.now(),
    };
    ProjectService.saveProject(updatedProject);
    lastSaveRef.current = Date.now();
  }, [project, items, projectName, scale, pan]);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, scale, pan, projectName, save, debounceMs]);

  // Save on unmount
  useEffect(() => {
    return () => {
      save();
    };
  }, [save]);

  // Manual save function
  const saveNow = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    save();
  }, [save]);

  return {
    saveNow,
    lastSaveTime: lastSaveRef.current,
  };
}
