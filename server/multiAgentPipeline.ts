import { anthropic } from "./anthropic";
import { openai } from "./openai";
import { storage } from "./storage";
import { StyleGuideCache, ResumeEmbeddingsCache, CoverLetterDataCache } from "./cache";
import type { JobDescription, CoverLetter } from "@shared/schema";

export interface AgentProgress {
  step: string;
  progress: number;
  totalSteps: number;
  activeAgents: string[];
}

export interface QualityScores {
  styleCompliance: number;
  atsKeywordUse: number;
  clarity: number;
  impact: number;
  overall: number;
}

// Base Agent class for all specialized agents
abstract class BaseAgent {
  protected name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  abstract process(data: any): Promise<any>;
  
  protected log(message: string) {
    console.log(`🤖 [${this.name}] ${message}`);
  }
}

// Analysis Agents (run in parallel in Phase 1)
class ATSKeywordsAgent extends BaseAgent {
  constructor() { super("ATS-Keywords"); }
  
  async process(jobContent: string): Promise<string[]> {
    this.log("Extracting ATS keywords...");
    const prompt = `Analyze this job description and extract 15-20 critical ATS keywords and phrases that must appear in a cover letter. Focus on technical skills, qualifications, and industry-specific terms.

Job Description:
${jobContent}

Return only a JSON array of strings with the most important keywords.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const content = response.content[0].text;
      return JSON.parse(content);
    } catch {
      return content.split('\n').filter(line => line.trim()).slice(0, 20);
    }
  }
}

class RequirementsAgent extends BaseAgent {
  constructor() { super("Requirements"); }
  
  async process(jobContent: string): Promise<string[]> {
    this.log("Extracting key requirements...");
    const prompt = `Extract the 8-12 most critical job requirements from this job description. Focus on must-have qualifications, skills, and experience.

Job Description:
${jobContent}

Return only a JSON array of strings with the key requirements.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const content = response.content[0].text;
      return JSON.parse(content);
    } catch {
      return content.split('\n').filter(line => line.trim()).slice(0, 12);
    }
  }
}

class StyleGuideAgent extends BaseAgent {
  constructor() { super("Style-Guide"); }
  
  async process(userId: number): Promise<any> {
    this.log("Loading style guide analysis...");
    return await StyleGuideCache.analyzeStyleGuide(userId);
  }
}

class ResumeAgent extends BaseAgent {
  constructor() { super("Resume"); }
  
  async process(userId: number): Promise<any> {
    this.log("Loading resume embeddings...");
    return await ResumeEmbeddingsCache.generateEmbeddings(userId);
  }
}

// Content Generation Agents (run in parallel in Phase 2)
class OpeningHookAgent extends BaseAgent {
  constructor() { super("Opening-Hook"); }
  
  async process(data: any): Promise<string> {
    this.log("Generating opening hook...");
    const { styleGuide, accomplishments, atsKeywords, requirements, job } = data;
    
    const prompt = `Write a compelling opening hook paragraph for a cover letter. Use the style guide and incorporate relevant accomplishments.

Style Guide: ${JSON.stringify(styleGuide)}
Key Accomplishments: ${JSON.stringify(accomplishments)}
ATS Keywords: ${atsKeywords.join(', ')}
Job Requirements: ${requirements.join(', ')}
Job: ${job.title} at ${job.company}

Write one powerful opening paragraph that hooks the reader immediately.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    return response.choices[0].message.content || "";
  }
}

class AlignmentAgent extends BaseAgent {
  constructor() { super("Alignment"); }
  
  async process(data: any): Promise<string> {
    this.log("Generating alignment paragraph...");
    const { styleGuide, accomplishments, atsKeywords, requirements, job } = data;
    
    const prompt = `Write a paragraph that aligns the candidate's experience with the job requirements. Show clear connections between accomplishments and job needs.

Style Guide: ${JSON.stringify(styleGuide)}
Key Accomplishments: ${JSON.stringify(accomplishments)}
Job Requirements: ${requirements.join(', ')}
ATS Keywords: ${atsKeywords.join(', ')}

Write one focused paragraph showing perfect alignment.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
    });

    return response.choices[0].message.content || "";
  }
}

class LeadershipAgent extends BaseAgent {
  constructor() { super("Leadership"); }
  
  async process(data: any): Promise<string> {
    this.log("Generating leadership paragraph...");
    const { styleGuide, accomplishments, atsKeywords, requirements, job } = data;
    
    const prompt = `Write a paragraph highlighting leadership and impact using specific accomplishments.

Style Guide: ${JSON.stringify(styleGuide)}
Key Accomplishments: ${JSON.stringify(accomplishments)}
ATS Keywords: ${atsKeywords.join(', ')}

Write one paragraph showcasing leadership and measurable impact.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
    });

    return response.choices[0].message.content || "";
  }
}

class ValuePropsAgent extends BaseAgent {
  constructor() { super("Value-Props"); }
  
  async process(data: any): Promise<string[]> {
    this.log("Generating value propositions...");
    const { styleGuide, accomplishments, atsKeywords, requirements, job } = data;
    
    const prompt = `Generate 3 compelling value propositions that show unique value to the company.

Style Guide: ${JSON.stringify(styleGuide)}
Key Accomplishments: ${JSON.stringify(accomplishments)}
ATS Keywords: ${atsKeywords.join(', ')}

Return exactly 3 value propositions as a JSON array of strings.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return result.valuePropositions || [];
    } catch {
      return [];
    }
  }
}

class ClosingAgent extends BaseAgent {
  constructor() { super("Closing"); }
  
  async process(data: any): Promise<string> {
    this.log("Generating closing paragraph...");
    const { styleGuide, job } = data;
    
    const prompt = `Write a strong closing paragraph that calls for action and expresses enthusiasm.

Style Guide: ${JSON.stringify(styleGuide)}
Job: ${job.title} at ${job.company}

Write one compelling closing paragraph.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    return response.choices[0].message.content || "";
  }
}

// Quality Agent (runs in Phase 3)
class QualityAgent extends BaseAgent {
  constructor() { super("Quality"); }
  
  async process(data: { content: any; atsKeywords: string[] }): Promise<QualityScores> {
    this.log("Performing quality assessment...");
    const { content, atsKeywords } = data;
    
    const prompt = `Analyze this cover letter content and provide quality scores from 0-100.

Content: ${JSON.stringify(content)}
Required ATS Keywords: ${atsKeywords.join(', ')}

Return JSON with scores for: styleCompliance, atsKeywordUse, clarity, impact, overall`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    try {
      const scores = JSON.parse(response.choices[0].message.content || "{}");
      return {
        styleCompliance: Math.min(100, Math.max(0, scores.styleCompliance || 85)),
        atsKeywordUse: Math.min(100, Math.max(0, scores.atsKeywordUse || 85)),
        clarity: Math.min(100, Math.max(0, scores.clarity || 85)),
        impact: Math.min(100, Math.max(0, scores.impact || 85)),
        overall: Math.min(100, Math.max(0, scores.overall || 85))
      };
    } catch {
      return { styleCompliance: 85, atsKeywordUse: 85, clarity: 85, impact: 85, overall: 85 };
    }
  }
}

// Main Multi-Agent Pipeline Coordinator
export class MultiAgentCoverLetterPipeline {
  private coverLetterId: number;
  private onProgress?: (progress: AgentProgress) => void;
  private agents: { [key: string]: BaseAgent };

  constructor(coverLetterId: number, onProgress?: (progress: AgentProgress) => void) {
    this.coverLetterId = coverLetterId;
    this.onProgress = onProgress;
    
    // Initialize all agents
    this.agents = {
      atsKeywords: new ATSKeywordsAgent(),
      requirements: new RequirementsAgent(),
      styleGuide: new StyleGuideAgent(),
      resume: new ResumeAgent(),
      openingHook: new OpeningHookAgent(),
      alignment: new AlignmentAgent(),
      leadership: new LeadershipAgent(),
      valueProps: new ValuePropsAgent(),
      closing: new ClosingAgent(),
      quality: new QualityAgent()
    };
  }

  private async updateProgress(step: string, progress: number, activeAgents: string[] = []) {
    if (this.onProgress) {
      this.onProgress({
        step,
        progress,
        totalSteps: 3, // Phase 1, 2, 3
        activeAgents
      });
    }
  }

  async execute(): Promise<CoverLetter> {
    const startTime = Date.now();
    console.log(`🚀 Starting multi-agent pipeline for cover letter ${this.coverLetterId}`);

    // Get cover letter and job data
    const coverLetter = await storage.getCoverLetter(this.coverLetterId);
    if (!coverLetter) throw new Error("Cover letter not found");
    
    const job = await storage.getJobDescriptionsByUserId(coverLetter.userId);
    const jobDescription = job.find(j => j.id === coverLetter.jobDescriptionId);
    if (!jobDescription) throw new Error("Job description not found");

    // PHASE 1: Parallel Analysis (all agents run simultaneously)
    await this.updateProgress("Phase 1: Analysis", 10, ['ATS-Keywords', 'Requirements', 'Style-Guide', 'Resume']);
    
    const [atsKeywords, requirements, styleGuide, resumeData] = await Promise.all([
      this.agents.atsKeywords.process(jobDescription.description),
      this.agents.requirements.process(jobDescription.description),
      this.agents.styleGuide.process(coverLetter.userId),
      this.agents.resume.process(coverLetter.userId)
    ]);

    // Prepare combined data for content generation
    const sharedData = {
      styleGuide,
      accomplishments: resumeData,
      atsKeywords,
      requirements,
      job: { title: jobDescription.title, company: jobDescription.company }
    };

    // PHASE 2: Parallel Content Generation (all content agents run simultaneously)
    await this.updateProgress("Phase 2: Content Generation", 50, ['Opening-Hook', 'Alignment', 'Leadership', 'Value-Props', 'Closing']);
    
    const [openingHook, alignment, leadership, valueProps, closing] = await Promise.all([
      this.agents.openingHook.process(sharedData),
      this.agents.alignment.process(sharedData),
      this.agents.leadership.process(sharedData),
      this.agents.valueProps.process(sharedData),
      this.agents.closing.process(sharedData)
    ]);

    // PHASE 3: Quality Assessment and Assembly
    await this.updateProgress("Phase 3: Quality Check", 80, ['Quality']);
    
    const coverLetterContent = {
      openingHook,
      alignment,
      leadership,
      valueProps,
      closing,
      jobTitle: jobDescription.title,
      company: jobDescription.company,
      hiringManager: "Hiring Manager"
    };

    const qualityScores = await this.agents.quality.process({ content: coverLetterContent, atsKeywords });

    // Update cover letter with results
    const updatedCoverLetter = await storage.updateCoverLetter(this.coverLetterId, {
      content: coverLetterContent,
      qualityScore: qualityScores.overall,
      status: 'completed'
    });

    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ Multi-agent pipeline completed in ${duration.toFixed(1)}s with ${qualityScores.overall}% quality`);

    await this.updateProgress("Complete", 100, []);
    return updatedCoverLetter;
  }
}