/**
 * PowerPoint 文件处理器
 */

import AdmZip, { IZipEntry } from 'adm-zip';
import { parseStringPromise } from 'xml2js';
import { ParsedDocument } from '../../types/document.js';

export class PPTProcessor {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    const zip = new AdmZip(buffer);
    const slides: Array<{ index: number; title?: string; content: string[] }> = [];

    // PPTX 是 ZIP 格式，幻灯片在 ppt/slides/ 目录
    const slideEntries = zip.getEntries().filter((entry: IZipEntry) =>
      entry.entryName.match(/ppt\/slides\/slide\d+\.xml/)
    );

    // 按幻灯片编号排序
    slideEntries.sort((a: IZipEntry, b: IZipEntry) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/)?.[1] || '0');
      const numB = parseInt(b.entryName.match(/slide(\d+)/)?.[1] || '0');
      return numA - numB;
    });

    for (const entry of slideEntries) {
      try {
        const xml = entry.getData().toString('utf8');
        const parsed = await parseStringPromise(xml);

        // 提取文本内容
        const texts = this.extractTexts(parsed);

        slides.push({
          index: slides.length + 1,
          title: texts[0] || undefined,  // 第一个文本框通常是标题
          content: texts.slice(1)
        });
      } catch (error) {
        console.warn(`[PPT] 解析幻灯片失败: ${entry.entryName}`, error);
      }
    }

    // 格式化为文本
    const content = slides.map((slide) => {
      let text = `## 幻灯片 ${slide.index}`;
      if (slide.title) text += `: ${slide.title}`;
      text += '\n\n';
      if (slide.content.length > 0) {
        text += slide.content.map(c => `- ${c}`).join('\n');
      }
      return text;
    }).join('\n\n---\n\n');

    return {
      fileName,
      fileType: 'powerpoint',
      content,
      structure: { slides },
      metadata: {
        fileSize: buffer.length,
        uploadedAt: new Date(),
        slideCount: slides.length
      }
    };
  }

  private extractTexts(xmlObj: unknown): string[] {
    const texts: string[] = [];

    // 递归查找所有 <a:t> 标签（文本内容）
    const findTexts = (obj: unknown) => {
      if (!obj || typeof obj !== 'object') return;

      const record = obj as Record<string, unknown>;

      if (record['a:t']) {
        const textArray = Array.isArray(record['a:t']) ? record['a:t'] : [record['a:t']];
        textArray.forEach((t: unknown) => {
          if (typeof t === 'string' && t.trim()) {
            texts.push(t.trim());
          } else if (t && typeof t === 'object' && '_' in (t as Record<string, unknown>)) {
            const text = (t as Record<string, string>)._;
            if (text && text.trim()) texts.push(text.trim());
          }
        });
      }

      Object.values(record).forEach(value => {
        if (typeof value === 'object') findTexts(value);
      });
    };

    findTexts(xmlObj);

    // 合并连续的短文本（可能是同一段的碎片）
    const merged: string[] = [];
    let current = '';
    for (const text of texts) {
      if (current && (current.length + text.length < 50)) {
        current += text;
      } else {
        if (current) merged.push(current);
        current = text;
      }
    }
    if (current) merged.push(current);

    return merged;
  }
}
