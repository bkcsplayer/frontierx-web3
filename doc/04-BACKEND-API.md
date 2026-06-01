# FrontierX Protocol — Backend API & AI Agent Design

> **Doc #**: 04  
> **Referenced by**: Step-by-Step Execution Guide (Doc 06), Steps 14-16

---

## 1. Architecture Overview

```
Frontend (Next.js)
    │
    │  1. User clicks "Analyze" on AI Agent
    │  2. Frontend calls FRXToken.burn(amount) via wagmi
    │  3. Wait for burn tx confirmation
    │  4. Send API request with burn txHash
    │
    ▼
Vercel Serverless Functions (Next.js API Routes)
    │
    │  1. Receive request with txHash + payload
    │  2. Verify burn on-chain via viem
    │  3. If valid, call AI API
    │  4. Return AI response to frontend
    │
    ├──► DeepSeek V3 API (Primary)
    │    https://api.deepseek.com (international)
    │
    └──► MiniMax M2.7 API (Fallback)
         https://api.minimax.io/v1 (OpenAI-compatible)
```

---

## 2. Environment Variables

```env
# .env.local (Vercel)

# AI APIs
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
MINIMAX_API_KEY=xxx
MINIMAX_BASE_URL=https://api.minimax.io/v1

# Chain RPC (for burn verification)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/xxx
POLYGON_RPC_URL=https://polygon-bor-rpc.publicnode.com
BASE_RPC_URL=https://mainnet.base.org

# Contract addresses (per chain)
NEXT_PUBLIC_SEPOLIA_FRX_TOKEN=0x...
NEXT_PUBLIC_POLYGON_FRX_TOKEN=0x...
NEXT_PUBLIC_BASE_FRX_TOKEN=0x...
```

---

## 3. Burn Verification Module

This is the core security piece — every AI call must be preceded by a verified FRX burn.

```typescript
// lib/api/verify-burn.ts
import { createPublicClient, http, parseAbiItem } from 'viem';
import { sepolia, polygon, base } from 'viem/chains';

const chainClients = {
  [sepolia.id]: createPublicClient({
    chain: sepolia,
    transport: http(process.env.SEPOLIA_RPC_URL),
  }),
  [polygon.id]: createPublicClient({
    chain: polygon,
    transport: http(process.env.POLYGON_RPC_URL),
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL),
  }),
};

const FRX_ADDRESSES: Record<number, `0x${string}`> = {
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_FRX_TOKEN as `0x${string}`,
  [polygon.id]: process.env.NEXT_PUBLIC_POLYGON_FRX_TOKEN as `0x${string}`,
  [base.id]: process.env.NEXT_PUBLIC_BASE_FRX_TOKEN as `0x${string}`,
};

const burnEvent = parseAbiItem(
  'event TokensBurned(address indexed from, uint256 amount)'
);

export interface BurnVerification {
  valid: boolean;
  burner: string;
  amount: bigint;
  error?: string;
}

export async function verifyBurn(
  txHash: `0x${string}`,
  chainId: number,
  expectedBurner: string,
  minimumAmount: bigint
): Promise<BurnVerification> {
  const client = chainClients[chainId];
  if (!client) {
    return { valid: false, burner: '', amount: 0n, error: 'Unsupported chain' };
  }

  try {
    // Get transaction receipt
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') {
      return { valid: false, burner: '', amount: 0n, error: 'Transaction failed' };
    }

    // Check if the tx interacted with our FRX token contract
    const frxAddress = FRX_ADDRESSES[chainId];
    
    // Parse logs for TokensBurned event
    const burnLogs = receipt.logs.filter(
      log => log.address.toLowerCase() === frxAddress.toLowerCase()
    );

    if (burnLogs.length === 0) {
      return { valid: false, burner: '', amount: 0n, error: 'No burn event found' };
    }

    // Decode the burn event
    // Look for Transfer to 0x0 (standard ERC-20 burn)
    const transferEvent = parseAbiItem(
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    );

    for (const log of burnLogs) {
      try {
        // Check for Transfer to zero address (burn)
        if (log.topics.length >= 3) {
          const to = '0x' + log.topics[2]!.slice(26);
          if (to === '0x0000000000000000000000000000000000000000') {
            const from = '0x' + log.topics[1]!.slice(26);
            const amount = BigInt(log.data);

            if (
              from.toLowerCase() === expectedBurner.toLowerCase() &&
              amount >= minimumAmount
            ) {
              return { valid: true, burner: from, amount };
            }
          }
        }
      } catch {
        continue;
      }
    }

    return { valid: false, burner: '', amount: 0n, error: 'Burn conditions not met' };
  } catch (error) {
    return {
      valid: false,
      burner: '',
      amount: 0n,
      error: `Verification failed: ${error}`,
    };
  }
}
```

---

## 4. AI API Client

```typescript
// lib/api/ai-client.ts

interface AIRequestOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

interface AIResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

// Primary: DeepSeek V3
async function callDeepSeek(options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch(`${process.env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',   // DeepSeek V3
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: 'deepseek-v3',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

// Fallback: MiniMax M2.7
async function callMiniMax(options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch(`${process.env.MINIMAX_BASE_URL}/v1/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`MiniMax API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: 'minimax-m2.7',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

// Main function with fallback
export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  try {
    return await callDeepSeek(options);
  } catch (deepseekError) {
    console.error('DeepSeek failed, falling back to MiniMax:', deepseekError);
    try {
      return await callMiniMax(options);
    } catch (minimaxError) {
      console.error('MiniMax also failed:', minimaxError);
      throw new Error('All AI providers failed');
    }
  }
}
```

**NOTE**: MiniMax API 的具体调用格式可能需要根据官网文档调整。Claude Code 在实现时应先查阅 DeepSeek 和 MiniMax 的最新 API 文档。

---

## 5. AI Agent API Routes

### 5.1 Shared Request/Response Pattern

All three AI agents follow the same pattern:

```typescript
// Shared pattern for all AI routes
interface AIAgentRequest {
  txHash: string;         // Burn transaction hash
  chainId: number;        // Chain where burn happened
  walletAddress: string;  // User's wallet address
  payload: any;           // Agent-specific input
}

interface AIAgentResponse {
  success: boolean;
  result?: string;        // AI-generated content (markdown)
  error?: string;
  model?: string;
  tokensUsed?: number;
}
```

### 5.2 AI Search Visibility Scout

```typescript
// app/api/ai/scout/route.ts
import { NextResponse } from 'next/server';
import { verifyBurn } from '@/lib/api/verify-burn';
import { callAI } from '@/lib/api/ai-client';
import { parseEther } from 'viem';

const COST = parseEther('10'); // 10 FRX

const SYSTEM_PROMPT = `You are an AI Search Visibility Analyst. Your job is to analyze how visible a business is in AI-powered search engines (ChatGPT, Perplexity, Claude, Google AI Overview).

Given a business name or URL, provide a comprehensive analysis report with the following sections:

## AI Search Visibility Report

### 1. Visibility Score (0-100)
Rate the business's likely visibility in AI search results based on:
- Domain authority and online presence
- Structured data availability
- Content quality and recency
- FAQ and knowledge base coverage

### 2. Key Findings
List 3-5 key observations about the business's AI search presence.

### 3. Optimization Recommendations
Provide 5 actionable recommendations to improve AI search visibility:
- Structured data improvements
- Content strategy
- FAQ optimization
- Schema markup suggestions
- Local SEO for AI

### 4. Priority Action Items
List the top 3 immediate actions the business should take.

Format the response in clean markdown. Be specific and actionable. If you're unsure about the business, note what you can observe from the name/URL and provide general recommendations.

Respond in the same language as the user's input (English or Chinese).`;

export async function POST(request: Request) {
  try {
    const body: AIAgentRequest = await request.json();
    const { txHash, chainId, walletAddress, payload } = body;
    const { query } = payload; // Business name or URL

    if (!query || !txHash || !chainId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify burn
    const burn = await verifyBurn(
      txHash as `0x${string}`,
      chainId,
      walletAddress,
      COST
    );

    if (!burn.valid) {
      return NextResponse.json(
        { success: false, error: `Burn verification failed: ${burn.error}` },
        { status: 403 }
      );
    }

    // Call AI
    const aiResponse = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Analyze the AI search visibility for: ${query}`,
      maxTokens: 2000,
    });

    return NextResponse.json({
      success: true,
      result: aiResponse.content,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error) {
    console.error('Scout agent error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.3 Smart Content Forge

```typescript
// app/api/ai/content/route.ts
import { NextResponse } from 'next/server';
import { verifyBurn } from '@/lib/api/verify-burn';
import { callAI } from '@/lib/api/ai-client';
import { parseEther } from 'viem';

const COST = parseEther('10');

const PLATFORM_PROMPTS: Record<string, string> = {
  linkedin: `You are an expert LinkedIn content creator. Write a professional, engaging LinkedIn post. Use a compelling hook in the first line. Include relevant insights and a call-to-action. Aim for 150-300 words. Use line breaks for readability. Add 3-5 relevant hashtags at the end.`,
  
  twitter: `You are an expert Twitter/X content creator. Write a concise, impactful tweet thread (3-5 tweets). Each tweet must be under 280 characters. Use a strong hook. Include relevant hashtags and emojis sparingly. Make it shareable and engaging.`,
  
  wechat: `你是一位专业的微信公众号内容创作者。请撰写一篇公众号文章，包含：
- 吸引人的标题
- 引人入胜的开头
- 结构清晰的正文（使用小标题分段）
- 有力的结尾和互动引导
字数控制在800-1500字。使用适当的emoji增加可读性。`,
  
  xiaohongshu: `你是一位专业的小红书内容创作者。请撰写一篇小红书帖子，包含：
- 吸引眼球的标题（加emoji）
- 真实感强的正文（口语化，分段短小）
- 3-5个相关话题标签
- 字数控制在300-600字
- 风格：真实、有温度、有干货`,
};

export async function POST(request: Request) {
  try {
    const body: AIAgentRequest = await request.json();
    const { txHash, chainId, walletAddress, payload } = body;
    const { topic, platform } = payload;

    if (!topic || !platform || !txHash) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify burn
    const burn = await verifyBurn(
      txHash as `0x${string}`,
      chainId,
      walletAddress,
      COST
    );

    if (!burn.valid) {
      return NextResponse.json(
        { success: false, error: `Burn verification failed: ${burn.error}` },
        { status: 403 }
      );
    }

    const platformPrompt = PLATFORM_PROMPTS[platform];
    if (!platformPrompt) {
      return NextResponse.json(
        { success: false, error: 'Unsupported platform' },
        { status: 400 }
      );
    }

    const aiResponse = await callAI({
      systemPrompt: platformPrompt,
      userPrompt: `Create content about: ${topic}`,
      maxTokens: 2000,
    });

    return NextResponse.json({
      success: true,
      result: aiResponse.content,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
      platform,
    });
  } catch (error) {
    console.error('Content agent error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.4 Knowledge Distiller

```typescript
// app/api/ai/distill/route.ts
import { NextResponse } from 'next/server';
import { verifyBurn } from '@/lib/api/verify-burn';
import { callAI } from '@/lib/api/ai-client';
import { parseEther } from 'viem';

const COST = parseEther('15'); // 15 FRX (more tokens consumed)

const SYSTEM_PROMPT = `You are a Knowledge Distillation Agent. Your job is to take raw, unstructured text and transform it into structured, actionable knowledge.

Given any input text (meeting notes, articles, technical docs, product specs), produce:

## Knowledge Card

### Core Concept
One-sentence summary of the main idea.

### Key Insights
- Bullet points of the most important takeaways (3-7 items)

### Concept Map
List the main concepts and their relationships in a structured format.

### Action Items
Concrete next steps extracted from the text (if applicable).

### Structured Summary
A clean, well-organized summary (150-300 words) that captures the essential information.

### Tags
Relevant topic tags for categorization.

---

Rules:
- Preserve factual accuracy — do not add information not in the source
- Prioritize actionable insights over descriptions
- Use the same language as the input text
- If the input is in Chinese, respond in Chinese
- If the input is in English, respond in English
- Be concise but complete`;

export async function POST(request: Request) {
  try {
    const body: AIAgentRequest = await request.json();
    const { txHash, chainId, walletAddress, payload } = body;
    const { text } = payload;

    if (!text || !txHash) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Limit input text length (prevent abuse)
    const truncatedText = text.slice(0, 8000); // ~2000 tokens

    // Verify burn
    const burn = await verifyBurn(
      txHash as `0x${string}`,
      chainId,
      walletAddress,
      COST
    );

    if (!burn.valid) {
      return NextResponse.json(
        { success: false, error: `Burn verification failed: ${burn.error}` },
        { status: 403 }
      );
    }

    const aiResponse = await callAI({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Distill the following text into structured knowledge:\n\n${truncatedText}`,
      maxTokens: 3000,
    });

    return NextResponse.json({
      success: true,
      result: aiResponse.content,
      model: aiResponse.model,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error) {
    console.error('Distill agent error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 6. Frontend AI Agent Flow

### Complete User Flow (for all 3 agents):

```
1. User is on /ai-hub (already passed NFT gate check)
2. User enters input (query/topic/text)
3. User clicks "Analyze" / "Generate" / "Distill"
4. Frontend shows confirmation modal:
   "This will burn 10 $FRX from your wallet. Continue?"
5. User confirms → Frontend calls FRXToken.burn(10 ether) via wagmi
6. Wait for transaction confirmation
7. Frontend sends POST to /api/ai/[agent] with:
   - txHash (the burn tx)
   - chainId
   - walletAddress
   - payload (agent-specific input)
8. Loading state while API processes
9. Display AI response (markdown rendered)
```

### Frontend Hook for AI Agents

```typescript
// lib/contracts/hooks/useAIAgent.ts
import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { useChainConfig } from './useChainConfig';
import FRXTokenABI from '../abis/FRXToken.json';

type AgentType = 'scout' | 'content' | 'distill';

const COSTS: Record<AgentType, string> = {
  scout: '10',
  content: '10',
  distill: '15',
};

export function useAIAgent(agentType: AgentType) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { contracts } = useChainConfig();
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContract: burn, data: burnHash } = useWriteContract();
  const { isSuccess: burnConfirmed } = useWaitForTransactionReceipt({
    hash: burnHash,
  });

  const execute = async (payload: any) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Burn FRX tokens
      const cost = parseEther(COSTS[agentType]);
      
      burn({
        address: contracts.frxToken,
        abi: FRXTokenABI,
        functionName: 'burn',
        args: [cost],
      });

      // Step 2: Wait for burn confirmation (handled by useWaitForTransactionReceipt)
      // The component should watch burnConfirmed and then call callAgent

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };

  const callAgent = async (payload: any) => {
    if (!burnHash || !address) return;

    try {
      const response = await fetch(`/api/ai/${agentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: burnHash,
          chainId,
          walletAddress: address,
          payload,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'AI agent failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    callAgent,
    result,
    isLoading,
    error,
    burnHash,
    burnConfirmed,
    cost: COSTS[agentType],
  };
}
```

---

## 7. Rate Limiting & Security

### 7.1 Rate Limiting

On Vercel, implement basic rate limiting using the Edge Config or simple in-memory store:

```typescript
// middleware.ts (Next.js middleware for rate limiting)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/ai/')) {
    return NextResponse.next();
  }

  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  const entry = rateLimit.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= maxRequests) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
    entry.count++;
  } else {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/ai/:path*',
};
```

### 7.2 Security Checklist

- [x] API keys never exposed to frontend (server-side only)
- [x] Burn verification before every AI call
- [x] Rate limiting on API routes
- [x] Input sanitization (truncate long texts)
- [x] CORS restricted to project domain
- [x] Error messages don't leak internal details
