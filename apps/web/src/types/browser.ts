export interface BrowserFrame {
  timestamp: string;
  url: string;
  screenshotBase64: string; // JPEG or PNG data URI
  action?: string; // "Clicking 'Book Now'", "Typing in search field"
  status: "navigating" | "interacting" | "waiting" | "idle";
}

export interface BrowserStatus {
  active: boolean;
  currentUrl?: string;
  lastScreenshotAt?: string;
}
