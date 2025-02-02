import { NextResponse } from "next/server";
import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "@/configs";

export async function POST(request: Request) {
	const { prompt } = await request.json();

	// Pass the incoming request's abort signal to the upstream fetch.
	const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: true }),
		signal: request.signal,
	});

	if (!response.body) {
		return NextResponse.error();
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();

	// a readableStream to process and re-stream the data
	const stream = new ReadableStream({
		async start(controller) {
			let buffer = "";
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					// If the client aborted the request, stop processing.
					if (request.signal.aborted) {
						console.log("Aborted by client.");
						break;
					}

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || ""; // keep the incomplete line

					for (const line of lines) {
						try {
							const json = JSON.parse(line);
							if (json.response) {
								controller.enqueue(json.response);
							}
						} catch (err) {
							console.error("JSON parse error:", err);
						}
					}
				}
			} catch (error) {
				console.error("Stream error:", error);
			} finally {
				controller.close();
			}
		},
		cancel() {
			console.log("Stream aborted by client.");
			reader.cancel();
		},
	});

	// Return the stream as the response
	return new NextResponse(stream, {
		headers: { "Content-Type": "text/event-stream" },
	});
}
