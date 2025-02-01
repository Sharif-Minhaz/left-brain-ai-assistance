import StreamingChat from "@/components/chat/StreamingChat";
import { Github } from "lucide-react";

export default function Home() {
	return (
		<div className="relative">
			<a
				className="absolute top-4 right-4 text-[#fafbfc] inline-block"
				href="https://github.com/Sharif-Minhaz/left-brain-ai-assistance"
				target="_blank"
			>
				<span className="w-10 h-10 shadow-md rounded-full bg-[#2B3137] flex items-center justify-center">
					<Github size={18} />
				</span>
			</a>
			<StreamingChat />
		</div>
	);
}
