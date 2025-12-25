/**
 * Mock Chat Provider - 用于测试，无需 API key
 */

import { ChatProvider, ChatRequest, ChatResponse } from './chat-base.js';

export class MockChatProvider implements ChatProvider {
  name = 'mock-chat';

  private mockResponses: Record<string, string> = {
    '剧本': `好的，我来帮您构思一个剧本框架：

## 剧本大纲

**第一幕：开场**
- 场景：清晨的咖啡馆
- 主角出场，建立人物性格
- 引入主要冲突

**第二幕：发展**
- 主角遭遇困境
- 次要角色登场
- 情节逐渐升级

**第三幕：高潮**
- 矛盾激化到顶点
- 主角做出关键抉择

**第四幕：结局**
- 冲突解决
- 人物成长展现
- 留下余韵

您想从哪个部分开始详细展开？`,

    '场景': `## 场景描述

**内景 - 废弃工厂 - 夜晚**

月光从破碎的天窗倾泻而下，在满是灰尘的地面上投下斑驳的光影。生锈的机器静默矗立，像是沉睡的钢铁巨兽。

空气中弥漫着机油和铁锈的气味。远处传来水滴落在金属上的回响，在寂静中格外清晰。

主角的脚步声打破了这份宁静，每一步都扬起细小的尘埃，在光柱中缓缓飘舞。

---

需要我为这个场景添加更多细节，或者创作其他场景吗？`,

    '对白': `## 对白示例

**角色A**（紧张地）
你真的要离开吗？

**角色B**（背对着A，沉默良久）
有些事，必须自己去面对。

**角色A**（向前一步）
可是...

**角色B**（转身，眼神坚定）
不是告别，是暂别。等我回来。

**角色A**（强忍泪水，点头）
我等你。

---

这段对白的情感基调是离别前的不舍与坚定。需要调整语气或添加动作描写吗？`,

    '人物': `## 人物设定

### 主角：林晓
- **年龄**：28岁
- **职业**：独立纪录片导演
- **性格**：执着、敏感、有正义感
- **背景**：曾是知名电视台记者，因坚持报道真相而离职
- **动机**：追寻一个被掩埋的真相
- **缺陷**：过于理想化，有时忽视身边人的感受

### 外在特征
- 中等身材，常年熬夜导致的黑眼圈
- 习惯性地戴着一副旧眼镜
- 总是背着装满设备的背包

### 人物弧线
从最初的孤军奋战，到学会信任他人、接受帮助。

---

需要我创建其他角色或展开更多细节吗？`,

    '故事': `## 故事大纲

### 核心概念
一个关于「选择」的故事——当真相的代价超出想象，你还会坚持吗？

### 故事梗概
纪录片导演林晓在调查一起旧案时，意外发现了一个涉及多方利益的惊天秘密。随着调查深入，她不仅要面对来自各方的压力，还要直面自己内心的恐惧与挣扎。

### 主题
- 真相与代价
- 个人勇气与集体沉默
- 理想与现实的碰撞

### 三幕结构
1. **建置**：林晓接到线索，开始调查
2. **对抗**：多方势力介入，真相逐渐浮出水面
3. **解决**：关键抉择，真相大白

需要展开某个部分吗？`,
  };

  private defaultResponse = `你好！我是 CanvasAI 的智能助手，专注于帮助您创作剧本和脚本。

我可以帮您：
1. **构思剧本框架** - 故事大纲、三幕结构
2. **创作场景描述** - 视觉化的场景设定
3. **编写对白** - 角色间的对话
4. **设计人物** - 角色背景、性格、动机
5. **分析画布内容** - 基于您画布上的图片进行创作

请告诉我您想创作什么，或者问我任何关于剧本创作的问题！`;

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 模拟网络延迟
    await this.delay(500 + Math.random() * 1000);

    const lastMessage = request.messages[request.messages.length - 1];
    // 处理多模态内容
    let userContent = '';
    if (typeof lastMessage?.content === 'string') {
      userContent = lastMessage.content.toLowerCase();
    } else if (Array.isArray(lastMessage?.content)) {
      const textPart = lastMessage.content.find(p => p.type === 'text');
      userContent = (textPart && 'text' in textPart ? textPart.text : '').toLowerCase();
    }

    // 查找匹配的模拟回复
    let response = this.defaultResponse;
    for (const [keyword, reply] of Object.entries(this.mockResponses)) {
      if (userContent.includes(keyword)) {
        response = reply;
        break;
      }
    }

    // 如果启用了联网搜索，添加提示
    if (request.webSearchEnabled) {
      response += '\n\n---\n*[联网搜索已启用，可获取最新资讯]*';
    }

    return {
      message: response,
      usage: {
        promptTokens: Math.floor(Math.random() * 100) + 50,
        completionTokens: Math.floor(Math.random() * 200) + 100,
      },
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    // 获取完整回复
    const fullResponse = await this.chat(request);
    const message = fullResponse.message;

    // 逐字符流式输出
    for (const char of message) {
      await this.delay(15 + Math.random() * 25);
      yield char;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
