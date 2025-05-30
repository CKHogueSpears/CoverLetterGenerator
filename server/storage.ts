import { 
  users, documents, jobDescriptions, coverLetters, pipelineRuns,
  type User, type InsertUser,
  type Document, type InsertDocument,
  type JobDescription, type InsertJobDescription,
  type CoverLetter, type InsertCoverLetter,
  type PipelineRun, type InsertPipelineRun
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsByUserId(userId: number): Promise<Document[]>;
  getDocumentsByTypeAndUserId(type: string, userId: number): Promise<Document[]>;
  getDocumentByTypeAndUserId(type: string, userId: number): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;

  // Job Descriptions
  createJobDescription(jobDesc: InsertJobDescription): Promise<JobDescription>;
  updateJobDescription(id: number, updates: Partial<JobDescription>): Promise<JobDescription>;
  getJobDescriptionsByUserId(userId: number): Promise<JobDescription[]>;

  // Cover Letters
  createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter>;
  updateCoverLetter(id: number, updates: Partial<CoverLetter>): Promise<CoverLetter>;
  getCoverLettersByUserId(userId: number): Promise<CoverLetter[]>;
  getCoverLetter(id: number): Promise<CoverLetter | undefined>;

  // Pipeline Runs
  createPipelineRun(pipelineRun: InsertPipelineRun): Promise<PipelineRun>;
  updatePipelineRun(id: number, updates: Partial<PipelineRun>): Promise<PipelineRun>;
  getPipelineRunByCoverLetterId(coverLetterId: number): Promise<PipelineRun | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db
      .insert(documents)
      .values(document)
      .returning();
    return doc;
  }

  async getDocumentsByUserId(userId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId));
  }

  async getDocumentsByTypeAndUserId(type: string, userId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(and(eq(documents.type, type), eq(documents.userId, userId), eq(documents.isActive, true)))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocumentByTypeAndUserId(type: string, userId: number): Promise<Document | undefined> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.type, type), eq(documents.userId, userId), eq(documents.isActive, true)))
      .orderBy(desc(documents.uploadedAt))
      .limit(1);
    return doc || undefined;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async createJobDescription(jobDesc: InsertJobDescription): Promise<JobDescription> {
    const [job] = await db
      .insert(jobDescriptions)
      .values(jobDesc)
      .returning();
    return job;
  }

  async updateJobDescription(id: number, updates: Partial<JobDescription>): Promise<JobDescription> {
    const [job] = await db
      .update(jobDescriptions)
      .set(updates)
      .where(eq(jobDescriptions.id, id))
      .returning();
    return job;
  }

  async getJobDescriptionsByUserId(userId: number): Promise<JobDescription[]> {
    return await db
      .select()
      .from(jobDescriptions)
      .where(eq(jobDescriptions.userId, userId))
      .orderBy(desc(jobDescriptions.createdAt));
  }

  async createCoverLetter(coverLetter: InsertCoverLetter): Promise<CoverLetter> {
    const [letter] = await db
      .insert(coverLetters)
      .values(coverLetter)
      .returning();
    return letter;
  }

  async updateCoverLetter(id: number, updates: Partial<CoverLetter>): Promise<CoverLetter> {
    const [letter] = await db
      .update(coverLetters)
      .set(updates)
      .where(eq(coverLetters.id, id))
      .returning();
    return letter;
  }

  async getCoverLettersByUserId(userId: number): Promise<CoverLetter[]> {
    return await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId))
      .orderBy(desc(coverLetters.generatedAt));
  }

  async getCoverLetter(id: number): Promise<CoverLetter | undefined> {
    const [letter] = await db.select().from(coverLetters).where(eq(coverLetters.id, id));
    return letter || undefined;
  }

  async createPipelineRun(pipelineRun: InsertPipelineRun): Promise<PipelineRun> {
    const [run] = await db
      .insert(pipelineRuns)
      .values(pipelineRun)
      .returning();
    return run;
  }

  async updatePipelineRun(id: number, updates: Partial<PipelineRun>): Promise<PipelineRun> {
    const [run] = await db
      .update(pipelineRuns)
      .set(updates)
      .where(eq(pipelineRuns.id, id))
      .returning();
    return run;
  }

  async getPipelineRunByCoverLetterId(coverLetterId: number): Promise<PipelineRun | undefined> {
    const [run] = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.coverLetterId, coverLetterId))
      .orderBy(desc(pipelineRuns.startedAt))
      .limit(1);
    return run || undefined;
  }
}

export const storage = new DatabaseStorage();
