import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export document to PDF
 */
export async function exportToPDF(title: string, content: string): Promise<void> {
  try {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';

    // Add title and content
    container.innerHTML = `
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${title}</h1>
      <div class="prose prose-lg">${content}</div>
    `;

    document.body.appendChild(container);

    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Download
    pdf.save(`${title || 'document'}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
}

/**
 * Convert HTML to Markdown
 */
export function exportToMarkdown(title: string, htmlContent: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  let markdown = `# ${title}\n\n`;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    let result = '';

    switch (tagName) {
      case 'h1':
        result = `# ${element.textContent}\n\n`;
        break;
      case 'h2':
        result = `## ${element.textContent}\n\n`;
        break;
      case 'h3':
        result = `### ${element.textContent}\n\n`;
        break;
      case 'p':
        result = `${Array.from(element.childNodes).map(processNode).join('')}\n\n`;
        break;
      case 'strong':
      case 'b':
        result = `**${element.textContent}**`;
        break;
      case 'em':
      case 'i':
        result = `*${element.textContent}*`;
        break;
      case 'u':
        result = `<u>${element.textContent}</u>`;
        break;
      case 'a':
        result = `[${element.textContent}](${element.getAttribute('href')})`;
        break;
      case 'code':
        if (element.parentElement?.tagName.toLowerCase() === 'pre') {
          result = `\`\`\`\n${element.textContent}\n\`\`\`\n\n`;
        } else {
          result = `\`${element.textContent}\``;
        }
        break;
      case 'pre':
        // Skip, handled by code block
        result = Array.from(element.childNodes).map(processNode).join('');
        break;
      case 'ul':
        result = Array.from(element.children)
          .map((li) => `- ${li.textContent}`)
          .join('\n') + '\n\n';
        break;
      case 'ol':
        result = Array.from(element.children)
          .map((li, index) => `${index + 1}. ${li.textContent}`)
          .join('\n') + '\n\n';
        break;
      case 'li':
        // Handled by ul/ol
        break;
      case 'blockquote':
        result = Array.from(element.childNodes)
          .map(processNode)
          .join('')
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n') + '\n\n';
        break;
      case 'img':
        result = `![${element.getAttribute('alt') || 'image'}](${element.getAttribute('src')})\n\n`;
        break;
      case 'table':
        result = convertTableToMarkdown(element as HTMLTableElement);
        break;
      case 'br':
        result = '\n';
        break;
      default:
        result = Array.from(element.childNodes).map(processNode).join('');
    }

    return result;
  }

  function convertTableToMarkdown(table: HTMLTableElement): string {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) {
      return '';
    }

    let md = '\n';

    // Header row
    const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
    md += '| ' + headerCells.map((cell) => cell.textContent?.trim() || '').join(' | ') + ' |\n';
    md += '| ' + headerCells.map(() => '---').join(' | ') + ' |\n';

    // Data rows
    for (let i = 1; i < rows.length; i++) {
      const cells = Array.from(rows[i].querySelectorAll('td'));
      md += '| ' + cells.map((cell) => cell.textContent?.trim() || '').join(' | ') + ' |\n';
    }

    return md + '\n';
  }

  markdown += processNode(tempDiv);

  return markdown;
}

/**
 * Download Markdown file
 */
export function downloadMarkdown(title: string, htmlContent: string): void {
  const markdown = exportToMarkdown(title, htmlContent);
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title || 'document'}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download HTML file
 */
export function downloadHTML(title: string, htmlContent: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      font-weight: 600;
    }
    h1 {
      font-size: 2.5em;
      border-bottom: 2px solid #eee;
      padding-bottom: 0.3em;
    }
    h2 {
      font-size: 2em;
      border-bottom: 1px solid #eee;
      padding-bottom: 0.3em;
    }
    h3 {
      font-size: 1.5em;
    }
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1em;
      margin-left: 0;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.5em;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: 600;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${htmlContent}
</body>
</html>
  `.trim();

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title || 'document'}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main export function that handles all formats
 */
export async function exportDocument(
  format: 'pdf' | 'markdown' | 'html',
  title: string,
  content: string
): Promise<void> {
  switch (format) {
    case 'pdf':
      await exportToPDF(title, content);
      break;
    case 'markdown':
      downloadMarkdown(title, content);
      break;
    case 'html':
      downloadHTML(title, content);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
