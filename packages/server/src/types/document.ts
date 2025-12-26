/**
 * 文档解析类型定义
 */

export interface ParsedDocument {
  fileName: string;
  fileType: 'excel' | 'word' | 'powerpoint' | 'pdf' | 'text';
  content: string;           // 主要文本内容（LLM 可读格式）
  structure?: DocumentStructure;
  metadata: DocumentMetadata;
}

export interface DocumentStructure {
  // Excel
  sheets?: Array<{
    name: string;
    rows: string[][];
    headers?: string[];
  }>;

  // Word
  paragraphs?: Array<{
    type: 'heading' | 'paragraph' | 'list';
    level?: number;
    text: string;
  }>;

  // PowerPoint
  slides?: Array<{
    index: number;
    title?: string;
    content: string[];
  }>;

  // PDF
  pages?: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export interface DocumentMetadata {
  fileSize: number;
  uploadedAt: Date;
  pageCount?: number;
  sheetCount?: number;
  slideCount?: number;
}
