/**
 * 统一文档解析服务
 * 支持 Excel, Word, PowerPoint, PDF 格式
 */

import { ExcelProcessor, WordProcessor, PPTProcessor, PDFProcessor } from './fileProcessors/index.js';
import { ParsedDocument } from '../types/document.js';

// MIME 类型映射
const MIME_TYPE_MAP: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
};

export class DocumentParser {
  private excelProcessor = new ExcelProcessor();
  private wordProcessor = new WordProcessor();
  private pptProcessor = new PPTProcessor();
  private pdfProcessor = new PDFProcessor();

  /**
   * 解析文档
   */
  async parse(buffer: Buffer, fileName: string, mimeType?: string): Promise<ParsedDocument> {
    const extension = this.getExtension(fileName, mimeType);

    console.log(`[DocumentParser] 解析文件: ${fileName}, 类型: ${extension}`);

    switch (extension) {
      case 'xlsx':
      case 'xls':
        return this.excelProcessor.parse(buffer, fileName);

      case 'docx':
      case 'doc':
        return this.wordProcessor.parse(buffer, fileName);

      case 'pptx':
      case 'ppt':
        return this.pptProcessor.parse(buffer, fileName);

      case 'pdf':
        return this.pdfProcessor.parse(buffer, fileName);

      case 'txt':
        return this.parseTextFile(buffer, fileName);

      default:
        throw new Error(`不支持的文件类型: ${extension}`);
    }
  }

  /**
   * 从 base64 数据解析文档
   */
  async parseFromBase64(base64Data: string, fileName: string, mimeType?: string): Promise<ParsedDocument> {
    // 移除 data URL 前缀
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    const buffer = Buffer.from(base64Content, 'base64');
    return this.parse(buffer, fileName, mimeType);
  }

  /**
   * 获取支持的文件扩展名
   */
  getSupportedExtensions(): string[] {
    return ['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'pdf', 'txt'];
  }

  /**
   * 获取支持的 MIME 类型
   */
  getSupportedMimeTypes(): string[] {
    return Object.keys(MIME_TYPE_MAP);
  }

  /**
   * 检查是否为支持的文件类型
   */
  isSupported(fileName: string, mimeType?: string): boolean {
    try {
      const extension = this.getExtension(fileName, mimeType);
      return this.getSupportedExtensions().includes(extension);
    } catch {
      return false;
    }
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(fileName: string, mimeType?: string): string {
    // 优先从文件名获取扩展名
    const extFromName = fileName.split('.').pop()?.toLowerCase();
    if (extFromName && this.getSupportedExtensions().includes(extFromName)) {
      return extFromName;
    }

    // 从 MIME 类型推断
    if (mimeType && MIME_TYPE_MAP[mimeType]) {
      return MIME_TYPE_MAP[mimeType];
    }

    throw new Error(`无法识别文件类型: ${fileName} (${mimeType})`);
  }

  /**
   * 解析纯文本文件
   */
  private async parseTextFile(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    const content = buffer.toString('utf-8');

    return {
      fileName,
      fileType: 'text',
      content,
      metadata: {
        fileSize: buffer.length,
        uploadedAt: new Date()
      }
    };
  }
}

// 导出单例
export const documentParser = new DocumentParser();
