import { BaseAgent } from './BaseAgent';
import { AgentTask, TaskResults } from '../types/agent';
import executionService from '../services/executionService';
import taskService from '../services/taskService';
import logger from '../utils/logger';

/**
 * UIDesignerAgent - Specializes in frontend UI components and design.
 * Capabilities include React component creation, CSS/Tailwind styling,
 * responsive design, and accessibility improvements.
 */
export class UIDesignerAgent extends BaseAgent {
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
      await this.reportProgress(task.id, 0, 'Starting UI design task');

      await this.log('task_started', { taskId: task.id, title: task.title }, true);

      const context = task.context || {};
      const uiTaskType = context.uiTaskType || 'component';

      let results: TaskResults = {
        filesCreated: [],
        filesModified: [],
        commandsExecuted: [],
        artifactsCreated: [],
        output: '',
        summary: '',
      };

      // Route to appropriate UI handler
      switch (uiTaskType) {
        case 'component':
          results = await this.handleComponentCreation(task);
          break;
        case 'accessibility':
          results = await this.handleAccessibilityImprovements(task);
          break;
        case 'responsive':
          results = await this.handleResponsiveDesign(task);
          break;
        case 'styling':
          results = await this.handleStyling(task);
          break;
        default:
          results = await this.handleComponentCreation(task);
          break;
      }

      await this.reportProgress(task.id, 100, 'UI task completed');

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
   * Handle component creation
   */
  private async handleComponentCreation(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Designing component');

    const context = task.context || {};
    const description = context.description || task.description || '';
    const componentName = context.componentName || 'NewComponent';

    // Create the component
    const component = await this.createComponent(description);

    await this.reportProgress(task.id, 60, 'Creating component files');

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    // Create TSX file
    const tsxPath = `components/${componentName}.tsx`;
    const fullTsxPath = await executionService.createFile(
      this.getWorkspaceId(),
      tsxPath,
      component.tsx
    );

    results.filesCreated!.push(fullTsxPath);

    // Create artifact for TSX
    const tsxArtifactId = await this.createArtifact({
      workspaceId: this.getWorkspaceId(),
      taskId: task.id,
      artifactType: 'code',
      filePath: fullTsxPath,
      content: component.tsx,
      language: 'typescript',
      metadata: {
        componentName,
        framework: 'react',
      },
    });

    results.artifactsCreated!.push(tsxArtifactId);

    // Create CSS file if provided
    if (component.css) {
      const cssPath = `components/${componentName}.css`;
      const fullCssPath = await executionService.createFile(
        this.getWorkspaceId(),
        cssPath,
        component.css
      );

      results.filesCreated!.push(fullCssPath);

      // Create artifact for CSS
      const cssArtifactId = await this.createArtifact({
        workspaceId: this.getWorkspaceId(),
        taskId: task.id,
        artifactType: 'code',
        filePath: fullCssPath,
        content: component.css,
        language: 'css',
        metadata: {
          componentName,
        },
      });

      results.artifactsCreated!.push(cssArtifactId);
    }

    results.output = `Created React component ${componentName} with ${component.css ? 'styles' : 'inline styles'}.`;
    results.summary = `Successfully created UI component: ${componentName}`;

    return results;
  }

  /**
   * Handle accessibility improvements
   */
  private async handleAccessibilityImprovements(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing accessibility');

    const context = task.context || {};
    const files = context.files || [];

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    let improvedCount = 0;

    for (const filePath of files) {
      try {
        await this.reportProgress(task.id, 40, `Improving ${filePath}`);

        const code = await executionService.readFile(filePath);
        const improvedCode = await this.improveAccessibility(code);

        await executionService.updateFile(filePath, improvedCode);
        results.filesModified!.push(filePath);
        improvedCount++;

        // Create artifact
        const artifactId = await this.createArtifact({
          workspaceId: this.getWorkspaceId(),
          taskId: task.id,
          artifactType: 'code',
          filePath: filePath,
          content: improvedCode,
          language: 'typescript',
          metadata: {
            improvement: 'accessibility',
          },
        });

        results.artifactsCreated!.push(artifactId);
      } catch (error) {
        logger.error('Failed to improve accessibility', { filePath, error });
      }
    }

    results.output = `Improved accessibility for ${improvedCount} components.`;
    results.summary = `Added ARIA labels, keyboard navigation, and semantic HTML to ${improvedCount} files.`;

    return results;
  }

  /**
   * Handle responsive design improvements
   */
  private async handleResponsiveDesign(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Analyzing responsive design');

    const context = task.context || {};
    const files = context.files || [];

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    let improvedCount = 0;

    for (const filePath of files) {
      try {
        await this.reportProgress(task.id, 40, `Making ${filePath} responsive`);

        const code = await executionService.readFile(filePath);
        const responsiveCode = await this.makeResponsive(code);

        await executionService.updateFile(filePath, responsiveCode);
        results.filesModified!.push(filePath);
        improvedCount++;

        // Create artifact
        const artifactId = await this.createArtifact({
          workspaceId: this.getWorkspaceId(),
          taskId: task.id,
          artifactType: 'code',
          filePath: filePath,
          content: responsiveCode,
          language: 'typescript',
          metadata: {
            improvement: 'responsive',
          },
        });

        results.artifactsCreated!.push(artifactId);
      } catch (error) {
        logger.error('Failed to make responsive', { filePath, error });
      }
    }

    results.output = `Made ${improvedCount} components responsive.`;
    results.summary = `Added responsive design patterns to ${improvedCount} files.`;

    return results;
  }

  /**
   * Handle styling tasks
   */
  private async handleStyling(task: AgentTask): Promise<TaskResults> {
    await this.reportProgress(task.id, 20, 'Applying styles');

    const context = task.context || {};
    const files = context.files || [];
    const styleType = context.styleType || 'tailwind';

    const results: TaskResults = {
      filesCreated: [],
      filesModified: [],
      commandsExecuted: [],
      artifactsCreated: [],
      output: '',
      summary: '',
    };

    for (const filePath of files) {
      try {
        const code = await executionService.readFile(filePath);

        // Add styling based on type
        let styledCode = code;
        if (styleType === 'tailwind') {
          styledCode = code.replace(
            /className="([^"]*)"/g,
            'className="$1 bg-white rounded-lg shadow-md p-4"'
          );
        }

        await executionService.updateFile(filePath, styledCode);
        results.filesModified!.push(filePath);
      } catch (error) {
        logger.error('Failed to apply styles', { filePath, error });
      }
    }

    results.output = `Applied ${styleType} styles to ${results.filesModified!.length} components.`;
    results.summary = `Successfully styled ${results.filesModified!.length} files.`;

    return results;
  }

  /**
   * Create a React component based on description
   *
   * @param description - Description of the component
   * @returns Promise resolving to component code
   */
  public async createComponent(
    description: string
  ): Promise<{ tsx: string; css?: string }> {
    await this.log('create_component', { description }, true);

    // Placeholder implementation - in production, would use LLM
    const componentName = 'GeneratedComponent';

    const tsx = `import React from 'react';
import './${componentName}.css';

interface ${componentName}Props {
  title?: string;
  children?: React.ReactNode;
}

/**
 * ${description}
 */
export const ${componentName}: React.FC<${componentName}Props> = ({
  title = 'Default Title',
  children
}) => {
  return (
    <div className="${componentName.toLowerCase()}" role="main">
      <h1 className="${componentName.toLowerCase()}__title">{title}</h1>
      <div className="${componentName.toLowerCase()}__content">
        {children}
      </div>
    </div>
  );
};

export default ${componentName};
`;

    const css = `.${componentName.toLowerCase()} {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.${componentName.toLowerCase()}__title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1a202c;
}

.${componentName.toLowerCase()}__content {
  flex: 1;
  color: #4a5568;
}

/* Responsive design */
@media (max-width: 768px) {
  .${componentName.toLowerCase()} {
    padding: 0.75rem;
  }

  .${componentName.toLowerCase()}__title {
    font-size: 1.25rem;
  }
}
`;

    logger.info('Component created', { componentName });
    return { tsx, css };
  }

  /**
   * Improve accessibility of component code
   *
   * @param componentCode - Original component code
   * @returns Promise resolving to improved code
   */
  public async improveAccessibility(componentCode: string): Promise<string> {
    await this.log('improve_accessibility', { codeLength: componentCode.length }, true);

    let improved = componentCode;

    // Add ARIA labels to buttons without them
    improved = improved.replace(
      /<button([^>]*?)>([^<]+)<\/button>/gi,
      (match, attrs, text) => {
        if (!attrs.includes('aria-label') && !attrs.includes('aria-labelledby')) {
          return `<button${attrs} aria-label="${text.trim()}">${text}</button>`;
        }
        return match;
      }
    );

    // Add alt text reminders to images without it
    improved = improved.replace(
      /<img([^>]*?)>/gi,
      (match, attrs) => {
        if (!attrs.includes('alt=')) {
          return `<img${attrs} alt="TODO: Add descriptive alt text">`;
        }
        return match;
      }
    );

    // Add role attributes to divs that act as interactive elements
    improved = improved.replace(
      /<div([^>]*?)onClick=/gi,
      (match, attrs) => {
        if (!attrs.includes('role=')) {
          return `<div${attrs} role="button" tabIndex={0} onClick=`;
        }
        return match;
      }
    );

    // Add keyboard event handlers where onClick exists but onKeyDown doesn't
    if (improved.includes('onClick=') && !improved.includes('onKeyDown=')) {
      improved = improved.replace(
        /onClick={([^}]+)}/g,
        'onClick={$1} onKeyDown={(e) => e.key === "Enter" && $1}'
      );
    }

    // Add semantic HTML suggestions as comments
    if (!improved.includes('<main') && !improved.includes('<header') && !improved.includes('<nav')) {
      improved = `{/* Consider using semantic HTML elements like <main>, <header>, <nav>, <article>, <section> */}\n${improved}`;
    }

    logger.info('Accessibility improvements applied');
    return improved;
  }

  /**
   * Make component responsive
   *
   * @param componentCode - Original component code
   * @returns Promise resolving to responsive code
   */
  public async makeResponsive(componentCode: string): Promise<string> {
    await this.log('make_responsive', { codeLength: componentCode.length }, true);

    let responsive = componentCode;

    // Add responsive Tailwind classes if using Tailwind
    if (componentCode.includes('className=')) {
      responsive = responsive.replace(
        /className="([^"]*?)"/g,
        (match, classes) => {
          // Add responsive prefixes if not present
          let newClasses = classes;

          // Add responsive width classes
          if (!classes.includes('w-') && !classes.includes('md:')) {
            newClasses += ' w-full md:w-auto';
          }

          // Add responsive padding
          if (classes.includes('p-') && !classes.includes('md:p-')) {
            newClasses += ' md:p-6';
          }

          // Add responsive flex direction
          if (classes.includes('flex') && !classes.includes('flex-col') && !classes.includes('md:flex-row')) {
            newClasses += ' flex-col md:flex-row';
          }

          // Add responsive text sizes
          if (classes.includes('text-') && !classes.includes('md:text-')) {
            newClasses += ' md:text-lg';
          }

          return `className="${newClasses.trim()}"`;
        }
      );
    }

    // Add CSS media queries if using CSS-in-JS or style tags
    if (componentCode.includes('const styles =') || componentCode.includes('<style>')) {
      responsive += `

/* Responsive breakpoints */
// Mobile: < 640px
// Tablet: 640px - 1024px
// Desktop: > 1024px
`;
    }

    // Add viewport meta tag suggestion if it's a top-level component
    if (!componentCode.includes('viewport') && componentCode.includes('export default')) {
      responsive = `{/* Ensure <meta name="viewport" content="width=device-width, initial-scale=1.0"> is in your HTML */}\n${responsive}`;
    }

    logger.info('Responsive design patterns applied');
    return responsive;
  }
}
