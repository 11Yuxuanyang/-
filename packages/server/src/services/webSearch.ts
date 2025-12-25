/**
 * 网络搜索服务
 * 支持 DuckDuckGo 搜索
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/**
 * 使用 DuckDuckGo Instant Answer API 进行搜索
 */
export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResponse> {
  console.log(`[Web Search] 搜索: "${query}"`);

  try {
    // 使用 DuckDuckGo HTML 搜索
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.error('[Web Search] 搜索请求失败:', response.status);
      return { query, results: [] };
    }

    const html = await response.text();

    // 简单解析 HTML 提取搜索结果
    const results = parseSearchResults(html, maxResults);

    console.log(`[Web Search] 找到 ${results.length} 条结果`);
    return { query, results };
  } catch (error) {
    console.error('[Web Search] 搜索出错:', error);
    return { query, results: [] };
  }
}

/**
 * 解析 DuckDuckGo HTML 搜索结果
 */
function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // 使用正则表达式提取搜索结果
  // DuckDuckGo HTML 结果格式: <a class="result__a" href="URL">Title</a>
  // 摘要在 <a class="result__snippet">...</a>

  const resultBlocks = html.match(/<div class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];

  for (const block of resultBlocks.slice(0, maxResults)) {
    // 提取 URL
    const urlMatch = block.match(/href="([^"]+)"\s+class="result__a"/);
    // 提取标题
    const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
    // 提取摘要
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

    if (urlMatch && titleMatch) {
      let url = urlMatch[1];
      // DuckDuckGo 的 URL 可能是重定向链接，需要解析
      if (url.includes('uddg=')) {
        const uddgMatch = url.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          url = decodeURIComponent(uddgMatch[1]);
        }
      }

      results.push({
        title: cleanHtml(titleMatch[1]),
        url: url,
        snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : '',
      });
    }
  }

  return results;
}

/**
 * 清理 HTML 标签和实体
 */
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 将搜索结果格式化为上下文文本
 */
export function formatSearchResultsForContext(searchResponse: SearchResponse): string {
  if (searchResponse.results.length === 0) {
    return '';
  }

  let context = `\n\n【网络搜索结果】搜索词: "${searchResponse.query}"\n`;
  context += '以下是相关的网络搜索结果，请参考这些信息来回答用户的问题：\n\n';

  searchResponse.results.forEach((result, index) => {
    context += `${index + 1}. **${result.title}**\n`;
    context += `   来源: ${result.url}\n`;
    if (result.snippet) {
      context += `   摘要: ${result.snippet}\n`;
    }
    context += '\n';
  });

  context += '请根据以上搜索结果，结合你的知识，为用户提供准确、有帮助的回答。如果搜索结果与问题不相关，请依据你的知识回答。\n';

  return context;
}
