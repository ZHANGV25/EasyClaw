import { NextRequest, NextResponse } from "next/server";

// Simple placeholders for demonstration
const SCENES = [
  {
    url: "https://www.google.com",
    action: "Typing search query...",
    // Gray box with text "Google"
    img: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgODAwIDUwMCI+CiAgPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiNmZmZmZmYiIC8+CiAgPHRleHQgeD0iNDAwIiB5PSIyNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzU1NSI+R29vZ2xlPC90ZXh0Pgo8L3N2Zz4=",
  },
  {
    url: "https://www.google.com/search?q=flights+to+tokyo",
    action: "Clicking 'Flights'",
    // Gray box with text "Search Results"
    img: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgODAwIDUwMCI+CiAgPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiNmZmZmZmYiIC8+CiAgPHRleHQgeD0iNDAwIiB5PSIyNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzU1NSI+U2VhcmNoIFJlc3VsdHM6IEZsaWdodHMgdG8gVG9reW88L3RleHQ+Cjwvc3ZnPg==",
  },
  {
    url: "https://www.google.com/travel/flights",
    action: "Selecting date range...",
    // Gray box with text "Wxpedia"
    img: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNTAwIiB2aWV3Qm94PSIwIDAgODAwIDUwMCI+CiAgPHJlY3Qgd2lkdGg9IjgwMCIgaGVpZ2h0PSI1MDAiIGZpbGw9IiNmZmZmZmYiIC8+CiAgPHRleHQgeD0iNDAwIiB5PSIyNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzU1NSI+R29vZ2xlIEZsaWdodHM8L3RleHQ+Cjwvc3ZnPg==",
  },
];

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let index = 0;

      const sendFrame = () => {
        const scene = SCENES[index % SCENES.length];
        const data = JSON.stringify({
          timestamp: new Date().toISOString(),
          url: scene.url,
          screenshotBase64: scene.img,
          action: scene.action,
          status: "interacting",
        });
        
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        index++;
      };

      // Send initial frame
      sendFrame();

      // Simulate streaming updates every 2 seconds
      const interval = setInterval(sendFrame, 2000);

      // Clean up on close (this might not trigger immediately in all environments/mock settings)
      req.signal.onabort = () => {
        clearInterval(interval);
        controller.close();
      };
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
