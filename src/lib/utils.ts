import { clsx, type ClassValue } from "clsx";
import { isValidElement, ReactElement, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function stripThinkTags(text: string): string {
	// Remove anything that is between <think> and </think> (including the tags)
	return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// Helper function to recursively extract text from React nodes
export const extractText = (node: ReactNode): string => {
	// Base case
	if (typeof node === "string") {
		return node;
	}
	// Recursive case
	if (Array.isArray(node)) {
		return node.map(extractText).join("");
	}
	// Handle React elements
	if (isValidElement(node)) {
		// Handle text nodes
		const element = node as ReactElement<{ children?: ReactNode }>;
		// Recursively extract text from children
		return element.props.children ? extractText(element.props.children) : "";
	}
	return "";
};
