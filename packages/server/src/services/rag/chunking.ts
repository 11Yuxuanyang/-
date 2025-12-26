/**
 * 文档分块服务
 * 将文档切分为适合向量检索的片段
 */

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    chunkIndex: number;
    totalChunks: number;
    startOffset: number;
    endOffset: number;
    // Excel 特有
    sheetName?: string;
    rowRange?: string;
    // PPT 特有
    slideNumber?: number;
    // PDF 特有
    pageNumber?: number;
  };
}

export interface ChunkingOptions {
  chunkSize?: number;      // 每个片段的目标字符数
  chunkOverlap?: number;   // 片段间重叠字符数
  preserveStructure?: boolean; // 是否保留结构（表格行、幻灯片等）
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;

/**
 * 文档分块器
 */
export class DocumentChunker {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(options?: ChunkingOptions) {
    this.chunkSize = options?.chunkSize || DEFAULT_CHUNK_SIZE;
    this.chunkOverlap = options?.chunkOverlap || DEFAULT_CHUNK_OVERLAP;
  }

  /**
   * 分块纯文本
   */
  chunkText(
    text: string,
    documentId: string,
    fileName: string,
    fileType: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    // 按段落分割
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let startOffset = 0;
    let currentOffset = 0;

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();
      if (!trimmedPara) {
        currentOffset += paragraph.length + 2; // +2 for \n\n
        continue;
      }

      // 如果当前片段加上新段落超过大小限制
      if (currentChunk.length + trimmedPara.length > this.chunkSize && currentChunk.length > 0) {
        // 保存当前片段
        chunks.push(this.createChunk(
          documentId,
          currentChunk.trim(),
          fileName,
          fileType,
          chunks.length,
          startOffset,
          currentOffset
        ));

        // 开始新片段，保留重叠部分
        const overlapText = this.getOverlapText(currentChunk);
        currentChunk = overlapText + (overlapText ? '\n\n' : '') + trimmedPara;
        startOffset = currentOffset - overlapText.length;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara;
      }

      currentOffset += paragraph.length + 2;
    }

    // 保存最后一个片段
    if (currentChunk.trim()) {
      chunks.push(this.createChunk(
        documentId,
        currentChunk.trim(),
        fileName,
        fileType,
        chunks.length,
        startOffset,
        currentOffset
      ));
    }

    // 更新 totalChunks
    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * 分块 Excel 数据
   * 按工作表和行范围分块
   */
  chunkExcel(
    sheets: Array<{ name: string; headers?: string[]; rows: string[][] }>,
    documentId: string,
    fileName: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const sheet of sheets) {
      const headerLine = sheet.headers?.join(' | ') || '';
      const rowsPerChunk = Math.max(1, Math.floor(this.chunkSize / 100)); // 估算每行约100字符

      for (let i = 0; i < sheet.rows.length; i += rowsPerChunk) {
        const rowSlice = sheet.rows.slice(i, i + rowsPerChunk);
        const content = this.formatExcelChunk(headerLine, rowSlice, sheet.name, i + 1);

        chunks.push({
          id: `${documentId}_${chunks.length}`,
          documentId,
          content,
          metadata: {
            fileName,
            fileType: 'excel',
            chunkIndex: chunks.length,
            totalChunks: 0, // 稍后更新
            startOffset: i,
            endOffset: i + rowSlice.length,
            sheetName: sheet.name,
            rowRange: `${i + 1}-${i + rowSlice.length}`,
          },
        });
      }
    }

    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * 分块 PowerPoint 幻灯片
   * 每张幻灯片作为一个片段
   */
  chunkPPT(
    slides: Array<{ index: number; title?: string; content: string[] }>,
    documentId: string,
    fileName: string
  ): DocumentChunk[] {
    return slides.map((slide, idx) => {
      let content = `幻灯片 ${slide.index}`;
      if (slide.title) content += `: ${slide.title}`;
      content += '\n\n' + slide.content.join('\n');

      return {
        id: `${documentId}_${idx}`,
        documentId,
        content,
        metadata: {
          fileName,
          fileType: 'powerpoint',
          chunkIndex: idx,
          totalChunks: slides.length,
          startOffset: idx,
          endOffset: idx + 1,
          slideNumber: slide.index,
        },
      };
    });
  }

  /**
   * 分块 PDF 页面
   * 按页面分块，如果页面太长则进一步分割
   */
  chunkPDF(
    pages: Array<{ pageNumber: number; text: string }>,
    documentId: string,
    fileName: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const page of pages) {
      if (page.text.length <= this.chunkSize) {
        // 页面内容不超过限制，整页作为一个片段
        chunks.push({
          id: `${documentId}_${chunks.length}`,
          documentId,
          content: `[第 ${page.pageNumber} 页]\n\n${page.text}`,
          metadata: {
            fileName,
            fileType: 'pdf',
            chunkIndex: chunks.length,
            totalChunks: 0,
            startOffset: 0,
            endOffset: page.text.length,
            pageNumber: page.pageNumber,
          },
        });
      } else {
        // 页面内容超过限制，进一步分块
        const pageChunks = this.chunkText(
          page.text,
          documentId,
          fileName,
          'pdf'
        );
        for (const chunk of pageChunks) {
          chunk.content = `[第 ${page.pageNumber} 页]\n\n${chunk.content}`;
          chunk.metadata.pageNumber = page.pageNumber;
          chunk.id = `${documentId}_${chunks.length}`;
          chunk.metadata.chunkIndex = chunks.length;
          chunks.push(chunk);
        }
      }
    }

    chunks.forEach(chunk => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  private createChunk(
    documentId: string,
    content: string,
    fileName: string,
    fileType: string,
    index: number,
    startOffset: number,
    endOffset: number
  ): DocumentChunk {
    return {
      id: `${documentId}_${index}`,
      documentId,
      content,
      metadata: {
        fileName,
        fileType,
        chunkIndex: index,
        totalChunks: 0,
        startOffset,
        endOffset,
      },
    };
  }

  private getOverlapText(text: string): string {
    if (text.length <= this.chunkOverlap) return text;

    // 尝试在句子边界截断
    const lastPart = text.slice(-this.chunkOverlap * 2);
    const sentenceEnd = lastPart.search(/[。！？.!?]\s*/);
    if (sentenceEnd > 0) {
      return lastPart.slice(sentenceEnd + 1).trim();
    }

    return text.slice(-this.chunkOverlap);
  }

  private formatExcelChunk(
    headerLine: string,
    rows: string[][],
    sheetName: string,
    startRow: number
  ): string {
    let content = `[工作表: ${sheetName}, 行 ${startRow}-${startRow + rows.length - 1}]\n\n`;

    if (headerLine) {
      content += `表头: ${headerLine}\n\n`;
    }

    rows.forEach((row, idx) => {
      content += `第 ${startRow + idx} 行: ${row.join(' | ')}\n`;
    });

    return content;
  }
}

// 导出默认实例
export const documentChunker = new DocumentChunker();
