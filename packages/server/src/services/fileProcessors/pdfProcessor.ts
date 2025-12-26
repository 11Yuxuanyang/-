/**
 * PDF 文件处理器
 * 使用 pdf-parse 解析 PDF 文件
 */

import { ParsedDocument } from '../../types/document.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

interface PDFData {
  text: string;
  numpages: number;
}

export class PDFProcessor {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    const data: PDFData = await pdfParse(buffer);

    // 按页分割（\f 是分页符）
    const pageTexts = data.text.split('\f');
    const pages = pageTexts
      .map((text: string, idx: number) => ({
        pageNumber: idx + 1,
        text: text.trim()
      }))
      .filter((page: { text: string }) => page.text); // 过滤空页

    // 格式化内容
    const content = pages.length > 1
      ? pages.map((p: { pageNumber: number; text: string }) => `## 第 ${p.pageNumber} 页\n\n${p.text}`).join('\n\n---\n\n')
      : data.text;

    return {
      fileName,
      fileType: 'pdf',
      content,
      structure: { pages },
      metadata: {
        fileSize: buffer.length,
        uploadedAt: new Date(),
        pageCount: data.numpages
      }
    };
  }
}
