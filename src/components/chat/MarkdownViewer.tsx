import { Copy } from "lucide-react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.min.css";
import { useState, ReactNode, isValidElement, ReactElement } from "react";
import rehypeRaw from "rehype-raw";

interface CodeProps {
	inline?: boolean;
	className?: string;
	children?: ReactNode;
}

interface MarkdownViewerProps {
	content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
	const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

	// Preprocess the content: replace \boxed{...} with bold markdown **...**
	const processedContent = content
		.replace(/\\boxed{(.*?)}/g, "**$1**")
		.replace(/<think>/g, "\n<deep-think>\n")
		.replace(/<\/think>/g, "\n</deep-think>\n")
		.replace(/<deep-think>\s*<\/deep-think>/g, "");

	// Helper function to recursively extract text from React nodes
	const extractText = (node: ReactNode): string => {
		if (typeof node === "string") {
			return node;
		}
		if (Array.isArray(node)) {
			return node.map(extractText).join("");
		}
		if (isValidElement(node)) {
			const element = node as ReactElement<{ children?: ReactNode }>;
			return element.props.children ? extractText(element.props.children) : "";
		}
		return "";
	};

	// Function to handle copy action per block
	const handleCopy = (key: string) => {
		setCopiedMap((prev) => ({ ...prev, [key]: true }));
		setTimeout(() => {
			setCopiedMap((prev) => ({ ...prev, [key]: false }));
		}, 2000);
	};

	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeHighlight, rehypeRaw]}
			components={{
				code({ inline, className, children }: CodeProps) {
					const match = /language-(\w+)/.exec(className || "");
					const language = match ? match[1] : "plaintext";

					// Use the helper function to get raw code text
					const text = extractText(children);
					const key = text.substring(0, 10);

					// If rendering inline code, just return the <code> element.
					if (inline) {
						return <code className={className}>{children}</code>;
					}

					// If language is "plaintext", just render a simple code block without extra UI.
					if (language === "plaintext") {
						return <code className="plaintext">{children}</code>;
					}

					// For other languages, show the full block with copy button and language badge.
					return (
						<div className="relative group">
							{/* Language Label */}
							<span className="absolute inline-block top-2 right-10 bg-gray-800 text-white text-xs px-2 py-1 rounded">
								{language}
							</span>

							{/* Copy Button */}
							<CopyToClipboard text={text} onCopy={() => handleCopy(key)}>
								<button className="absolute top-2 right-2 bg-gray-700 text-white text-xs px-2 py-1 rounded hover:bg-gray-600">
									{copiedMap[key] ? "Copied!" : <Copy size={14} />}
								</button>
							</CopyToClipboard>

							{/* Code Block */}
							<pre className={`rounded-lg overflow-x-auto ${className || ""}`}>
								<code>{children}</code>
							</pre>
						</div>
					);
				},
			}}
			className="prose dark:prose-invert !max-w-full w-full break-words overflow-x-auto"
		>
			{processedContent}
		</ReactMarkdown>
	);
}
