/**
 * PDF 文件处理器
 * 使用 pdf-parse 解析 PDF 文件
 */

import { ParsedDocument } from '../../types/document.js';

type PdfParseFunc = (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
let pdfParse: PdfParseFunc | null = null;

async function getPdfParse(): Promise<PdfParseFunc> {
  if (!pdfParse) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const module = await import('pdf-parse') as any;
    pdfParse = module.default ?? module;
  }
  return pdfParse!;
}

interface PDFData {
  text: string;
  numpages: number;
}

export class PDFProcessor {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    const parse = await getPdfParse();
    const data: PDFData = await parse(buffer);

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
