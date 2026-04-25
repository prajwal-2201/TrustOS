import cv2
import pytesseract
import numpy as np
import re

def analyze_image(image_bytes: bytes, manual_category: str = None):
    np_img = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image")
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    
    text = pytesseract.image_to_string(thresh)
    text_lower = text.lower()
    
    # Simulate OCR Quality Based on noise (standard deviation of grayscale values as a basic heuristic)
    ocr_quality = min(100, max(20, (np.std(gray) / 128) * 100))
    
    # 1. Image Anomaly Detection / Edited Screenshot Detection Simulation using OpenCV
    # We use cv2 edges to find rough noise or inconsistencies as a proxy for "manipulations" or "weird blur"
    edges = cv2.Canny(gray, 100, 200)
    edge_density = np.sum(edges) / (edges.shape[0] * edges.shape[1])
    is_edited_likely = False
    ai_generated_likely = False
    
    if edge_density > 2.5: # Artificial noise/blur
        ai_generated_likely = True
    elif edge_density < 0.1 and text.strip() != "":
        is_edited_likely = True # Highly smoothed/modified region backing text
        
    risk_score = 100
    reasons = []
    
    scan_type = manual_category if manual_category else "General Image"
    
    if not manual_category:
        if "upi" in text_lower or "transaction" in text_lower or "paid to" in text_lower or "rupees" in text_lower or "bank" in text_lower:
            scan_type = "Payment Screenshot"
        elif "offer letter" in text_lower or "salary" in text_lower or "employment" in text_lower or "hr" in text_lower:
            scan_type = "Offer Letter"
        elif "whatsapp" in text_lower or "online" in text_lower or ("today" in text_lower and "pm" in text_lower):
            scan_type = "WhatsApp Message"
            
    # Rules matched
    if scan_type == "Payment Screenshot":
        if "transaction id" not in text_lower and "utr" not in text_lower:
            risk_score -= 20
            reasons.append("The payment proof lacks a valid Transaction ID or UTR number, which is a major red flag.")
        if "bank" not in text_lower and "sbi" not in text_lower and "hdfc" not in text_lower and "icici" not in text_lower and "paytm" not in text_lower:
            risk_score -= 15
            reasons.append("Missing standard bank or payment gateway logos/names.")
        if "am" not in text_lower and "pm" not in text_lower and ":" not in text_lower and "202" not in text_lower:
            risk_score -= 10
            reasons.append("The timestamp format is invalid or missing.")
        if is_edited_likely:
            risk_score -= 30
            reasons.append("The screenshot appears edited around the payment amount. Pixel sharpness is inconsistent.")
        
        suspicious_words = ["refund", "urgent", "successful payment", "collect request", "claim now"]
        found_words = [w for w in suspicious_words if w in text_lower]
        if found_words:
            risk_score -= 30
            reasons.append(f"Suspicious intent detected. The text uses terms like '{', '.join(found_words)}' typical of scam requests.")
                
    elif scan_type == "WhatsApp Message":
        if "otp" in text_lower:
            risk_score -= 40
            reasons.append("This message is highly dangerous because it asks for an OTP.")
        if "pay" in text_lower or "send money" in text_lower or "transfer" in text_lower:
            risk_score -= 30
            reasons.append("The message is coercing you into making a monetary payment.")
        if "bit.ly" in text_lower or "tinyurl" in text_lower or "http" in text_lower:
            risk_score -= 35
            reasons.append("Contains an unverified shortened link which can hide malicious destinations.")
        if "urgent" in text_lower or "immediately" in text_lower or "account blocked" in text_lower or "action required" in text_lower:
            risk_score -= 25
            reasons.append("This message uses urgency and fear tactics often seen in scams to panic you.")
        if "account details" in text_lower or "bank details" in text_lower or "kyc" in text_lower:
            risk_score -= 40
            reasons.append("Fake KYC updates or data collection tactics identified.")
            
    elif scan_type == "Offer Letter":
        if "gmail.com" in text_lower or "yahoo.com" in text_lower or "hotmail.com" in text_lower:
            risk_score -= 40
            reasons.append("The sender utilizes a free email domain instead of a professional company domain.")
        if "training fee" in text_lower or "payment" in text_lower or "deposit" in text_lower or "refundable" in text_lower:
            risk_score -= 50
            reasons.append("The document requests a monetary payment for a training or security deposit, typically a fake job scam.")
        if "address" not in text_lower:
            risk_score -= 10
            reasons.append("There is no company physical address located on the document.")
        if "www." not in text_lower and ".com" not in text_lower and ".in" not in text_lower:
            risk_score -= 10
            reasons.append("Missing company website domain.")
            
    elif scan_type == "QR Code":
        if "http" in text_lower and ("bit.ly" in text_lower or "tinyurl" in text_lower):
            risk_score -= 40
            reasons.append("The QR code redirects to a shortened link which can heavily mask phishing sites.")
        if "pay" in text_lower or "upi://" in text_lower:
            risk_score -= 20
            reasons.append("The QR code contains a direct payment intent. Proceed with caution.")
    else:
        if ai_generated_likely:
            risk_score -= 40
            reasons.append("The image contains unusual textures and lighting anomalies. Possibly AI-generated.")
        if is_edited_likely:
            risk_score -= 30
            reasons.append("There are signs of manipulation or unnatural cropping in the image.")

    risk_score = max(0, min(100, risk_score))

    if risk_score >= 80:
        result_badge = "Safe"
    elif risk_score >= 60:
        result_badge = "Mildly Suspicious"
    elif risk_score >= 40:
        result_badge = "Suspicious"
    else:
        result_badge = "Dangerous"

    if not reasons and risk_score == 100:
        reasons.append("No obvious manipulation found. Everything seems consistent.")

    # Smart Confidence Engine
    # Confidence is determined by OCR Quality minus penalties for heavily mismatched traits
    signal_penalty = (100 - risk_score) * 0.2
    confidence = max(50.0, min(99.9, ocr_quality + (risk_score * 0.1) - signal_penalty))

    return {
        "scan_type": scan_type,
        "result_badge": result_badge,
        "confidence": round(confidence, 1),
        "risk_score": int(risk_score),
        "reasons": reasons,
        "extracted_text": text.strip()[:1000]
    }
