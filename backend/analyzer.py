import cv2
import pytesseract
import numpy as np
import re
import pickle
import os
from PIL import Image, ImageChops, ImageEnhance
import io

# Load ML Model if exists
MODEL_PATH = os.path.join(os.path.dirname(__file__), "ml", "text_model.pkl")
TEXT_MODEL = None
if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            TEXT_MODEL = pickle.load(f)
    except:
        pass

def calculate_ela(image_bytes: bytes, quality=90):
    """
    Error Level Analysis (ELA)
    Detects if parts of the image have different compression levels (signs of editing).
    Returns a score from 0-100 (higher = more likely edited).
    """
    try:
        original = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Save at a different quality and reopen
        tmp_buffer = io.BytesIO()
        original.save(tmp_buffer, format='JPEG', quality=quality)
        resaved = Image.open(io.BytesIO(tmp_buffer.getvalue()))
        
        # Calculate the absolute difference
        diff = ImageChops.difference(original, resaved)
        
        # Calculate the extreme values in the difference
        extrema = diff.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        if max_diff == 0: max_diff = 1
        
        # Scale the difference to make it visible (optional for visual, but good for scoring)
        scale = 255.0 / max_diff
        diff = ImageEnhance.Brightness(diff).enhance(scale)
        
        # Score based on mean pixel difference
        stat = np.array(diff).mean()
        # Heuristic: normally ELA mean is low. High mean suggests high modification variance.
        ela_score = min(100, stat * 2) 
        return round(ela_score, 2)
    except:
        return 0

def extract_qr_links(img):
    """Extract links from QR codes in the image."""
    try:
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(img)
        if data:
            return [data]
    except:
        pass
    return []

def analyze_text_only(text: str):
    """Standalone text analysis using ML model and heuristics."""
    if not text or len(text.strip()) < 5:
        return {"risk_score": 100, "label": "safe", "scam_probability": 0}
        
    text_lower = text.lower()
    ml_prob = 0
    if TEXT_MODEL:
        try:
            # Get probability for 'scam' class
            probs = TEXT_MODEL.predict_proba([text])[0]
            # Assuming labels are ['safe', 'scam'] or similar. 
            # In generate_dataset.py, 'scam' is one class.
            classes = TEXT_MODEL.classes_
            scam_idx = np.where(classes == 'scam')[0][0]
            ml_prob = probs[scam_idx] * 100
        except:
            ml_prob = 0
            
    # Combine with heuristics
    risk_score = 100 - (ml_prob * 0.8) # Weight ML heavily
    
    # Manual red flags
    if "otp" in text_lower or "bank blocked" in text_lower: risk_score -= 30
    if "bit.ly" in text_lower or "tinyurl" in text_lower: risk_score -= 20
    
    risk_score = max(0, min(100, risk_score))
    return {
        "risk_score": int(risk_score),
        "scam_probability": round(ml_prob, 1),
        "label": "scam" if ml_prob > 50 else "safe"
    }

def analyze_image(image_bytes: bytes, manual_category: str = None):
    np_img = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image")
        
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    
    text = pytesseract.image_to_string(thresh)
    text_lower = text.lower()
    
    # 1. Forensic Checks
    ela_score = calculate_ela(image_bytes)
    qr_links = extract_qr_links(img)
    
    # 2. OCR Quality & Basic Anomalies
    ocr_quality = min(100, max(20, (np.std(gray) / 128) * 100))
    edges = cv2.Canny(gray, 100, 200)
    edge_density = np.sum(edges) / (edges.shape[0] * edges.shape[1])
    
    is_edited_likely = ela_score > 15 or edge_density < 0.1
    ai_generated_likely = edge_density > 2.5
    
    # 3. ML Text Prediction
    text_analysis = analyze_text_only(text)
    ml_scam_prob = text_analysis["scam_probability"]
    
    risk_score = 100
    reasons = []
    
    scan_type = manual_category if manual_category else "General Image"
    if not manual_category:
        if any(w in text_lower for w in ["upi", "transaction", "paid to", "rupees", "bank"]):
            scan_type = "Payment Screenshot"
        elif any(w in text_lower for w in ["offer letter", "salary", "employment", "hr"]):
            scan_type = "Offer Letter"
        elif any(w in text_lower for w in ["whatsapp", "online", "pm"]):
            scan_type = "WhatsApp Message"
        elif qr_links:
            scan_type = "QR Code Scan"
            
    # --- Category Logic ---
    if scan_type == "Payment Screenshot":
        if "transaction id" not in text_lower and "utr" not in text_lower:
            risk_score -= 20
            reasons.append("Missing Transaction ID/UTR - standard for genuine proofs.")
        if is_edited_likely:
            risk_score -= 35
            reasons.append(f"Forensic Alert: ELA shows inconsistent compression (Score: {ela_score}). Likely digitally altered.")
        if ml_scam_prob > 60:
            risk_score -= 25
            reasons.append("AI Model detected scam patterns in the payment text.")
            
    elif scan_type == "WhatsApp Message":
        if ml_scam_prob > 50:
            risk_score -= 40
            reasons.append(f"Message analysis predicts a {ml_scam_prob}% scam probability.")
        if "bit.ly" in text_lower or "tinyurl" in text_lower or "http" in text_lower:
            risk_score -= 20
            reasons.append("Contains unverified external links.")
            
    elif scan_type == "Offer Letter":
        if any(w in text_lower for w in ["gmail.com", "yahoo.com", "hotmail.com"]):
            risk_score -= 40
            reasons.append("Uses a public email domain instead of an official company one.")
        if "payment" in text_lower or "training fee" in text_lower:
            risk_score -= 50
            reasons.append("Requests monetary payment for job processing - highly indicative of fraud.")

    # QR Specific
    if qr_links:
        reasons.append(f"Decoded QR Link: {qr_links[0]}")
        if any(w in qr_links[0] for w in ["bit.ly", "tinyurl", "scam", "prize"]):
            risk_score -= 40
            reasons.append("The QR code points to a suspicious or shortened URL.")

    # General Fallbacks
    if ai_generated_likely:
        risk_score -= 40
        reasons.append("Image texture anomalies detected. Likely AI-generated.")

    risk_score = max(0, min(100, risk_score))
    
    # Verdict Badge
    if risk_score >= 80: result_badge = "Safe"
    elif risk_score >= 60: result_badge = "Mildly Suspicious"
    elif risk_score >= 40: result_badge = "Suspicious"
    else: result_badge = "Dangerous"

    if not reasons and risk_score == 100:
        reasons.append("No anomalies detected. Image appears consistent.")

    # Final Confidence calculation
    confidence = max(50.0, min(99.9, ocr_quality - (100-risk_score)*0.1))

    return {
        "scan_type": scan_type,
        "result_badge": result_badge,
        "confidence": round(confidence, 1),
        "risk_score": int(risk_score),
        "reasons": reasons,
        "extracted_text": text.strip()[:1000],
        "meta_data": {
            "ela_score": ela_score,
            "ml_scam_prob": ml_scam_prob,
            "qr_links": qr_links,
            "edge_density": round(float(edge_density), 4)
        }
    }
