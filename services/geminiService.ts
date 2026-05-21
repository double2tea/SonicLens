import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MusicAnalysisResult } from "../types";

// Schema definition for structured output
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { 
      type: Type.STRING, 
      enum: ["music", "sfx"], 
      description: "Must match the requested analysis mode" 
    },
    // Music Fields
    mainGenre: { type: Type.STRING, description: "音乐流派 (Music only)" },
    subGenres: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "次要流派 (Music only)"
    },
    bpm: { type: Type.INTEGER, description: "整体平均 BPM (Music only)" },
    timeSignature: { type: Type.STRING, description: "拍号 (Music only)" },
    key: { type: Type.STRING, description: "整体调式 (Music only)" },
    mood: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "情绪形容词"
    },
    instruments: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "乐器或声音来源"
    },
    rhythmDescription: { type: Type.STRING, description: "节奏描述 (Music only)" },
    educationalContext: { type: Type.STRING, description: "流派科普或声音原理科普" },
    keywords: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "用于搜索的英文关键词 (English Search Keywords)"
    },
    optimizedPrompt: {
      type: Type.STRING,
      description: "用于 AI 生成工具 (如 Suno, Udio, ElevenLabs) 的英文提示词"
    },
    similarTracks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          artist: { type: Type.STRING },
          title: { type: Type.STRING }
        },
        required: ["artist", "title"]
      },
      description: "参考曲目 (Music only)"
    },
    sonicProfile: {
      type: Type.OBJECT,
      properties: {
        energy: { type: Type.INTEGER, description: "能量值 0-100" },
        happiness: { type: Type.INTEGER, description: "快乐/积极度 0-100" },
        acousticness: { type: Type.INTEGER, description: "原声感 0-100" },
        instrumental: { type: Type.INTEGER, description: "器乐占比 0-100" },
        intensity: { type: Type.INTEGER, description: "激烈程度 0-100" }
      },
      required: ["energy", "happiness", "acousticness", "instrumental", "intensity"]
    },
    multipleSongsDetected: { type: Type.BOOLEAN, description: "是否检测到多首歌曲或明显的章节变化" },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING, description: "时间段, e.g. '00:00 - 01:20'" },
          genre: { type: Type.STRING, description: "该片段的流派/风格" },
          mood: { type: Type.STRING, description: "该片段的情绪" },
          description: { type: Type.STRING, description: "该片段的具体分析 (配器、节奏变化等)" },
          bpm: { type: Type.INTEGER, description: "该片段的具体 BPM (如果节奏有变化)" },
          key: { type: Type.STRING, description: "该片段的具体调式 Key (如果转调了)" },
          instruments: { type: Type.ARRAY, items: { type: Type.STRING }, description: "该片段出现的主要乐器" }
        },
        required: ["timestamp", "genre", "mood", "description"]
      },
      description: "时间轴分段分析 (Timeline Analysis) - 务必提供每段的详细 BPM, Key, Instruments"
    },
    editorCuePoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          timestamp: { type: Type.STRING, description: "事件精确时间戳, e.g. '00:15'" },
          eventName: { type: Type.STRING, description: "卡点事件类型, e.g. '节奏高潮 (Drop)', '情感转折', '配器突变前奏'" },
          vibeChange: { type: Type.STRING, description: "音乐氛围的变化, e.g. '强劲吉他与鼓组切入，节奏加快'" },
          visualAdvice: { type: Type.STRING, description: "对应的视频剪辑与画面转场建议, e.g. '适合动作对齐、快速连剪或画幅推近'" }
        },
        required: ["timestamp", "eventName", "vibeChange", "visualAdvice"]
      },
      description: "专为剪辑师设计的音视频画面卡点与转场对齐建议表"
    },
    // SFX Specific
    sfx: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "音效的具体名称 (e.g., Door Creak)" },
        ucsCatId: { type: Type.STRING, description: "UCS Category ID (e.g., WODCreak)" },
        ucsCategory: { type: Type.STRING, description: "UCS Main Category (e.g., Wood)" },
        ucsSubCategory: { type: Type.STRING, description: "UCS SubCategory (e.g., Creak)" },
        foleyInstructions: { type: Type.STRING, description: "如何使用日常物品拟音 (How to foley)" },
        accessibleAlternatives: { type: Type.STRING, description: "生活中容易找到的相似声音来源" },
        visualSyncTips: { type: Type.STRING, description: "音视频画面卡点与对齐建议, e.g. '脚步声建议与演员脚印画面对齐，由于延时，声音可比画面提前0.5-1帧以确保最佳同步感'" }
      },
      required: ["name", "ucsCatId", "ucsCategory", "ucsSubCategory", "foleyInstructions", "accessibleAlternatives", "visualSyncTips"]
    }
  },
  required: ["type", "keywords", "educationalContext", "instruments"]
};

// 30MB safety limit for potential video clips.
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;

export const analyzeMusicMedia = async (file: File, mode: 'music' | 'sfx', customApiKey?: string): Promise<MusicAnalysisResult> => {
  const apiKey = customApiKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set it in Settings.");
  }

  // 1. Client-side Size Check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`文件大小超出限制，最大允许 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`);
  }

  // 2. Base64 conversion helper
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the standard dataURL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });

  const base64Data = await toBase64(file);
  const mimeType = file.type || "audio/mp3";

  // 3. Initialize GoogleGenAI client
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  // 4. Construct the optimized super-detailed system prompt
  let systemPrompt = "";
  if (mode === 'music') {
    systemPrompt = `请作为一位拥有资深行业直觉的顶级银幕音乐总监（Music Supervisor）及资深音频工程师，对输入的音频/视频文件运行微观级**音乐**特性分析。
    
    你的分析必须严谨、精细，避免常识性泛泛而谈。需要深入到具体律动模式、声部织体、声学空间特性及卡点。
    
    **具体分析维度：**
    1. **调式与速度辨识 (Key & BPM Recognition)**: 仔细分析其根音与和声倾向，给出准确的调式（如 G# Minor, C Major）和极高精度的代表性平均 BPM 以及拍号（如 4/4、3/4）。
    2. **配器与织体分析 (Instrumentation & Texture)**: 描述具有高度辨识度的器乐音色。不要只写 "Piano" 或 "Synthesizer"，要指出其特定属性（例如：带有Lofi噪音的 Rhodes 电子钢琴、1970年代尘土飞扬的 Vintage Tape 尼龙弦古典吉他、带着温暖锯齿波谐波的 Moog 模拟低音、或者 4/4 拍底部的双重重击 Roland TR-808 鼓机低音等）。
    3. **风格考古与流派科普 (Genre & Cultural Context)**: 给出最精确的主流派 (mainGenre) 及至多3个次级精细子流派 (subGenres)。简析该流派的诞生背景或标志性音频工程处理手段（例如，低保真采样微缩、磁带饱和度染色、重度侧链混缩压缩等）。
    4. **大模型 AI 音乐生成提示词设计 (\`optimizedPrompt\`)**:
       设计一段极高质量的英文提示词，供 Suno、Udio 等工具生成风格高度相似的声音。必须包含：
       - 精确的流派和时代印记标签（如: mid-tempo deep liquid drum & bass, early 1990s hip-hop beats）。
       - 乐器特征细节（如: filtered warm Rhodes keys, organic nylon acoustic guitar, sweeping dry square wave synthesizer）。
       - 声学空间与后期处理（如: tape saturation, high fidelity analog mastering, dusty vinyl warmth, room reverb）。
       确保词汇充满动感、质感、专业混音语言。
    
    **非常重要：微观时间轴分析 (Timeline Analysis)**
    用户是电影剪辑师与导演，需要高精度段落点位。如果这首曲子包含不同的曲式结构章节（如 Intro 序奏, Verse 主歌, Chorus 爆发副歌, Outro 尾声）或是明显的串烧（Mix/Medley），你必须在 \`segments\` 中详细拆解。
    对于 \`segments\` 中的每一个片段，请提供：
    1. **准确的时间戳范围** (e.g. '00:00 - 00:24')。
    2. **该片段精确的 BPM 和 Key (调式)**（如果有转调或变速，请灵敏捕捉）。
    3. **该片段特有的乐器或声织构成**（避免重复，精确写出此时间段新增或退出的配器）。
    4. **该片段的听觉情绪与编曲大势** (例如: 弦乐逐渐上推，乐感由低落转向光明)。
    
    **影视剪辑画面卡点对齐指南 (\`editorCuePoints\`)**
    为视频剪辑师生成 4-6 个具体的音视频黄金对平切卡点。
    - \`timestamp\`: 建议对齐的具体秒级时间点（例如 "00:15"），必须精确。
    - \`eventName\`: 曲式或配器发生转折的精准事件名（例如 "底鼓侧链切入"、"失真电吉他副部爆发"、"高频滤波释放"）。
    - \`vibeChange\`: 描述声学环境与动态压力的瞬时改变听感（例如 "电声声部全数淡出，仅保留无混响干声 Rhodes 钢琴，呈现窒息感"）。
    - \`visualAdvice\`: 专为剪辑师设计的黄金剪辑转场策略（例如 "此点最宜作为画中人物眼神特写或急促物理撞击动作的卡点；建议使用跳接(Jump Cut)或物理变速慢动作(Speed Ramp)启动，突出宿命感"）。
    
    请直接返回满足 analysisSchema Schema 的 JSON 结果。非英文部分的文本请用纯简体中文书写，Keywords 和 similarTracks 以及 optimizedPrompt 必须为专业英文。`;
  } else {
    systemPrompt = `请作为一位顶尖声学设计师和拟音专家（Sound Designer / Foley Artist），对输入的**音效(SFX)**进行极度精细的物理力学特征与声学声压分析。
    
    **具体分析维度：**
    1. **声音特征剖析**: 不仅描述“听见什么”，还要分析其瞬态响应 (Transient Response)（是锐利爆裂、还是平缓渐进）、共鸣体腔材质、声振频段分布（如“低频带有强烈的物理腔体谐振，高频伴随沙粒般金属摩擦质感”）。
    2. **UCS 规范分类**: 提供极为精确的世界统一音效分类系统 (Universal Category System) 代码 (\`ucsCatId\`)、主分类 (\`ucsCategory\`)、子分类 (\`ucsSubCategory\`)。确保分类符合专业工作流。
    3. **宏大拟音实作 (Foley Instructions)**: 提供工业级好莱坞 Foley 演员实操指南。详细列举在拟音室，如何使用身边随手可得的物理道具组合甚至肢体动作，完美还原或夸大这一音效。
    4. **音画精确同步与时间对齐方案 (\`sfx.visualSyncTips\`)**:
       在 \`sfx.visualSyncTips\` 字段中：提供关于人耳和肉眼感知差异的运动对齐建议策略。告诉剪辑师由于声波和视觉处理的时间差、以及物理动能延绵，声轨应该提前或延后几帧对齐，或者结合什么样的物理抛物线、惯性滑行画面去进行动能对平（e.g. “水滴撞击瞬间，声画应在水花溅出前 1 帧先发出，同时对高频声相做 3D 环绕微调，以达到极度真实的裸眼视听包围感”）。
    
    **大模型 AI 音效生成提示词设计 (\`optimizedPrompt\`)**
    为 ElevenLabs, AudioLDM, Stable Audio 提供高分辨率提示词。必须包含：
    - 微观力学行为 (e.g., sharp scraping, metal on stone crunch)
    - 声学空间与声道细节 (e.g., dry mono close-up recording, intimate studio microphone, binaural panning)
    - 瞬态和频率调节 (e.g., explosive hard impact transient with rapid muffled decay)
    
    请直接返回满足 analysisSchema Schema 的 JSON 结果。非英文部分的文本请用纯简体中文书写，Keywords 和 optimizedPrompt 必须为专业英文。`;
  }

  // 5. Retry Logic
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: systemPrompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
          temperature: 0.2,
        }
      });

      if (!response.text) {
        throw new Error("模型未返回文本数据。");
      }

      const result: MusicAnalysisResult = JSON.parse(response.text);
      
      // Force type to match requested mode if model hallucinates
      result.type = mode;

      return result;

    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }

      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw lastError || new Error("分析失败，请稍后重试或尝试其他文件。");
};
