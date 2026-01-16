import { Ollama } from 'ollama';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { ParsedQuery, Job, ConversationContext } from '../types/index.js';
import { jobQueryService } from './job-query.service.js';

// Initialize Ollama client
const ollama = new Ollama({ host: config.ollama.host });

// Tool definitions for Ollama function calling
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_jobs',
      description: 'Search for jobs based on filters like tech stack, role, location type. Use this when user asks to find or list jobs.',
      parameters: {
        type: 'object',
        properties: {
          tech: { 
            type: 'string', 
            description: 'Technology or skill to filter by (e.g., react, golang, python, node, java)' 
          },
          role: { 
            type: 'string', 
            description: 'Job role category (e.g., backend, frontend, fullstack, devops, mobile)' 
          },
          type: { 
            type: 'string', 
            enum: ['remote', 'onsite', 'hybrid'],
            description: 'Work location type' 
          },
          experience: { 
            type: 'string', 
            enum: ['entry', 'junior', 'mid', 'senior', 'lead'],
            description: 'Experience level required' 
          },
          limit: {
            type: 'number',
            description: 'Maximum number of jobs to return (default 5)'
          }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'count_jobs',
      description: 'Count how many jobs match the given criteria. Use this when user asks "kitni jobs" or "how many jobs".',
      parameters: {
        type: 'object',
        properties: {
          tech: { type: 'string', description: 'Technology to filter by' },
          role: { type: 'string', description: 'Role category to filter by' },
          type: { type: 'string', enum: ['remote', 'onsite', 'hybrid'] }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_matched_jobs',
      description: 'Get jobs that match the user\'s profile and verified skills. Use when user says "mere liye jobs" or "jobs for me" or "matching jobs".',
      parameters: {
        type: 'object',
        properties: {
          userId: { 
            type: 'string', 
            description: 'User ID to fetch their profile and find matching jobs' 
          },
          limit: {
            type: 'number',
            description: 'Maximum number of jobs to return (default 5)'
          }
        },
        required: ['userId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_job_details',
      description: 'Get detailed information about a specific job. Use when user asks about a specific job or says "tell me more about job X".',
      parameters: {
        type: 'object',
        properties: {
          jobId: { 
            type: 'string', 
            description: 'The ID of the job to get details for' 
          }
        },
        required: ['jobId']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_to_job',
      description: 'Apply to a job on behalf of the user. Use when user confirms they want to apply.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID applying' },
          jobId: { type: 'string', description: 'Job ID to apply to' }
        },
        required: ['userId', 'jobId']
      }
    }
  }
];

// System prompt for the AI
const SYSTEM_PROMPT = `You are VerifyDev AI, a friendly and helpful job assistant for a developer hiring platform.

YOUR PERSONALITY:
- You understand both English and Hinglish (Hindi + English mix)
- You are concise but friendly
- You use emojis sparingly to make responses engaging
- You always use the available tools to get real data - NEVER make up job listings

LANGUAGE UNDERSTANDING:
- "kitni" = "how many" → use count_jobs
- "dikhao", "batao", "show" = list jobs → use search_jobs
- "mere liye", "for me", "meri profile" = matching jobs → use get_matched_jobs
- "apply kar do", "apply karna hai" = apply to job → use apply_to_job
- "remote", "ghar se", "work from home" = remote type filter

RULES:
1. ALWAYS use tools to fetch real data - never invent jobs
2. Format job listings nicely with numbers so user can reference them
3. If user says a number (like "2nd wala" or "second one"), reference the previously shown jobs
4. Before applying, confirm the job details with user
5. Keep responses under 500 characters when possible (WhatsApp limit friendly)
6. If userId is not available for matching/applying, ask user to link their account first

RESPONSE FORMAT FOR JOBS:
When listing jobs, format like:
1️⃣ **Job Title** - Company
   📍 Location | 💰 Salary Range
   🔧 Key Skills

Always end with a call to action like "Reply with number for details!" or "Kisi ko apply karna hai?".`;

// Execute tool calls and get results
async function executeToolCall(toolName: string, args: Record<string, unknown>, context?: ConversationContext): Promise<unknown> {
  logger.debug({ toolName, args }, 'Executing tool call');
  
  switch (toolName) {
    case 'search_jobs':
      return await jobQueryService.searchJobs({
        tech: args.tech as string,
        role: args.role as string,
        type: args.type as string,
        experience: args.experience as string,
        limit: (args.limit as number) || 5
      });
    
    case 'count_jobs':
      return await jobQueryService.countJobs({
        tech: args.tech as string,
        role: args.role as string,
        type: args.type as string
      });
    
    case 'get_matched_jobs':
      const userId = (args.userId as string) || context?.userId;
      if (!userId) {
        return { error: 'User ID not available. User needs to link their VerifyDev account.' };
      }
      return await jobQueryService.getMatchedJobs(userId, (args.limit as number) || 5);
    
    case 'get_job_details':
      return await jobQueryService.getJobDetails(args.jobId as string);
    
    case 'apply_to_job':
      const applyUserId = (args.userId as string) || context?.userId;
      if (!applyUserId) {
        return { error: 'User ID not available. User needs to link their VerifyDev account first.' };
      }
      return await jobQueryService.applyToJob(applyUserId, args.jobId as string);
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// Main function to process user message with Ollama
export async function processMessage(
  userMessage: string, 
  context?: ConversationContext
): Promise<string> {
  logger.info({ userMessage, context }, 'Processing message with Ollama');
  
  try {
    // Build conversation messages
    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];
    
    // Add context if available
    if (context?.userId) {
      messages[0].content += `\n\nCurrent user ID: ${context.userId}`;
    }
    if (context?.lastJobs && context.lastJobs.length > 0) {
      messages[0].content += `\n\nPreviously shown jobs:\n${context.lastJobs.map((j, i) => `${i + 1}. ${j.title} (ID: ${j.id})`).join('\n')}`;
    }
    
    messages.push({ role: 'user', content: userMessage });
    
    // First call to Ollama with tools
    const response = await ollama.chat({
      model: config.ollama.model,
      messages,
      tools: TOOLS,
      stream: false
    });
    
    logger.debug({ response: response.message }, 'Ollama initial response');
    
    // Handle tool calls if present
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      // Add assistant message with tool calls
      messages.push({
        role: 'assistant',
        content: response.message.content || ''
      });
      
      // Execute each tool call
      for (const toolCall of response.message.tool_calls) {
        const toolResult = await executeToolCall(
          toolCall.function.name,
          toolCall.function.arguments as Record<string, unknown>,
          context
        );
        
        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult)
        });
      }
      
      // Get final response with tool results
      const finalResponse = await ollama.chat({
        model: config.ollama.model,
        messages,
        stream: false
      });
      
      return finalResponse.message.content || 'Sorry, I could not process that request.';
    }
    
    // No tool calls, return direct response
    return response.message.content || 'Sorry, I could not understand that. Try asking about jobs!';
    
  } catch (error) {
    logger.error({ error }, 'Error processing message with Ollama');
    
    // Check if Ollama is not running
    if ((error as Error).message?.includes('ECONNREFUSED')) {
      return '⚠️ AI service is temporarily unavailable. Please try again in a few minutes.';
    }
    
    return 'Sorry, something went wrong. Please try again!';
  }
}

// Health check for Ollama connection
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    await ollama.list();
    return true;
  } catch (error) {
    logger.error({ error }, 'Ollama health check failed');
    return false;
  }
}
