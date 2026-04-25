from fastapi import FastAPI, File, UploadFile, Depends, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import database
import models
from analyzer import analyze_image
import json
import os

app = FastAPI(title="Trust OS")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create DB tables on startup
models.Base.metadata.create_all(bind=database.engine)


# ─── UPLOAD & ANALYZE ─────────────────────────────────────────────────────────

@app.post("/upload")
async def analyze_upload(
    file: UploadFile = File(...),
    category: str = Form(None),
    db: Session = Depends(database.get_db)
):
    content = await file.read()
    result = analyze_image(content, manual_category=category)

    record = models.ScanHistory(
        filename=file.filename,
        scan_type=result["scan_type"],
        result_badge=result["result_badge"],
        confidence=result["confidence"],
        risk_score=result["risk_score"],
        reasons=json.dumps(result["reasons"]),
        extracted_text=result["extracted_text"]
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "scan_type": record.scan_type,
        "result_badge": record.result_badge,
        "confidence": record.confidence,
        "risk_score": record.risk_score,
        "reasons": json.loads(record.reasons),
        "extracted_text": record.extracted_text,
        "timestamp": record.timestamp,
        "suggested_action": (
            "Do NOT share personal info or proceed. This is high-risk."
            if record.risk_score < 50 else "Seems safe, but always verify manually."
        )
    }


# ─── DEMO SCENARIOS ───────────────────────────────────────────────────────────

DEMO_DATA = {
    "Payment Screenshot": {
        "scan_type": "UPI Payment Screenshot",
        "result_badge": "Dangerous",
        "confidence": 94,
        "risk_score": 12,
        "reasons": [
            "The payment proof lacks a valid Transaction ID or UTR number — a major red flag.",
            "UPI ID pattern detected: suspicious '@ybl' suffix not matching any known bank.",
            "Font inconsistency detected in the 'Paid' status text (pixel variance: 23%).",
            "Screenshot metadata shows the image was modified after the original capture.",
        ],
        "extracted_text": "Paid ₹50,000 to priyanka@ybl\nTransaction ID: TXN8823991\nStatus: Successful",
        "suggested_action": "Do NOT trust this payment screenshot. It shows clear signs of digital editing.",
    },
    "WhatsApp Message": {
        "scan_type": "WhatsApp Message Screenshot",
        "result_badge": "Suspicious",
        "confidence": 81,
        "risk_score": 35,
        "reasons": [
            "Message uses urgency tactics: 'act now', 'limited time offer'.",
            "External shortened link detected pointing to a non-WhatsApp domain.",
            "Sender profile picture shows GAN-artifact score of 0.78 — likely AI-generated face.",
        ],
        "extracted_text": "Congratulations! You have won ₹2 Lakhs. Act now! Claim: bit.ly/win-prize",
        "suggested_action": "Do NOT click any links. This is a classic phishing scam.",
    },
    "Offer Letter": {
        "scan_type": "Job Offer Letter",
        "result_badge": "Mildly Suspicious",
        "confidence": 72,
        "risk_score": 48,
        "reasons": [
            "Company letterhead font does not match official branding.",
            "Salary (₹12 LPA) is inconsistent with the advertised entry-level role.",
            "No official HR email ID, company address, or stamp found in the document.",
        ],
        "extracted_text": "Dear Candidate, You are selected for Software Engineer. CTC: 12 LPA. Join by Monday.",
        "suggested_action": "Verify directly with the company's official HR department before accepting.",
    },
    "QR Code": {
        "scan_type": "QR Code Scan",
        "result_badge": "Dangerous",
        "confidence": 97,
        "risk_score": 6,
        "reasons": [
            "QR code resolves to a confirmed phishing URL in our threat database.",
            "Domain uses homograph attack: 'sbí-bank.com' mimicking 'sbi-bank.com'.",
            "Domain was registered only 3 days ago — extremely high fraud probability.",
        ],
        "extracted_text": "URL: https://sbí-bank.com/login?ref=qr_scam",
        "suggested_action": "Do NOT scan this QR code. It is a confirmed phishing attempt.",
    },
    "Edited Payment": {
        "scan_type": "Manipulated Payment Screenshot",
        "result_badge": "Dangerous",
        "confidence": 99,
        "risk_score": 4,
        "reasons": [
            "JPEG artifact analysis reveals image manipulation in the amount field.",
            "Error Level Analysis (ELA) shows high compression inconsistency around '₹' symbol.",
            "Original amount appears to have been ₹100 — digitally altered to show ₹10,000.",
            "File metadata mismatch: modification time does not align with displayed timestamp.",
        ],
        "extracted_text": "Amount: ₹10,000\nTo: seller_account@upi\nStatus: Paid",
        "suggested_action": "This payment screenshot has been digitally forged. Do NOT accept it as proof.",
    },
    "AI Face": {
        "scan_type": "AI-Generated Image",
        "result_badge": "Suspicious",
        "confidence": 88,
        "risk_score": 28,
        "reasons": [
            "Face displays GAN-typical artifacts: asymmetric earrings, warped background edges.",
            "Skin texture lacks natural pore patterns — AI image smoothing detected.",
            "Eye reflections show an impossible light source inconsistency.",
        ],
        "extracted_text": "",
        "suggested_action": "This image is likely AI-generated. Do NOT use for ID verification or trust purposes.",
    },
}


@app.get("/demo")
def run_demo(
    type: str = Query(..., description="Demo scenario type"),
    db: Session = Depends(database.get_db)
):
    scenario = DEMO_DATA.get(type, DEMO_DATA["Payment Screenshot"])
    record = models.ScanHistory(
        filename="demo_image",
        scan_type=scenario["scan_type"],
        result_badge=scenario["result_badge"],
        confidence=scenario["confidence"],
        risk_score=scenario["risk_score"],
        reasons=json.dumps(scenario["reasons"]),
        extracted_text=scenario["extracted_text"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "scan_type": record.scan_type,
        "result_badge": record.result_badge,
        "confidence": record.confidence,
        "risk_score": record.risk_score,
        "reasons": scenario["reasons"],
        "extracted_text": record.extracted_text,
        "timestamp": record.timestamp,
        "suggested_action": scenario["suggested_action"],
    }


# ─── HISTORY ──────────────────────────────────────────────────────────────────

@app.get("/history")
def get_history(db: Session = Depends(database.get_db)):
    records = db.query(models.ScanHistory).order_by(
        models.ScanHistory.timestamp.desc()
    ).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "scan_type": r.scan_type,
            "result_badge": r.result_badge,
            "confidence": r.confidence,
            "risk_score": r.risk_score,
            "reasons": json.loads(r.reasons) if r.reasons else [],
            "extracted_text": r.extracted_text,
            "timestamp": r.timestamp,
            "suggested_action": (
                "Do NOT share personal info or proceed. This is high-risk."
                if r.risk_score < 50 else "Seems safe, but always verify manually."
            ),
        }
        for r in records
    ]


@app.delete("/history/{item_id}")
def delete_history_item(item_id: int, db: Session = Depends(database.get_db)):
    record = db.query(models.ScanHistory).filter(
        models.ScanHistory.id == item_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"success": True, "message": "Record deleted"}


# ─── SERVE WEB FRONTEND  (must be LAST) ───────────────────────────────────────

web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "web")
if os.path.isdir(web_dir):
    app.mount("/", StaticFiles(directory=web_dir, html=True), name="web")
