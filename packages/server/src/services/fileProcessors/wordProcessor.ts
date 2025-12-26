/**
 * Word 文件处理器
 */

import mammoth from 'mammoth';
import { ParsedDocument } from '../../types/document.js';

export class WordProcessor {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    // 提取纯文本
    const result = await mammoth.extractRawText({ buffer });

    // 提取 HTML 用于分析结构
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const paragraphs = this.extractParagraphs(htmlResult.value);

    return {
      fileName,
      fileType: 'word',
      content: result.value,
      structure: { paragraphs },
      metadata: {
        fileSize: buffer.length,
        uploadedAt: new Date()
      }
    };
  }

  private extractParagraphs(html: string) {
    const paragraphs: Array<{ type: 'heading' | 'paragraph' | 'list'; level?: number; text: string }> = [];

    // 提取标题
    const headingRegex = /<h(\d)[^>]*>(.*?)<\/h\d>/gi;
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
      paragraphs.push({
        type: 'heading',
        level: parseInt(match[1]),
        text: this.stripHtml(match[2])
      });
    }

    // 提取段落
    const pRegex = /<p[^>]*>(.*?)<\/p>/gi;
    while ((match = pRegex.exec(html)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      if (text) {
        paragraphs.push({
          type: 'paragraph',
          text
        });
      }
    }

    // 提取列表项
    const liRegex = /<li[^>]*>(.*?)<\/li>/gi;
    while ((match = liRegex.exec(html)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      if (text) {
        paragraphs.push({
          type: 'list',
          text
        });
      }
    }

    return paragraphs;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '');
  }
}
