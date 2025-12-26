/**
 * Excel 文件处理器
 */

import * as XLSX from 'xlsx';
import { ParsedDocument, DocumentStructure } from '../../types/document.js';

export class ExcelProcessor {
  async parse(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheets = workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];

      // 转换为 JSON 数组
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,  // 使用数组而非对象
        defval: ''  // 空单元格默认值
      }) as string[][];

      // 提取表头（第一行）
      const headers = jsonData[0] || [];
      const rows = jsonData.slice(1);

      return {
        name: sheetName,
        headers: headers.map(h => String(h)),
        rows: rows.map(row => row.map(cell => String(cell)))
      };
    });

    // 生成文本内容用于 LLM
    const content = this.formatForLLM(sheets);

    return {
      fileName,
      fileType: 'excel',
      content,
      structure: { sheets },
      metadata: {
        fileSize: buffer.length,
        uploadedAt: new Date(),
        sheetCount: sheets.length
      }
    };
  }

  private formatForLLM(sheets: DocumentStructure['sheets']): string {
    if (!sheets) return '';

    return sheets.map(sheet => {
      let text = `## 工作表: ${sheet.name}\n\n`;

      // 格式化为 Markdown 表格
      if (sheet.headers && sheet.headers.length > 0 && sheet.headers.some(h => h)) {
        text += `| ${sheet.headers.join(' | ')} |\n`;
        text += `| ${sheet.headers.map(() => '---').join(' | ')} |\n`;

        sheet.rows.forEach(row => {
          // 确保行的列数与表头一致
          const paddedRow = [...row];
          while (paddedRow.length < sheet.headers!.length) {
            paddedRow.push('');
          }
          text += `| ${paddedRow.slice(0, sheet.headers!.length).join(' | ')} |\n`;
        });
      } else {
        // 无表头，直接列出行
        sheet.rows.forEach((row, idx) => {
          text += `第 ${idx + 1} 行: ${row.join(', ')}\n`;
        });
      }

      return text;
    }).join('\n\n');
  }
}
