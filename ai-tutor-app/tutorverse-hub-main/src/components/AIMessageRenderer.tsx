import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'prismjs/themes/prism-tomorrow.css';
import 'katex/dist/katex.min.css';

// Import Prism and languages in correct order
import Prism from 'prismjs';
import 'prismjs/components/prism-markup-templating'; // Required for some languages
import 'prismjs/components/prism-clike'; // Required for C-like languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import { Copy, Check, BarChart2 } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from './AIMessageRenderer.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AIMessageRendererProps {
  content: string;
}

interface CodeBlockProps {
  language?: string;
  value: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    Prism.highlightAll();
  }, [value]);

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLanguage}>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className={styles.copyButton}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span className="ml-1">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="ml-1">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className={styles.codeContent}>
        <code className={`language-${language || 'text'}`}>{value}</code>
      </pre>
    </div>
  );
};

// Chart detection and rendering
const ChartRenderer: React.FC<{ chartData: any }> = ({ chartData }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#374151',
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
      },
      title: {
        display: true,
        text: chartData.title || '',
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold' as const,
          family: "'Inter', sans-serif",
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
      },
    },
    scales: chartData.type !== 'pie' ? {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    } : undefined,
  };

  const data = {
    labels: chartData.labels,
    datasets: chartData.datasets.map((dataset: any, index: number) => ({
      ...dataset,
      backgroundColor: chartData.type === 'pie' 
        ? ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
        : `rgba(59, 130, 246, ${0.8 - index * 0.2})`,
      borderColor: chartData.type === 'pie'
        ? ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777']
        : `rgba(37, 99, 235, ${1 - index * 0.2})`,
      borderWidth: 2,
      tension: 0.4,
    })),
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartWrapper}>
        {chartData.type === 'line' && <Line options={chartOptions} data={data} />}
        {chartData.type === 'bar' && <Bar options={chartOptions} data={data} />}
        {chartData.type === 'pie' && <Pie options={chartOptions} data={data} />}
      </div>
    </div>
  );
};

// Parse and detect chart data from markdown
const parseChartData = (content: string): { hasChart: boolean; chartData: any; remainingContent: string } => {
  const chartRegex = /```chart\s*\n([\s\S]*?)```/;
  const match = content.match(chartRegex);
  
  if (!match) {
    return { hasChart: false, chartData: null, remainingContent: content };
  }

  try {
    const chartData = JSON.parse(match[1]);
    const remainingContent = content.replace(match[0], '');
    return { hasChart: true, chartData, remainingContent };
  } catch (error) {
    return { hasChart: false, chartData: null, remainingContent: content };
  }
};

export const AIMessageRenderer: React.FC<AIMessageRendererProps> = ({ content }) => {
  const { hasChart, chartData, remainingContent } = parseChartData(content);

  return (
    <div className={styles.messageRenderer}>
      {hasChart && <ChartRenderer chartData={chartData} />}
      
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className={styles.heading1}>{children}</h1>,
          h2: ({ children }) => <h2 className={styles.heading2}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles.heading3}>{children}</h3>,
          h4: ({ children }) => <h4 className={styles.heading4}>{children}</h4>,
          p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
          ul: ({ children }) => <ul className={styles.unorderedList}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.orderedList}>{children}</ol>,
          li: ({ children }) => <li className={styles.listItem}>{children}</li>,
          strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
          em: ({ children }) => <em className={styles.emphasis}>{children}</em>,
          blockquote: ({ children }) => <blockquote className={styles.blockquote}>{children}</blockquote>,
          table: ({ children }) => (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={styles.tableHead}>{children}</thead>,
          tbody: ({ children }) => <tbody className={styles.tableBody}>{children}</tbody>,
          tr: ({ children }) => <tr className={styles.tableRow}>{children}</tr>,
          th: ({ children }) => <th className={styles.tableHeader}>{children}</th>,
          td: ({ children }) => <td className={styles.tableCell}>{children}</td>,
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (!inline && language) {
              return <CodeBlock language={language} value={String(children).replace(/\n$/, '')} />;
            }
            
            return (
              <code className={styles.inlineCode} {...props}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a href={href} className={styles.link} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          hr: () => <hr className={styles.divider} />,
        }}
      >
        {remainingContent}
      </ReactMarkdown>
    </div>
  );
};
