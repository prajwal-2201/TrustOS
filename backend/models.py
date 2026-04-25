from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), index=True)
    scan_type = Column(String(50)) # e.g. "Payment Screenshot", "Offer Letter"
    result_badge = Column(String(50)) # "Safe", "Suspicious", "Fake Likely"
    confidence = Column(Float)
    risk_score = Column(Integer)
    reasons = Column(String(1000)) # JSON string or comma-separated
    extracted_text = Column(String(2000)) # Truncated text
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
