export type RiskBadge = "safe" | "suspicious" | "dangerous";

export type ScanCategory =
  | "payment"
  | "whatsapp"
  | "qr_code"
  | "link_url"
  | "offer_letter"
  | "ai_image"
  | "general";

export type InputType = "file" | "text" | "url";

export type SignalType = "critical" | "major" | "minor" | "positive";

export interface ScanResult {
  id: string;
  inputType: InputType;
  category: ScanCategory;
  displayInput: string;
  trustScore: number;
  badge: RiskBadge;
  confidence: number;
  reasons: string[];
  signalLabels?: string[];
  signalTypes?: SignalType[];
  suggestedAction: string;
  timestamp: number;
  mimeType?: string;
  fileSize?: number;
}

export const CATEGORY_META: Record<
  ScanCategory,
  { label: string; icon: string; description: string; color: string }
> = {
  payment: {
    label: "Payment Screenshot",
    icon: "card-outline",
    description: "UPI receipts, bank transfers, transaction proofs",
    color: "#6366f1",
  },
  whatsapp: {
    label: "WhatsApp / Message",
    icon: "chatbubble-outline",
    description: "Suspicious chats, OTP requests, urgent messages",
    color: "#22c55e",
  },
  qr_code: {
    label: "QR Code",
    icon: "qr-code-outline",
    description: "Payment QR codes, suspicious scan targets",
    color: "#f59e0b",
  },
  link_url: {
    label: "Link / URL",
    icon: "link-outline",
    description: "Phishing pages, shortened links, fake sites",
    color: "#3b82f6",
  },
  offer_letter: {
    label: "Offer Letter / PDF",
    icon: "document-text-outline",
    description: "Internship offers, HR documents, fake jobs",
    color: "#8b5cf6",
  },
  ai_image: {
    label: "AI Image Detection",
    icon: "hardware-chip-outline",
    description: "Detect AI-generated or manipulated images",
    color: "#ec4899",
  },
  general: {
    label: "General",
    icon: "shield-outline",
    description: "Anything that seems suspicious or unclear",
    color: "#64748b",
  },
};
