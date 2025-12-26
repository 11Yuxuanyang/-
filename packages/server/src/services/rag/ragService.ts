/**
 * RAG (Retrieval-Augmented Generation) 服务
 * 整合文档解析、分块、嵌入和检索
 */

import { v4 as uuidv4 } from 'uuid';
import { documentParser } from '../documentParser.js';
import { ParsedDocument } from '../../types/document.js';
import { DocumentChunk, documentChunker } from './chunking.js';
import { getEmbeddingService } from './embeddings.js';
import { vectorStore, SearchResult } from './vectorStore.js';

export interface IndexedDocument {
  id: string;
  fileName: string;
  fileType: string;
  chunkCount: number;
  indexedAt: Date;
}

export interface RAGContext {
  query: string;
  relevantChunks: Array<{
    content: string;
    score: number;
    metadata: DocumentChunk['metadata'];
  }>;
  documentIds: string[];
}

/**
 * RAG 服务
 */
export class RAGService {
  private initialized = false;

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await vectorStore.init();
    this.initialized = true;
    console.log('[RAG] 服务已初始化');
  }

  /**
   * 索引文档
   * 解析文档 → 分块 → 向量化 → 存储
   */
  async indexDocument(
    buffer: Buffer,
    fileName: string,
    mimeType?: string
  ): Promise<IndexedDocument> {
    await this.init();

    const documentId = `doc_${uuidv4()}`;
    console.log(`[RAG] 开始索引文档: ${fileName} (${documentId})`);

    // 1. 解析文档
    const parsed = await documentParser.parse(buffer, fileName, mimeType);
    console.log(`[RAG] 文档解析完成: ${parsed.fileType}`);

    // 2. 分块
    const chunks = this.chunkDocument(parsed, documentId);
    console.log(`[RAG] 文档分块完成: ${chunks.length} 个片段`);

    if (chunks.length === 0) {
      throw new Error('文档内容为空，无法索引');
    }

    // 3. 向量化
    const embeddings = getEmbeddingService();
    const texts = chunks.map(c => c.content);
    const vectors = await embeddings.embedBatch(texts);
    console.log(`[RAG] 向量化完成: ${vectors.length} 个向量`);

    // 4. 存储
    await vectorStore.store(chunks, vectors);
    console.log(`[RAG] 存储完成`);

    return {
      id: documentId,
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      chunkCount: chunks.length,
      indexedAt: new Date(),
    };
  }

  /**
   * 从 base64 索引文档
   */
  async indexDocumentFromBase64(
    base64Data: string,
    fileName: string,
    mimeType?: string
  ): Promise<IndexedDocument> {
    const base64Content = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;
    const buffer = Buffer.from(base64Content, 'base64');
    return this.indexDocument(buffer, fileName, mimeType);
  }

  /**
   * 检索相关内容
   */
  async retrieve(
    query: string,
    options?: {
      documentIds?: string[];
      limit?: number;
      minScore?: number;
    }
  ): Promise<RAGContext> {
    await this.init();

    const limit = options?.limit || 5;
    const embeddings = getEmbeddingService();

    // 向量化查询
    const queryVector = await embeddings.embed(query);

    // 检索
    let results: SearchResult[] = [];

    if (options?.documentIds && options.documentIds.length > 0) {
      // 在指定文档中检索
      for (const docId of options.documentIds) {
        const docResults = await vectorStore.search(queryVector, {
          limit: Math.ceil(limit / options.documentIds.length) + 2,
          documentId: docId,
          minScore: options.minScore,
        });
        results.push(...docResults);
      }
      // 按分数排序并限制数量
      results.sort((a, b) => b.score - a.score);
      results = results.slice(0, limit);
    } else {
      // 全局检索
      results = await vectorStore.search(queryVector, {
        limit,
        minScore: options?.minScore,
      });
    }

    console.log(`[RAG] 检索完成: ${results.length} 个相关片段`);

    return {
      query,
      relevantChunks: results.map(r => ({
        content: r.chunk.content,
        score: r.score,
        metadata: r.chunk.metadata,
      })),
      documentIds: [...new Set(results.map(r => r.chunk.documentId))],
    };
  }

  /**
   * 构建 RAG 上下文提示词
   */
  buildContextPrompt(context: RAGContext): string {
    if (context.relevantChunks.length === 0) {
      return '';
    }

    let prompt = '\n\n<retrieved_documents>\n';
    prompt += `<query>${context.query}</query>\n`;
    prompt += `<relevant_chunks count="${context.relevantChunks.length}">\n`;

    context.relevantChunks.forEach((chunk, idx) => {
      prompt += `<chunk index="${idx + 1}" score="${chunk.score.toFixed(3)}">\n`;
      prompt += `  <source>\n`;
      prompt += `    <file>${chunk.metadata.fileName}</file>\n`;
      prompt += `    <type>${chunk.metadata.fileType}</type>\n`;

      if (chunk.metadata.sheetName) {
        prompt += `    <sheet>${chunk.metadata.sheetName}</sheet>\n`;
        prompt += `    <rows>${chunk.metadata.rowRange}</rows>\n`;
      }
      if (chunk.metadata.slideNumber) {
        prompt += `    <slide>${chunk.metadata.slideNumber}</slide>\n`;
      }
      if (chunk.metadata.pageNumber) {
        prompt += `    <page>${chunk.metadata.pageNumber}</page>\n`;
      }

      prompt += `  </source>\n`;
      prompt += `  <content>\n${chunk.content}\n  </content>\n`;
      prompt += `</chunk>\n\n`;
    });

    prompt += '</relevant_chunks>\n';
    prompt += '</retrieved_documents>\n';
    prompt += '<instruction>以上是从用户上传的文档中检索到的相关内容。请基于这些内容回答用户的问题。如果信息不足，请明确告知。</instruction>';

    return prompt;
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.init();
    await vectorStore.deleteDocument(documentId);
    console.log(`[RAG] 已删除文档: ${documentId}`);
  }

  /**
   * 获取已索引的文档列表
   */
  async listDocuments(): Promise<Array<{ documentId: string; fileName: string; chunkCount: number }>> {
    await this.init();
    return vectorStore.listDocuments();
  }

  /**
   * 检查文档是否已索引
   */
  async isDocumentIndexed(documentId: string): Promise<boolean> {
    await this.init();
    return vectorStore.documentExists(documentId);
  }

  /**
   * 根据文档类型进行分块
   */
  private chunkDocument(parsed: ParsedDocument, documentId: string): DocumentChunk[] {
    switch (parsed.fileType) {
      case 'excel':
        if (parsed.structure?.sheets) {
          return documentChunker.chunkExcel(
            parsed.structure.sheets,
            documentId,
            parsed.fileName
          );
        }
        break;

      case 'powerpoint':
        if (parsed.structure?.slides) {
          return documentChunker.chunkPPT(
            parsed.structure.slides,
            documentId,
            parsed.fileName
          );
        }
        break;

      case 'pdf':
        if (parsed.structure?.pages) {
          return documentChunker.chunkPDF(
            parsed.structure.pages,
            documentId,
            parsed.fileName
          );
        }
        break;
    }

    // 默认使用文本分块
    return documentChunker.chunkText(
      parsed.content,
      documentId,
      parsed.fileName,
      parsed.fileType
    );
  }
}

// 导出单例
export const ragService = new RAGService();
