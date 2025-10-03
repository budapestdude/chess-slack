import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults } from '../types/agent';
import executionService from '../services/executionService';
import taskService from '../services/taskService';
import logger from '../utils/logger';

/**
 * DatabaseSpecialistAgent - Expert in database operations and optimization.
 * Capabilities include schema design and migrations, query optimization,
 * data modeling, index creation, and database performance tuning.
 */
export class DatabaseSpecialistAgent extends BaseAgent {
  /**
   * Execute a task assigned to this agent
   *
   * @param task - The task to execute
   * @returns Promise resolving to task results
   */
  public async executeTask(task: AgentTask): Promise<TaskResults> {
    this.setCurrentTaskId(task.id);
    const startTime = Date.now();

    try {
      await this.updateStatus('busy');
      await this.reportProgress(task.id, 0, 'Starting database task');

      await this.log('task_started', { taskId: task.id, title: task.title }, true);

      const context = task.context || {};
      const dbTaskType = context.dbTaskType || 'migration';

      let results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        commandsExecuted: [],
        artifactsCreated: [],
        output: '',
        summary: '',
      };

      // Route to appropriate database handler
      switch (dbTaskType) {
        case 'migration':
          results = await this.handleMigration(task);
          break;
        case 'optimization':
          results = await this.handleQueryOptimization(task);
          break;
        case 'indexing':
          results = await this.handleIndexing(task);
          break;
        case 'modeling':
          results = await this.handleDataModeling(task);
          break;
        case 'performance':
          results = await this.handlePerformanceTuning(task);
          break;
        default:
          results = await this.handleMigration(task);
          break;
      }

      await this.reportProgress(task.id, 100, 'Database task completed');

      const duration = Date.now() - startTime;
      await this.log(
        'task_completed',
        { taskId: task.id, duration },
        true,
        JSON.stringify(results),
        undefined,
        duration
      );

      await this.updateStatus('idle');
      this.setCurrentTaskId(undefined);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      await this.log(
        'task_failed',
        { taskId: task.id, error: errorMessage },
        false,
        undefined,
        errorMessage,
        duration
      );

      await this.updateStatus('error');
      this.setCurrentTaskId(undefined);

      throw error;
    }
  }

  /**
   * Handle migration creation
   */
  private async handleMigration(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Creating database migration');

    const context = task.context || {};
    const description = context.description || task.description || 'database changes';

    // Generate migration
    const migration = await this.createMigration(description);

    await this.reportProgress(task.id, 60, 'Saving migration file');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Create migration file
    const timestamp = Date.now();
    const migrationFileName = `${timestamp}_${description.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const migrationPath = `migrations/${migrationFileName}`;

    const fullPath = await executionService.createFile(
      this.getWorkspaceId(),
      migrationPath,
      migration
    );

    results.filesCreated!.push(fullPath);

    // Create artifact
    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'code',
      filePath: fullPath,
      content: migration,
      language: 'sql',
      metadata: {
        migrationType: 'schema',
        description,
      },
    });

    results.artifactsCreated!.push(artifactId);

    results.output = `Created migration: ${migrationFileName}`;
    results.summary = `Successfully created database migration for: ${description}`;

    return results;
  }

  /**
   * Handle query optimization
   */
  private async handleQueryOptimization(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing queries');

    const context = task.context || {};
    const queries = context.queries || [];

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    const optimizations: Array<{
      original: string;
      optimized: string;
      explanation: string;
    }> = [];

    for (const query of queries) {
      try {
        await this.reportProgress(task.id, 40, 'Optimizing query');

        const optimization = await this.optimizeQuery(query);
        optimizations.push({
          original: query,
          optimized: optimization.optimized,
          explanation: optimization.explanation,
        });
      } catch (error) {
        logger.error('Failed to optimize query', { query, error });
      }
    }

    // Create optimization report
    const report = this.generateOptimizationReport(optimizations);
    const reportPath = 'database/query-optimization-report.md';

    const fullPath = await executionService.createFile(
      this.getWorkspaceId(),
      reportPath,
      report
    );

    results.filesCreated!.push(fullPath);

    // Create artifact
    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: fullPath,
      content: report,
      metadata: {
        optimizationCount: optimizations.length,
      },
    });

    results.artifactsCreated!.push(artifactId);

    results.output = `Optimized ${optimizations.length} queries.`;
    results.summary = `Successfully optimized ${optimizations.length} database queries.`;

    return results;
  }

  /**
   * Handle indexing recommendations
   */
  private async handleIndexing(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing table structure');

    const context = task.context || {};
    const tableName = context.tableName || 'table';
    const queries = context.queries || [];

    // Suggest indexes
    const indexes = await this.suggestIndexes(tableName, queries);

    await this.reportProgress(task.id, 60, 'Creating index migration');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Create index migration
    const indexMigration = this.generateIndexMigration(tableName, indexes);
    const migrationPath = `migrations/${Date.now()}_add_indexes_${tableName}.sql`;

    const fullPath = await executionService.createFile(
      this.getWorkspaceId(),
      migrationPath,
      indexMigration
    );

    results.filesCreated!.push(fullPath);

    // Create artifact
    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'code',
      filePath: fullPath,
      content: indexMigration,
      language: 'sql',
      metadata: {
        tableName,
        indexCount: indexes.length,
      },
    });

    results.artifactsCreated!.push(artifactId);

    results.output = `Suggested ${indexes.length} indexes for ${tableName}.`;
    results.summary = `Created index migration with ${indexes.length} recommended indexes.`;

    return results;
  }

  /**
   * Handle data modeling
   */
  private async handleDataModeling(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Designing data model');

    const context = task.context || {};
    const description = context.description || task.description || '';
    const entities = context.entities || [];

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Generate schema
    const schema = this.generateSchema(entities, description);

    // Create schema file
    const schemaPath = 'database/schema.sql';
    const fullPath = await executionService.createFile(
      this.getWorkspaceId(),
      schemaPath,
      schema
    );

    results.filesCreated!.push(fullPath);

    // Create diagram/documentation
    const documentation = this.generateSchemaDocumentation(entities);
    const docPath = 'database/schema-documentation.md';

    const fullDocPath = await executionService.createFile(
      this.getWorkspaceId(),
      docPath,
      documentation
    );

    results.filesCreated!.push(fullDocPath);

    // Create artifacts
    const schemaArtifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'code',
      filePath: fullPath,
      content: schema,
      language: 'sql',
      metadata: {
        modelType: 'schema',
        entityCount: entities.length,
      },
    });

    const docArtifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: fullDocPath,
      content: documentation,
      metadata: {
        modelType: 'documentation',
      },
    });

    results.artifactsCreated!.push(schemaArtifactId, docArtifactId);

    results.output = `Created data model with ${entities.length} entities.`;
    results.summary = `Successfully designed and documented database schema.`;

    return results;
  }

  /**
   * Handle performance tuning
   */
  private async handlePerformanceTuning(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing database performance');

    const context = task.context || {};

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Generate performance tuning recommendations
    const recommendations = this.generatePerformanceRecommendations(context);

    // Create recommendations document
    const recommendationsDoc = this.formatRecommendations(recommendations);
    const docPath = 'database/performance-recommendations.md';

    const fullPath = await executionService.createFile(
      this.getWorkspaceId(),
      docPath,
      recommendationsDoc
    );

    results.filesCreated!.push(fullPath);

    // Create artifact
    const artifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'documentation',
      filePath: fullPath,
      content: recommendationsDoc,
      metadata: {
        recommendationCount: recommendations.length,
      },
    });

    results.artifactsCreated!.push(artifactId);

    results.output = `Generated ${recommendations.length} performance recommendations.`;
    results.summary = `Created database performance tuning recommendations.`;

    return results;
  }

  /**
   * Create a database migration
   *
   * @param description - Description of migration
   * @returns Promise resolving to migration SQL
   */
  public async createMigration(description: string): Promise<string> {
    await this.log('create_migration', { description }, true);

    // Placeholder implementation - in production, would analyze requirements
    const timestamp = new Date().toISOString();

    const migration = `-- Migration: ${description}
-- Created: ${timestamp}

-- UP Migration
BEGIN;

-- Add your schema changes here
-- Example:
-- CREATE TABLE example_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW(),
--   updated_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE INDEX idx_example_name ON example_table(name);

COMMIT;

-- DOWN Migration
-- BEGIN;

-- Rollback changes here
-- Example:
-- DROP TABLE IF EXISTS example_table;

-- COMMIT;
`;

    logger.info('Migration created', { description });
    return migration;
  }

  /**
   * Optimize a SQL query
   *
   * @param query - Original query
   * @returns Promise resolving to optimized query and explanation
   */
  public async optimizeQuery(
    query: string
  ): Promise<{ optimized: string; explanation: string }> {
    await this.log('optimize_query', { queryLength: query.length }, true);

    // Placeholder implementation - in production, would use query analyzer
    let optimized = query;
    const optimizations: string[] = [];

    // Check for SELECT *
    if (query.includes('SELECT *')) {
      optimized = optimized.replace('SELECT *', 'SELECT id, name, created_at');
      optimizations.push('Replaced SELECT * with specific columns to reduce data transfer');
    }

    // Check for missing WHERE clause on large tables
    if (!query.toLowerCase().includes('where') && !query.toLowerCase().includes('limit')) {
      optimized += ' LIMIT 1000';
      optimizations.push('Added LIMIT clause to prevent full table scan');
    }

    // Suggest using EXISTS instead of COUNT
    if (query.includes('COUNT(*)') && query.includes('> 0')) {
      optimizations.push('Consider using EXISTS instead of COUNT(*) > 0 for better performance');
    }

    // Check for N+1 query pattern
    if (query.toLowerCase().includes('select') && query.toLowerCase().includes('from')) {
      optimizations.push('Review for N+1 query patterns - consider using JOINs or batch queries');
    }

    const explanation = optimizations.length > 0
      ? optimizations.join('\n- ')
      : 'Query looks optimized. Consider adding indexes on frequently queried columns.';

    logger.info('Query optimized', { optimizations: optimizations.length });
    return { optimized, explanation };
  }

  /**
   * Suggest indexes for a table
   *
   * @param tableName - Table name
   * @param queries - Common queries on the table
   * @returns Promise resolving to index suggestions
   */
  public async suggestIndexes(tableName: string, queries: string[]): Promise<string[]> {
    await this.log('suggest_indexes', { tableName, queryCount: queries.length }, true);

    const indexes: string[] = [];
    const columns = new Set<string>();

    // Analyze queries for commonly used columns
    for (const query of queries) {
      // Extract WHERE clause columns
      const whereMatch = query.match(/WHERE\s+(\w+)/gi);
      if (whereMatch) {
        whereMatch.forEach(match => {
          const col = match.replace(/WHERE\s+/i, '').trim();
          columns.add(col);
        });
      }

      // Extract JOIN columns
      const joinMatch = query.match(/JOIN\s+\w+\s+ON\s+\w+\.(\w+)/gi);
      if (joinMatch) {
        joinMatch.forEach(match => {
          const col = match.match(/\.(\w+)$/)?.[1];
          if (col) columns.add(col);
        });
      }

      // Extract ORDER BY columns
      const orderMatch = query.match(/ORDER BY\s+(\w+)/gi);
      if (orderMatch) {
        orderMatch.forEach(match => {
          const col = match.replace(/ORDER BY\s+/i, '').trim();
          columns.add(col);
        });
      }
    }

    // Generate index suggestions
    columns.forEach(col => {
      if (col !== 'id') { // id is usually primary key
        indexes.push(`CREATE INDEX idx_${tableName}_${col} ON ${tableName}(${col});`);
      }
    });

    // Suggest common indexes
    if (!columns.has('created_at')) {
      indexes.push(`CREATE INDEX idx_${tableName}_created_at ON ${tableName}(created_at);`);
    }

    // Suggest composite indexes for common query patterns
    if (columns.size >= 2) {
      const cols = Array.from(columns).slice(0, 2);
      indexes.push(`CREATE INDEX idx_${tableName}_${cols.join('_')} ON ${tableName}(${cols.join(', ')});`);
    }

    logger.info('Index suggestions generated', { tableName, indexCount: indexes.length });
    return indexes;
  }

  /**
   * Generate index migration SQL
   */
  private generateIndexMigration(tableName: string, indexes: string[]): string {
    const timestamp = new Date().toISOString();

    let migration = `-- Add Indexes for ${tableName}
-- Created: ${timestamp}

BEGIN;

`;

    indexes.forEach(index => {
      migration += `${index}\n`;
    });

    migration += `
COMMIT;

-- Rollback
-- BEGIN;
`;

    indexes.forEach(index => {
      const indexName = index.match(/idx_[\w_]+/)?.[0];
      if (indexName) {
        migration += `-- DROP INDEX IF EXISTS ${indexName};\n`;
      }
    });

    migration += `-- COMMIT;\n`;

    return migration;
  }

  /**
   * Generate schema from entities
   */
  private generateSchema(entities: any[], description: string): string {
    const timestamp = new Date().toISOString();

    let schema = `-- Database Schema
-- Description: ${description}
-- Created: ${timestamp}

`;

    entities.forEach((entity: any) => {
      schema += `CREATE TABLE ${entity.name || 'example_table'} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

`;
    });

    return schema;
  }

  /**
   * Generate schema documentation
   */
  private generateSchemaDocumentation(entities: any[]): string {
    let doc = `# Database Schema Documentation

## Overview
This document describes the database schema and relationships.

## Tables

`;

    entities.forEach((entity: any) => {
      doc += `### ${entity.name || 'Table'}

**Description**: ${entity.description || 'Table description'}

**Columns**:
- \`id\` (UUID, Primary Key): Unique identifier
- \`created_at\` (TIMESTAMP): Creation timestamp
- \`updated_at\` (TIMESTAMP): Last update timestamp

**Indexes**: TBD

**Relations**: TBD

---

`;
    });

    return doc;
  }

  /**
   * Generate optimization report
   */
  private generateOptimizationReport(
    optimizations: Array<{ original: string; optimized: string; explanation: string }>
  ): string {
    let report = `# Query Optimization Report

Generated: ${new Date().toISOString()}

## Summary
Optimized ${optimizations.length} queries.

## Optimizations

`;

    optimizations.forEach((opt, index) => {
      report += `### Query ${index + 1}

**Original**:
\`\`\`sql
${opt.original}
\`\`\`

**Optimized**:
\`\`\`sql
${opt.optimized}
\`\`\`

**Explanation**:
${opt.explanation}

---

`;
    });

    return report;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(context: any): string[] {
    const recommendations = [
      'Add indexes on frequently queried columns',
      'Use connection pooling to reduce connection overhead',
      'Implement query result caching for read-heavy workloads',
      'Use EXPLAIN ANALYZE to identify slow queries',
      'Consider partitioning large tables',
      'Regularly run VACUUM and ANALYZE on PostgreSQL',
      'Monitor and optimize slow query logs',
      'Use materialized views for complex aggregations',
      'Implement database-level constraints for data integrity',
      'Review and optimize JOIN operations',
    ];

    return recommendations;
  }

  /**
   * Format recommendations as markdown
   */
  private formatRecommendations(recommendations: string[]): string {
    let doc = `# Database Performance Recommendations

Generated: ${new Date().toISOString()}

## Recommendations

`;

    recommendations.forEach((rec, index) => {
      doc += `${index + 1}. ${rec}\n`;
    });

    doc += `
## Next Steps

1. Review each recommendation
2. Prioritize based on your workload
3. Implement changes incrementally
4. Monitor performance metrics
5. Iterate and optimize further
`;

    return doc;
  }
}
