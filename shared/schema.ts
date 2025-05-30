import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique(),
  password: text("password"),
  googleId: text("google_id").unique(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // 'style_guide' | 'resume' | 'example_cover_letter'
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array(), // For categorizing style guides by company type, role, etc.
  isActive: boolean("is_active").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const jobDescriptions = pgTable("job_descriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  company: text("company").notNull(),
  content: text("content").notNull(),
  atsKeywords: text("ats_keywords").array(),
  keyRequirements: text("key_requirements").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  jobDescriptionId: integer("job_description_id").references(() => jobDescriptions.id),
  content: jsonb("content"),
  qualityScore: integer("quality_score"),
  atsScore: integer("ats_score"),
  styleScore: integer("style_score"),
  clarityScore: integer("clarity_score"),
  impactScore: integer("impact_score"),
  status: text("status").notNull(), // 'draft' | 'refining' | 'completed' | 'failed'
  iterations: integer("iterations").default(0),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const pipelineRuns = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  coverLetterId: integer("cover_letter_id").references(() => coverLetters.id),
  currentStep: text("current_step").notNull(),
  progress: integer("progress").default(0),
  status: text("status").notNull(), // 'running' | 'completed' | 'failed'
  agentLogs: jsonb("agent_logs"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const jobDescriptionsRelations = relations(jobDescriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [jobDescriptions.userId],
    references: [users.id],
  }),
  coverLetters: many(coverLetters),
}));

export const coverLettersRelations = relations(coverLetters, ({ one, many }) => ({
  user: one(users, {
    fields: [coverLetters.userId],
    references: [users.id],
  }),
  jobDescription: one(jobDescriptions, {
    fields: [coverLetters.jobDescriptionId],
    references: [jobDescriptions.id],
  }),
  pipelineRuns: many(pipelineRuns),
}));

export const pipelineRunsRelations = relations(pipelineRuns, ({ one }) => ({
  coverLetter: one(coverLetters, {
    fields: [pipelineRuns.coverLetterId],
    references: [coverLetters.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertJobDescriptionSchema = createInsertSchema(jobDescriptions).omit({
  id: true,
  createdAt: true,
  atsKeywords: true,
  keyRequirements: true,
});

export const insertCoverLetterSchema = createInsertSchema(coverLetters).omit({
  id: true,
  generatedAt: true,
});

export const insertPipelineRunSchema = createInsertSchema(pipelineRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertJobDescription = z.infer<typeof insertJobDescriptionSchema>;
export type JobDescription = typeof jobDescriptions.$inferSelect;

export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;
export type CoverLetter = typeof coverLetters.$inferSelect;

export type InsertPipelineRun = z.infer<typeof insertPipelineRunSchema>;
export type PipelineRun = typeof pipelineRuns.$inferSelect;
