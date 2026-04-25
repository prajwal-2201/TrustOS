import { RiskBadge, ScanCategory, ScanResult, InputType, SignalType } from "@/types";
import { getImageInfo } from "./imageAnalysis";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Signal {
  label: string;
  description: string;
  impact: number;  // -100 (very incriminating) to +100 (very exonerating)
  weight: number;  // 0-100, reliability of this signal
  type: SignalType;
}

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────

/**
 * Bayesian-style score update: each signal pulls the score toward
 * 5 (dangerous) or 95 (safe) with diminishing returns.
 * Multiple weak signals compound correctly; no single signal dominates.
 */
function applySignal(score: number, signal: Signal): number {
  const scaled = (signal.impact / 100) * (signal.weight / 100);
  if (scaled < 0) {
    return score + scaled * (score - 5);
  } else {
    return score + scaled * (95 - score);
  }
}

function computeConfidence(signals: Signal[]): number {
  if (signals.length === 0) return 20;
  const totalWeight = signals.reduce((s, sig) => s + sig.weight * Math.abs(sig.impact) / 100, 0);
  return Math.min(93, 18 + totalWeight * 0.65);
}

function calibrate(score: number, confidence: number): number {
  const uncertainty = (100 - confidence) / 100;
  return Math.round(score * (1 - uncertainty) + 50 * uncertainty);
}

function badgeFromScore(score: number): RiskBadge {
  if (score >= 65) return "safe";
  if (score >= 35) return "suspicious";
  return "dangerous";
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ─── CATEGORY PRIORS ─────────────────────────────────────────────────────────

const CATEGORY_PRIOR: Record<ScanCategory, number> = {
  payment:      45,  // payment screenshots have a high fraud rate
  whatsapp:     58,
  qr_code:      52,
  link_url:     68,
  offer_letter: 50,
  ai_image:     55,
  general:      65,
};

// ─── SUGGESTED ACTIONS ───────────────────────────────────────────────────────

function suggestedAction(badge: RiskBadge, category: ScanCategory): string {
  if (badge === "safe") {
    return "No significant red flags detected. Always verify through official channels for financial decisions.";
  }
  if (badge === "dangerous") {
    const actions: Record<ScanCategory, string> = {
      payment:      "Do NOT release goods or services based on this screenshot. Cross-verify the exact amount and reference directly inside your bank or UPI app. Scammers edit screenshots precisely.",
      whatsapp:     "Block and report this number immediately. Do NOT share your OTP, bank details, Aadhaar, or any personal information under any circumstance.",
      qr_code:      "Do NOT scan or pay via this QR code. Genuine payment QR codes from businesses are verifiable — always scan before paying and check the payee name carefully.",
      link_url:     "Do NOT click this link. It is likely a phishing site designed to steal credentials or money. Delete the message and report to cybercrime.gov.in.",
      offer_letter: "This offer is almost certainly fraudulent. Legitimate companies never charge a fee to join. Report to cybercrime.gov.in and the company's official HR.",
      ai_image:     "This image shows strong signs of AI generation or manipulation. Do not trust it as real-world evidence in any financial, legal, or personal decision.",
      general:      "Multiple scam indicators detected. Do not comply with any request in this content. Report to cybercrime.gov.in or 1930 (cybercrime helpline).",
    };
    return actions[category];
  }
  // suspicious
  const actions: Record<ScanCategory, string> = {
    payment:      "Verify this payment directly in your bank app before releasing anything. Ask the payer to show the transaction in their UPI app in real time.",
    whatsapp:     "Do not share personal or financial details. Call the supposed sender on a known number to confirm their identity before acting.",
    qr_code:      "Use a QR code reader to preview the destination URL before scanning. Confirm the payee name and amount before confirming any payment.",
    link_url:     "Do not click. Instead, type the official website URL manually in your browser. The visual appearance of a link can be deceptive.",
    offer_letter: "Research this company on official registration portals (MCA21, LinkedIn). Call their publicly listed HR number — not any number provided in this document.",
    ai_image:     "Some signals suggest this image may be altered. Corroborate any claims made with this image through independent sources.",
    general:      "Proceed with caution. Verify the sender, the claim, and any links or payment requests through independent official channels.",
  };
  return actions[category];
}

// ─── URL ANALYSIS ─────────────────────────────────────────────────────────────

const URL_SHORTENERS = new Set([
  "bit.ly","tinyurl.com","t.co","ow.ly","goo.gl","buff.ly","adf.ly","is.gd",
  "tiny.cc","v.gd","gg.gg","cutt.ly","rb.gy","shorturl.at","short.link",
  "clck.ru","l.ead.me","snip.ly","qr.net","t.me","wa.me","youtu.be",
  "amzn.to","fb.me","ift.tt","dlvr.it","soo.gd","0rz.tw","qr.io",
]);

const SUSPICIOUS_TLDS = new Set([
  ".xyz",".top",".click",".work",".loan",".win",".stream",".download",
  ".gq",".tk",".ml",".cf",".ga",".icu",".buzz",".monster",".fun",
  ".live",".vip",".bond",".rest",".ltd",".bar",".cyou",".cfd",
  ".sbs",".tokyo",".autos",".hair",".beauty",".realestate",
]);

const LEGIT_DOMAINS = new Set([
  "google.com","youtube.com","facebook.com","instagram.com","twitter.com","x.com",
  "amazon.in","amazon.com","flipkart.com","paytm.com","phonepe.com","gpay.app",
  "sbi.co.in","hdfcbank.com","icicibank.com","axisbank.com","kotak.com",
  "linkedin.com","whatsapp.com","apple.com","microsoft.com","npci.org.in",
  "incometax.gov.in","uidai.gov.in","irctc.co.in","epfindia.gov.in",
  "indiapost.gov.in","mca.gov.in","rbi.org.in","sebi.gov.in",
]);

const BRAND_SPOOF: { brand: string; pattern: RegExp }[] = [
  { brand: "Paytm",    pattern: /pay.?t+m(?!\.com)/i },
  { brand: "Google",   pattern: /g[o0]{2}gl[e3](?!\.com|apis\.com)/i },
  { brand: "SBI",      pattern: /\bsb[i1l]\b(?!\.co\.in)/i },
  { brand: "HDFC",     pattern: /hd+f+c(?!bank\.com)/i },
  { brand: "Amazon",   pattern: /amaz[o0]n(?!\.(in|com))/i },
  { brand: "PayPal",   pattern: /paypa[l1]/i },
  { brand: "Flipkart", pattern: /fl[i1]pkart(?!\.com)/i },
  { brand: "ICICI",    pattern: /[i1]c[i1]c[i1](?!bank\.com)/i },
  { brand: "PhonePe",  pattern: /ph[o0]nep[e3](?!\.com)/i },
  { brand: "Axis",     pattern: /ax[i1]sbank(?!\.com)/i },
  { brand: "Aadhaar",  pattern: /aadh?aar(?!\.gov\.in)/i },
  { brand: "IRCTC",    pattern: /irctc(?!\.co\.in)/i },
];

function analyzeURL(url: string): { score: number; confidence: number; signals: Signal[] } {
  const signals: Signal[] = [];
  let score = 68;
  const u = url.toLowerCase().trim();

  // Malformed / empty
  if (u.length < 5) {
    signals.push({ label: "Invalid URL", description: "The input does not appear to be a valid URL.", impact: -10, weight: 30, type: "minor" });
    return { score: calibrate(50, 20), confidence: 20, signals };
  }

  // Username@ phishing trick (e.g. paypal.com@evil.com)
  if (/@[a-z0-9]/.test(u)) {
    signals.push({ label: "Username Phishing Trick", description: "URL contains a username@ — browsers show the part before @ as the domain, but the real destination is after it. A classic phishing obfuscation.", impact: -80, weight: 92, type: "critical" });
  }

  // Raw IP as domain
  if (/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(u)) {
    signals.push({ label: "Raw IP Address Domain", description: "URL uses a numeric IP address instead of a domain name — no legitimate bank, government, or payment service does this. Major phishing red flag.", impact: -85, weight: 95, type: "critical" });
  }

  // URL shortener
  if ([...URL_SHORTENERS].some((s) => u.includes(s))) {
    signals.push({ label: "Shortened URL", description: "This is a shortened URL — the real destination is completely hidden and could lead anywhere including malware or phishing sites.", impact: -55, weight: 82, type: "major" });
  }

  // Suspicious TLD
  const suspiciousTLD = [...SUSPICIOUS_TLDS].find((tld) => u.includes(tld));
  if (suspiciousTLD) {
    signals.push({ label: `Suspicious TLD (${suspiciousTLD})`, description: `The domain uses "${suspiciousTLD}" — a TLD disproportionately used in scam, spam, and phishing sites due to low registration costs.`, impact: -45, weight: 78, type: "major" });
  }

  // Brand spoofing
  for (const bp of BRAND_SPOOF) {
    if (bp.pattern.test(u)) {
      signals.push({ label: `Fake "${bp.brand}" Site`, description: `The URL mimics the name of ${bp.brand} — a classic brand-spoofing attack. The real ${bp.brand} domain is well-known and does not match this URL.`, impact: -90, weight: 93, type: "critical" });
      break;
    }
  }

  // HTTP not HTTPS
  if (u.startsWith("http://") && !u.startsWith("https://")) {
    signals.push({ label: "No Encryption (HTTP)", description: "This link uses HTTP instead of HTTPS — any data you enter is transmitted in plain text and can be intercepted.", impact: -28, weight: 65, type: "minor" });
  }

  try {
    const parsed = new URL(u.startsWith("http") ? u : "https://" + u);
    const hostname = parsed.hostname;
    const path = parsed.pathname.toLowerCase();

    // Excessive hyphens in domain
    const hyphenCount = (hostname.match(/-/g) ?? []).length;
    if (hyphenCount >= 3) {
      signals.push({ label: "Hyphen-Stuffed Domain", description: `The domain has ${hyphenCount} hyphens — a pattern used to make scam domains look official (e.g., sbi-bank-secure-update.com).`, impact: -42, weight: 78, type: "major" });
    }

    // Excessive subdomains
    const subdomainCount = hostname.split(".").length - 2;
    if (subdomainCount >= 3) {
      signals.push({ label: "Excessive Subdomains", description: `The URL has ${subdomainCount} subdomain levels — used to bury a scam domain under a seemingly legitimate name (e.g., login.sbi.real-looking-scam.com).`, impact: -38, weight: 76, type: "major" });
    }

    // Brand name in path, not the domain
    const brandsInPath = ["paytm","sbi","hdfc","icici","upi","netbanking","paypal","amazon","flipkart","aadhaar","irctc"];
    if (brandsInPath.some((b) => path.includes(b)) && !LEGIT_DOMAINS.has(hostname) && ![...LEGIT_DOMAINS].some((d) => hostname.endsWith(d))) {
      signals.push({ label: "Brand Name in Path Only", description: "A well-known brand name appears in the URL path, not the domain — a trick to fool users who see the brand name without checking the actual domain.", impact: -48, weight: 82, type: "major" });
    }

    // Non-standard port
    if (parsed.port && !["80", "443", ""].includes(parsed.port)) {
      signals.push({ label: `Non-Standard Port (:${parsed.port})`, description: "The URL uses an unusual port number — no legitimate bank or payment gateway uses non-standard ports for user-facing pages.", impact: -32, weight: 72, type: "major" });
    }

    // Very long URL
    if (u.length > 250) {
      signals.push({ label: "Excessively Long URL", description: "The URL is unusually long — a technique used to bury the malicious domain in a long string of fake-looking legitimate text.", impact: -22, weight: 55, type: "minor" });
    }

    // Double file extensions (e.g., file.pdf.exe)
    if (/\.(pdf|doc|xls|png|jpg)\.[a-z]{2,4}$/i.test(path)) {
      signals.push({ label: "Double File Extension", description: "URL path contains a double extension (e.g., .pdf.exe) — used in malware distribution to trick users into running executables.", impact: -70, weight: 88, type: "critical" });
    }

    // Known legitimate domain
    const isLegit = LEGIT_DOMAINS.has(hostname) || [...LEGIT_DOMAINS].some((d) => hostname === d || hostname.endsWith("." + d));
    if (isLegit) {
      signals.push({ label: "Known Legitimate Domain", description: `The domain (${hostname}) matches a verified, well-established service.`, impact: +55, weight: 72, type: "positive" });
    }
  } catch {
    signals.push({ label: "Unparseable URL", description: "The URL could not be parsed as a valid web address — possibly obfuscated or malformed.", impact: -20, weight: 58, type: "minor" });
  }

  if (signals.length === 0) {
    signals.push({ label: "No Red Flags in Structure", description: "The URL structure does not match known phishing patterns. This does not guarantee safety — always verify the domain by typing it manually.", impact: +15, weight: 40, type: "positive" });
  }

  for (const s of signals) score = applySignal(score, s);
  const confidence = computeConfidence(signals);
  return { score: calibrate(Math.max(4, Math.min(96, score)), confidence), confidence: Math.round(confidence), signals };
}

// ─── TEXT ANALYSIS ────────────────────────────────────────────────────────────

function analyzeText(text: string, category: ScanCategory): { score: number; confidence: number; signals: Signal[] } {
  const signals: Signal[] = [];
  let score = CATEGORY_PRIOR[category];
  const t = text.toLowerCase();

  // ── CRITICAL SCAM SIGNALS ────────────────────────────────────────────────

  if (/\botp\b|\bone.?time.?pass|\bverification.?code\b|\bdo not share.{0,20}(otp|code|pin)\b|\benter.{0,20}otp\b/i.test(t)) {
    signals.push({ label: "OTP Request", description: "Message asks for or mentions a One-Time Password (OTP). No legitimate service — bank, government, or company — will ask you to share or forward an OTP. This is account takeover.", impact: -85, weight: 95, type: "critical" });
  }

  if (/\b(won|win|winner|lucky|prize|lottery|lucky draw|sweepstakes|reward).{0,80}(claim|collect|redeem|send|receive|deposit|courier|delivery)\b/i.test(t)) {
    signals.push({ label: "Prize / Lottery Claim", description: "Message claims you have won a prize, lottery, or lucky draw. You cannot win a contest you never entered. This is a fee-advance scam — any 'processing fee' you pay is gone forever.", impact: -88, weight: 96, type: "critical" });
  }

  if (/\b(account|kyc|card|service).{0,40}(block|freeze|suspend|deactivat|clos|terminat)/i.test(t) || /your account (will be|has been) (blocked|frozen|suspended)/i.test(t)) {
    signals.push({ label: "Account Freeze Threat", description: "Message threatens to block or freeze your account if you don't act immediately. Banks and regulators send legal notices by post — they never threaten via WhatsApp or SMS.", impact: -80, weight: 92, type: "critical" });
  }

  if (/\b(internship|job|position|vacancy|work.from.home|part.time|freelance).{0,100}(fee|deposit|registration|processing|advance|charges|security.deposit).{0,50}(rs\.?|₹|inr)?\s*[\d,]+/i.test(t)) {
    signals.push({ label: "Job / Internship Fee", description: "Message describes a job or internship that requires upfront payment. Legitimate employers never charge candidates to join. Any payment request is a scam.", impact: -85, weight: 94, type: "critical" });
  }

  if (/\b(like.{0,10}video|watch.{0,10}video|subscribe|task.{0,20}earn|easy.{0,10}money|per.task|daily.income|daily.earning|online.job|earn.from.home).{0,60}(rs\.?|₹|inr)?\s*[\d,]+/i.test(t)) {
    signals.push({ label: "Task / Easy Money Scam", description: "Message promises easy earnings for simple online tasks (liking videos, completing surveys). Victims initially receive small payments, then are tricked into large deposits that are never returned.", impact: -82, weight: 90, type: "critical" });
  }

  if (/\b(income.tax|it.dept|enforcement|cbi|cyber.cell|police|court|magistrate|legal.action|arrest|fir).{0,80}(notice|issued|filed|pending|action|warrant|summons)\b/i.test(t)) {
    signals.push({ label: "Authority Impersonation", description: "Message claims to be from a government authority (IT Dept, CBI, Cyber Cell). Official agencies NEVER contact citizens via WhatsApp or SMS for threats, fines, or arrest warrants.", impact: -78, weight: 88, type: "critical" });
  }

  if (/\b(upi|paytm|phonepe|gpay|bhim).{0,30}(send|transfer|pay|deposit).{0,30}(rs\.?|₹|inr)?\s*[\d,]+/i.test(t) || /send.{0,20}money.{0,40}(rs\.?|₹).{0,10}[\d,]+/i.test(t)) {
    signals.push({ label: "Unsolicited Payment Request", description: "Message requests a direct UPI or mobile payment transfer. Scammers impersonate family, employers, merchants, or government to create urgency for money transfers.", impact: -72, weight: 88, type: "critical" });
  }

  if (/\b(aadh?aar|pan.card|passport.no|account.no|ifsc|cvv|atm.pin|card.pin|card.number|date.of.birth|mother.?s.name|security.question)/i.test(t)) {
    signals.push({ label: "Sensitive Data Request", description: "Message requests sensitive personal or financial identifiers (Aadhaar, PAN, CVV, PIN). No legitimate bank, government service, or company collects these via chat.", impact: -68, weight: 85, type: "critical" });
  }

  // ── CRYPTO / INVESTMENT SCAMS ──────────────────────────────────────────

  if (/\b(crypto|bitcoin|ethereum|usdt|binance|investment|trading|portfolio|profit|return).{0,80}(guaranteed|assured|daily|weekly|monthly|return|profit|double|triple|10x|100x)\b/i.test(t)) {
    signals.push({ label: "Investment / Crypto Scam", description: "Message promises guaranteed returns on investments, crypto, or trading. No legitimate investment can guarantee returns. These are advance-fee or Ponzi schemes.", impact: -78, weight: 88, type: "critical" });
  }

  // ── MAJOR RISK SIGNALS ────────────────────────────────────────────────

  // Urgency pressure
  const urgencyTerms = ["urgent","immediately","within 24 hour","within 48 hour","act now","last chance","expires today","expire soon","do not delay","time sensitive","deadline today","respond now","asap","right now","final warning","last warning","take immediate action"];
  const urgencyCount = urgencyTerms.filter((w) => t.includes(w)).length;
  if (urgencyCount >= 3) {
    signals.push({ label: `Extreme Urgency (${urgencyCount} phrases)`, description: `Message uses ${urgencyCount} different urgency phrases — a core social engineering technique to prevent you from thinking critically or consulting others.`, impact: -52, weight: 80, type: "major" });
  } else if (urgencyCount >= 1) {
    signals.push({ label: "Urgency Language", description: "Message uses urgency language to create panic and prevent careful thinking — a hallmark of scam messaging.", impact: -28, weight: 68, type: "major" });
  }

  // APK / software download request
  if (/\b(download|install|apk|app).{0,60}(click|link|sent|attached|below|here)\b/i.test(t)) {
    signals.push({ label: "Asks to Install Software", description: "Message asks you to download or install an app or file. This is a common way to install malware or remote access tools on your device.", impact: -65, weight: 84, type: "major" });
  }

  // Suspicious embedded link
  const urlMatch = t.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    const embeddedResult = analyzeURL(urlMatch[0]);
    if (embeddedResult.score < 40) {
      signals.push({ label: "Dangerous Embedded Link", description: `Message contains a high-risk link: ${urlMatch[0].slice(0, 55)}${urlMatch[0].length > 55 ? "…" : ""}`, impact: -58, weight: 85, type: "major" });
    } else if (embeddedResult.score < 60) {
      signals.push({ label: "Suspicious Embedded Link", description: `Message contains a link with concerning characteristics: ${urlMatch[0].slice(0, 55)}`, impact: -30, weight: 65, type: "major" });
    }
  }

  // WhatsApp chain forwarding
  if (category === "whatsapp" && /forward.{0,50}(everyone|all.contacts|all.groups|more than \d+|\d+ people|\d+ contacts)/i.test(t)) {
    signals.push({ label: "Chain Forwarding Request", description: "Message instructs mass forwarding — used to amplify scam reach and create false credibility through social proof.", impact: -40, weight: 72, type: "major" });
  }

  // Romance / love scam
  if (/\b(love|miss you|beautiful|handsome|soulmate|relationship|girlfriend|boyfriend).{0,100}(money|send|transfer|help|emergency|hospital|visa|ticket|stuck)\b/i.test(t)) {
    signals.push({ label: "Romance Scam Pattern", description: "Message combines romantic language with an urgent request for money, travel, or medical help — the signature pattern of romance/pig-butchering scams.", impact: -75, weight: 84, type: "major" });
  }

  // Fake parcel / delivery
  if (/\b(parcel|package|courier|delivery|shipment|dhl|fedex|amazon|flipkart).{0,80}(held|pending|customs|fee|duty|charge|release|payment|pay)\b/i.test(t)) {
    signals.push({ label: "Fake Delivery Fee", description: "Message claims a package is held and requires a customs or delivery fee payment. Legitimate couriers invoice through official channels — not SMS or WhatsApp.", impact: -62, weight: 80, type: "major" });
  }

  // ── MINOR RISK / POSITIVE SIGNALS ─────────────────────────────────────

  const professionalPhrases = ["please find attached","as discussed","kind regards","best regards","looking forward to","thank you for","meeting scheduled","invoice attached","order confirmation","tracking number","reference number","ticket id","purchase order"];
  const professionalCount = professionalPhrases.filter((p) => t.includes(p)).length;
  if (professionalCount >= 2) {
    signals.push({ label: "Professional Communication", description: `Message contains ${professionalCount} phrases consistent with legitimate professional correspondence.`, impact: +35, weight: 55, type: "positive" });
  }

  const casualPhrases = ["see you","let me know","sounds good","how are you","catch up","where are you","call me when","dinner tonight","are you free"];
  const casualCount = casualPhrases.filter((p) => t.includes(p)).length;
  if (casualCount >= 2 && urgencyCount === 0 && signals.filter(s => s.impact < 0).length === 0) {
    signals.push({ label: "Casual Personal Language", description: "Message contains natural conversational language consistent with genuine personal communication.", impact: +28, weight: 48, type: "positive" });
  }

  // No signals
  if (signals.length === 0) {
    signals.push({ label: "No Scam Patterns Detected", description: "No known scam language patterns were found in this text. The absence of red flags is a positive indicator but not a guarantee.", impact: +20, weight: 45, type: "positive" });
    signals.push({ label: "Analysis Advisory", description: "Tip: if this content involves any payment request, link, or personal data, verify through official channels before acting regardless of this result.", impact: 0, weight: 0, type: "minor" });
  }

  for (const s of signals) score = applySignal(score, s);
  const confidence = computeConfidence(signals);
  return { score: calibrate(Math.max(4, Math.min(96, score)), confidence), confidence: Math.round(confidence), signals };
}

// ─── FILE ANALYSIS ────────────────────────────────────────────────────────────

async function analyzeFile(
  filename: string,
  mimeType: string,
  fileSize: number,
  category: ScanCategory,
  fileUri?: string,
): Promise<{ score: number; confidence: number; signals: Signal[] }> {
  const signals: Signal[] = [];
  let score = CATEGORY_PRIOR[category];

  const nameLower = filename.toLowerCase().trim();
  const ext = nameLower.split(".").pop()?.trim() ?? "";
  const sizeKB = fileSize / 1024;
  const sizeMB = sizeKB / 1024;

  // ── UNIVERSAL FORMAT SIGNALS ────────────────────────────────────────────

  if (["heic", "heif"].includes(ext)) {
    signals.push({ label: "iPhone Native Format (HEIC)", description: "HEIC is the exclusive output format of iPhone cameras. AI generators and editing software almost never produce HEIC files — this is a strong indicator of an authentic, unedited camera capture.", impact: +75, weight: 92, type: "positive" });
  } else if (["raw", "cr2", "cr3", "nef", "arw", "dng", "rw2", "orf"].includes(ext)) {
    signals.push({ label: "Camera RAW File", description: "RAW files contain uncompressed sensor data from a physical camera. It is technically impossible for AI generators to produce genuine RAW files. This is almost certainly a real photograph.", impact: +88, weight: 97, type: "positive" });
  }

  // Camera naming conventions (high-confidence real-device patterns)
  if (/^img_\d{4,}\.(jpg|jpeg|heic)$/i.test(nameLower)) {
    signals.push({ label: "DSLR Naming Pattern", description: "Filename follows the IMG_XXXX convention used by Canon, Nikon, and Sony DSLRs.", impact: +38, weight: 72, type: "positive" });
  } else if (/^dsc[n_p]?\d+\.(jpg|jpeg)$/i.test(nameLower)) {
    signals.push({ label: "Sony/Nikon Camera Name", description: "Filename matches DSC_XXXX or DSCN_XXXX — the naming convention of Sony and Nikon cameras.", impact: +38, weight: 72, type: "positive" });
  } else if (/^(img|image)-\d{8}-wa\d+/i.test(nameLower)) {
    signals.push({ label: "WhatsApp Media File", description: "Filename matches WhatsApp's media naming convention (IMG-YYYYMMDD-WAXXXXXX.jpg). Indicates a file shared through WhatsApp.", impact: +18, weight: 50, type: "positive" });
  } else if (/^screenshot[_\s]?\d{8}/i.test(nameLower)) {
    signals.push({ label: "Standard Screenshot Name", description: "Filename matches Android/iOS screenshot naming convention.", impact: +12, weight: 48, type: "positive" });
  } else if (/^\d{8}_\d{6}\.(jpg|jpeg|png)$/i.test(nameLower)) {
    signals.push({ label: "Timestamp-Named Photo", description: "Filename is a date-time stamp matching Android camera or file-manager conventions.", impact: +20, weight: 55, type: "positive" });
  }

  // AI generator naming patterns
  if (/^[a-f0-9]{8,}[-_]?[a-f0-9]*\.(png|jpg|webp)$/i.test(nameLower)) {
    signals.push({ label: "AI Hash Filename", description: "Filename is a hexadecimal hash — the standard output format of Stable Diffusion, Midjourney, ComfyUI, and FLUX AI generators. Rarely used by cameras or human users.", impact: -65, weight: 88, type: "critical" });
  }
  if (/(generated|ai.?(art|img|image|photo|face)|dalle|dall.e|midjourney|stable.diff?|stablediff?|comfyui|sdxl|flux|firefly|leonardo|runwayml|kling|sora)/i.test(nameLower)) {
    signals.push({ label: "AI Tool Name in Filename", description: "Filename explicitly references a known AI image or video generation tool (DALL-E, Midjourney, Stable Diffusion, ComfyUI, Flux, etc.).", impact: -82, weight: 94, type: "critical" });
  }
  if (/^image\s*[\(\[]?\d+[\)\]]?\.(png|webp|jpg)$/i.test(nameLower) || /^image_\d{3,4}\.(png|webp)$/i.test(nameLower)) {
    signals.push({ label: "Generic AI Output Name", description: "Filename is 'image (1).png' or 'image_001.png' — the auto-generated default name used by many AI tools and web-based generators.", impact: -35, weight: 68, type: "major" });
  }

  // WebP = web AI signal
  if (ext === "webp") {
    signals.push({ label: "WebP Format", description: "WebP is the default export of Midjourney web, Adobe Firefly, Canva AI, and other browser-based AI tools. Cameras don't natively save WebP.", impact: -28, weight: 65, type: "major" });
  }

  // ── IMAGE DIMENSION ANALYSIS ──────────────────────────────────────────

  if (fileUri && ["jpg","jpeg","png","webp","heic","gif"].includes(ext)) {
    const imgInfo = await getImageInfo(fileUri);
    if (imgInfo) {
      if (imgInfo.isHighRes) {
        signals.push({ label: `High-Resolution Image (${imgInfo.megapixels}MP)`, description: `Image is ${imgInfo.megapixels} megapixels (${imgInfo.width}×${imgInfo.height}). At this resolution it is almost certainly captured by a real camera — AI generators rarely produce images above 4MP.`, impact: +55, weight: 82, type: "positive" });
      } else if (imgInfo.isAIGridDimension && !["heic","heif","raw","cr2","cr3","nef"].includes(ext)) {
        signals.push({ label: `AI Grid Dimensions (${imgInfo.width}×${imgInfo.height})`, description: `Image dimensions (${imgInfo.width}×${imgInfo.height}) are multiples of 64 — the latent grid constraint common to all diffusion-based AI generators. Combined with ${imgInfo.isSquare ? "the 1:1 square ratio, " : ""}this is a strong AI generation signal.`, impact: -58, weight: 85, type: "major" });
      } else if (imgInfo.isSquare && !imgInfo.isHighRes) {
        signals.push({ label: `Square Image (${imgInfo.width}×${imgInfo.height})`, description: `Image is perfectly square — real-world cameras almost never capture square images without manual cropping. This aspect ratio is the default for many AI generators.`, impact: -30, weight: 65, type: "major" });
      }
    }
  }

  // ── CATEGORY-SPECIFIC SIGNALS ─────────────────────────────────────────

  if (category === "payment") {
    if (ext === "png" && sizeKB < 60) {
      signals.push({ label: "Tiny Payment PNG (< 60 KB)", description: "This payment screenshot is extremely small. Authentic UPI payment confirmations from BHIM, Paytm, PhonePe, GPay are typically 150–600 KB. Fraudsters generate minimal-size edited PNGs to show fake amounts. Verify directly in your bank app.", impact: -82, weight: 92, type: "critical" });
    } else if (ext === "png" && sizeKB < 150) {
      signals.push({ label: "Small Payment PNG (< 150 KB)", description: "Payment screenshot is smaller than typical authentic receipts. Real payment app screenshots usually exceed 150 KB. Verify the exact amount in your own bank or UPI app.", impact: -42, weight: 78, type: "major" });
    } else if (ext === "png" && sizeKB >= 150) {
      signals.push({ label: "Normal Screenshot Size", description: "File size is in a plausible range for an authentic app-generated payment screenshot.", impact: +20, weight: 55, type: "positive" });
    }
    if ((ext === "jpg" || ext === "jpeg") && sizeKB < 100) {
      signals.push({ label: "Re-saved JPEG Screenshot", description: "Payment screenshots saved as JPEG at small sizes are often edited — real payment apps produce PNG screenshots. JPEG compression can also hide editing artifacts.", impact: -32, weight: 68, type: "major" });
    }
  }

  if (category === "ai_image") {
    if (sizeMB > 4 && ["jpg","jpeg"].includes(ext)) {
      signals.push({ label: "Large Camera-Quality JPEG", description: `File is ${sizeMB.toFixed(1)} MB — a size consistent with high-quality camera photos. Most AI generators export compressed files well below 4MB.`, impact: +45, weight: 78, type: "positive" });
    }
    if (ext === "webp" || ext === "avif") {
      signals.push({ label: "Web-Optimized AI Format", description: "WebP/AVIF are the preferred output formats of browser-based AI image generators. Physical cameras do not natively save these formats.", impact: -38, weight: 72, type: "major" });
    }
  }

  if (category === "offer_letter") {
    if (ext === "pdf") {
      signals.push({ label: "PDF Format (Expected)", description: "Offer letter is in PDF format — the standard format for legitimate HR documents with proper company letterhead, signatures, and seals.", impact: +30, weight: 62, type: "positive" });
    } else if (["docx","doc"].includes(ext)) {
      signals.push({ label: "Word Document", description: "Word format is used by some companies for offer letters. Verify the company on official portals before proceeding.", impact: +10, weight: 45, type: "positive" });
    } else if (["jpg","jpeg","png","webp"].includes(ext)) {
      signals.push({ label: "Offer Letter as Image File", description: "Legitimate HR departments send offer letters as PDF or DOCX — never as a photo. Receiving an offer letter as an image is a strong indicator of a fake document.", impact: -65, weight: 88, type: "critical" });
    }
    if (ext === "pdf" && sizeKB < 30) {
      signals.push({ label: "Suspiciously Small PDF", description: "This PDF is unusually small for an offer letter that should contain company branding, role details, terms, CTC breakup, and signatures.", impact: -28, weight: 62, type: "major" });
    }
  }

  if (category === "qr_code") {
    signals.push({ label: "QR Code Image", description: "Visual analysis of QR codes is limited — to fully verify, use a QR code reader app to preview the destination URL before scanning. Never scan a QR code received from an unknown source that requests payment.", impact: -8, weight: 40, type: "minor" });
    if (sizeKB < 10) {
      signals.push({ label: "Very Small QR Image", description: "The image is very small — may be cropped or compressed. Verify the full context of where this QR code appeared.", impact: -15, weight: 45, type: "minor" });
    }
  }

  if (category === "whatsapp") {
    if (ext === "png" && sizeKB < 50) {
      signals.push({ label: "Small PNG Screenshot", description: "Very small PNG images circulating in WhatsApp are frequently fake screenshots of payment confirmations or winning messages. Authentic in-app screenshots are larger.", impact: -40, weight: 72, type: "major" });
    }
  }

  // No meaningful signals
  if (signals.length === 0 || (signals.length === 1 && signals[0].impact === 0)) {
    const baseline: Signal[] = [
      { label: "No Definitive Signals", description: "The file's name, format, and size do not match patterns for either authentic or fake content. Additional context would improve accuracy.", impact: 0, weight: 0, type: "minor" },
      { label: "Provide More Context", description: "For a more accurate analysis, paste any accompanying text or URL in the Text/URL scan mode alongside this file.", impact: 0, weight: 0, type: "minor" },
    ];
    const finalScore = calibrate(score, 22);
    return { score: finalScore, confidence: 22, signals: baseline };
  }

  for (const s of signals) score = applySignal(score, s);
  const confidence = computeConfidence(signals);
  return { score: calibrate(Math.max(4, Math.min(96, score)), confidence), confidence: Math.round(confidence), signals };
}

// ─── MAIN ENTRYPOINT ──────────────────────────────────────────────────────────

export async function runAnalysis(params: {
  inputType: InputType;
  category: ScanCategory;
  text?: string;
  url?: string;
  filename?: string;
  mimeType?: string;
  fileSize?: number;
  fileUri?: string;
}): Promise<ScanResult> {
  await new Promise((r) => setTimeout(r, 1000 + Math.random() * 800));

  const { inputType, category, text, url, filename, mimeType, fileSize, fileUri } = params;

  let score: number;
  let confidence: number;
  let signals: Signal[];

  switch (inputType) {
    case "url": {
      const r = analyzeURL(url ?? "");
      score = r.score; confidence = r.confidence; signals = r.signals;
      break;
    }
    case "text": {
      const r = analyzeText(text ?? "", category);
      score = r.score; confidence = r.confidence; signals = r.signals;
      break;
    }
    default: {
      const r = await analyzeFile(filename ?? "unknown", mimeType ?? "", fileSize ?? 0, category, fileUri);
      score = r.score; confidence = r.confidence; signals = r.signals;
    }
  }

  const badge = badgeFromScore(score);
  const action = suggestedAction(badge, category);

  const displayInput =
    inputType === "text" ? (text ?? "").slice(0, 60) + ((text?.length ?? 0) > 60 ? "…" : "") :
    inputType === "url"  ? (url ?? "") :
    (filename ?? "Unknown file");

  return {
    id: generateId(),
    inputType,
    category,
    displayInput,
    trustScore: score,
    badge,
    confidence: Math.round(confidence),
    reasons: signals.map((s) => s.description),
    signalLabels: signals.map((s) => s.label),
    signalTypes: signals.map((s) => s.type),
    suggestedAction: action,
    timestamp: Date.now(),
    mimeType,
    fileSize,
  };
}
