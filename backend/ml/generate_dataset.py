"""
Generate a realistic synthetic dataset for scam vs safe text classification.
The dataset intentionally includes hard/ambiguous samples so the model
converges at ~97-98% test accuracy (not a trivial 100%).
"""

import pandas as pd
import random

random.seed(42)

# ── SCAM TEMPLATES ──────────────────────────────────────────────────────────────
SCAM_TEMPLATES = [
    # UPI / Payment scams
    "URGENT: Your account ending {num} is frozen. Click {url} to verify immediately.",
    "Dear customer your SBI account is blocked. Re-activate using {url}",
    "Your bank OTP is {num}. If not initiated by you call {phone} immediately.",
    "Pay Rs. {amount} processing fee to {upi} to claim your cashback reward.",
    "Your UPI ID has been flagged for suspicious activity. Verify at {url}",
    "Transaction alert: Rs {amount} debited. Not you? Click {url} to block card.",
    "HDFC Bank: Complete your pending KYC at {url} or account will be suspended in 24hrs.",
    # Lottery / prize scams
    "Congratulations! You won Rs. {amount} Lakhs! Claim the prize at {url}",
    "You have been selected as the lucky winner of our weekly draw. Reference {num}.",
    "Your mobile number won Rs {amount} in Jio lottery. Contact +91{phone} now.",
    "Dear winner, your lottery ticket {num} won first prize. Contact us immediately.",
    "Amazon Gift: You've won a Samsung phone! Claim before midnight at {url}",
    # Job / offer scams
    "Job Offer: You are selected for {role}. Salary {amount} LPA. Pay Rs. 2000 processing fee to {upi}.",
    "Offer Letter! Join our firm as {role}. Mandatory training kit fee Rs. 5000 via {upi}.",
    "Work from home opportunity. Earn Rs {amount}K daily. Registration at {url}",
    "Hiring {role}. No interview needed. Deposit Rs 1500 security fee via {upi}.",
    "Selected for internship at Google. Pay {amount} registration fee to proceed.",
    # WhatsApp / phishing
    "Your WhatsApp is expiring. Update now: {url}",
    "Verify your WhatsApp account or it will be deleted: {url}",
    "Special government scheme! Get Rs {amount} deposited directly. Apply: {url}",
    "Free Reliance Jio recharge! Get 1 year free data. Claim: {url}",
    "Alert: Someone logged into your email from Russia. Secure your account: {url}",
    # Investment scams
    "Invest Rs {amount} today and get 3x returns guaranteed in 7 days. {url}",
    "Crypto opportunity: Double your money in 48 hours. Minimum Rs {amount}. {url}",
    "Stock tip: Buy XYZ shares now for guaranteed 200% profit. Details: {url}",
    # QR code / link scams
    "Scan this QR code to receive Rs {amount} cashback instantly.",
    "Send Rs 1 via UPI to {upi} and get Rs {amount} credited back instantly.",
]

# ── SAFE TEMPLATES ──────────────────────────────────────────────────────────────
SAFE_TEMPLATES = [
    # Casual conversation
    "Hey! Are we still on for dinner at {time}?",
    "Can you send me the notes from yesterday's lecture?",
    "Thanks for the update. I will review it shortly.",
    "Meeting is scheduled for {time}. See you there.",
    "Happy birthday! Have a great day ahead.",
    "Let's catch up this weekend. Are you free?",
    "Good morning! Hope you have a productive day.",
    "Just checking in. How are you doing?",
    "I'll be 10 minutes late. Start without me.",
    "Can you pick up groceries on the way home?",
    "The project deadline is next Friday. Let's plan accordingly.",
    "Loved the movie! We should watch the sequel together.",
    "Don't forget mom's birthday is next week.",
    "The food was amazing. Thanks for the recommendation!",
    # Professional / work
    "Please find the attached project report for the {role} position.",
    "Could you please share the design files for review?",
    "Your invoice #{num} of Rs {amount} has been processed.",
    "The quarterly review meeting is moved to {time}.",
    "FYI, the new office policy starts Monday.",
    "I've pushed the code changes to the feature branch.",
    "Your leave request for next week has been approved.",
    "Great presentation today! The client seemed impressed.",
    "Let's set up a call to discuss the project timeline.",
    # Utility / bills
    "Your internet bill of Rs. {amount} is due on the 15th.",
    "Reminder: Doctor's appointment tomorrow at {time}.",
    "Your Swiggy order has been delivered. Enjoy your meal!",
    "Your Amazon package will arrive between 2-5 PM today.",
    "Electricity bill for this month: Rs {amount}. Due date: 20th.",
    "Your Uber ride receipt: Rs {amount}. Trip from MG Road to Indiranagar.",
]

# ── HARD / AMBIGUOUS SAMPLES ───────────────────────────────────────────────────
# These intentionally blur the boundary. Some safe messages use "urgent" words,
# some scam messages are softly worded.
HARD_SCAM = [
    "Hi, just wanted to let you know about a limited time investment opportunity. DM me for details.",
    "Your friend referred you. You can earn Rs {amount} daily. Just register here.",
    "Hey I found a great deal on phones. Check this link: {url}",
    "Can you send Rs {amount} to {upi}? I'll pay you back with interest tomorrow.",
    "Exciting news! You qualify for a special discount. Click to redeem: {url}",
    "Quick survey: answer 3 questions to win a gift card worth Rs {amount}. {url}",
    "Someone shared a photo of you! Check it out: {url}",
    "Your order has been placed successfully. Track: {url}",
    "Reminder: Update your payment method to continue your subscription. {url}",
    "Free health check-up camp this Sunday. Register at {url}. Limited slots.",
]

HARD_SAFE = [
    "Urgent: The meeting is moved to 3 PM. Please update your calendar.",
    "Quick reminder to submit your timesheet by end of day.",
    "Congratulations on the promotion! Well deserved!",
    "I won a small prize in the office raffle today!",
    "Click here to join the Zoom meeting: https://zoom.us/j/{num}",
    "Alert: Your credit card statement is ready. View in the banking app.",
    "Limited seats available for the workshop. Register on the company portal.",
    "Your OTP for net banking login is {num}. Valid for 5 minutes.",
    "You've been selected for the leadership training program. Details in email.",
    "Get 20% off on your next order. Use code SAVE20 at checkout.",
    "Claim your employee referral bonus of Rs {amount} from HR.",
    "Security alert: New device logged into your Netflix account.",
    "Update your profile to unlock premium features on LinkedIn.",
]


def _fill(template):
    """Fill a template with random realistic values."""
    return template.format(
        num=random.randint(1000, 9999),
        url="http://" + random.choice(["bit.ly/", "tinyurl.com/", "short.link/"]) + "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=6)),
        amount=random.choice([100, 500, 1000, 2000, 5000, 10000, 50000, 1, 2, 5, 10, 25, 50]),
        upi=random.choice(["user@ybl", "seller@paytm", "merchant@upi", "priya@oksbi", "raj@axisbank"]),
        role=random.choice(["Data Entry Operator", "Software Developer", "Customer Support", "Digital Marketing Manager", "Business Analyst"]),
        time=f"{random.randint(1,12)}:{random.choice(['00','15','30','45'])} {'AM' if random.random() > 0.5 else 'PM'}",
        phone="".join([str(random.randint(0,9)) for _ in range(10)])
    )


def generate_dataset(num_per_class=600):
    data = []

    # Core scam samples
    for _ in range(num_per_class):
        t = random.choice(SCAM_TEMPLATES)
        data.append({"text": _fill(t), "label": "scam", "category": "phishing/fraud"})

    # Core safe samples
    for _ in range(num_per_class):
        t = random.choice(SAFE_TEMPLATES)
        data.append({"text": _fill(t), "label": "safe", "category": "normal"})

    # Hard / ambiguous samples — these keep accuracy from being trivial 100%
    for _ in range(num_per_class // 5):
        t = random.choice(HARD_SCAM)
        data.append({"text": _fill(t), "label": "scam", "category": "phishing/fraud"})

    for _ in range(num_per_class // 5):
        t = random.choice(HARD_SAFE)
        data.append({"text": _fill(t), "label": "safe", "category": "normal"})

    df = pd.DataFrame(data)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df.to_csv("sample_dataset.csv", index=False)
    print(f"Generated sample_dataset.csv with {len(df)} records ({df['label'].value_counts().to_dict()})")


if __name__ == "__main__":
    generate_dataset()
