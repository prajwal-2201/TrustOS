import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os

def train():
    if not os.path.exists("sample_dataset.csv"):
        print("Dataset not found. Run generate_dataset.py first.")
        return

    print("Loading dataset...")
    df = pd.read_csv("sample_dataset.csv")

    X = df['text']
    y = df['label'] # binary: 'scam', 'safe'
    
    # Split the dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Build Pipeline
    print("Building model pipeline...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ('clf', LogisticRegression(C=1.0, random_state=42, class_weight='balanced'))
    ])

    # Train
    print("Training model...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    print("Evaluating model...")
    y_pred_train = pipeline.predict(X_train)
    y_pred_test = pipeline.predict(X_test)
    
    train_acc = accuracy_score(y_train, y_pred_train)
    test_acc = accuracy_score(y_test, y_pred_test)

    print(f"\n--- Model Metrics ---")
    print(f"Training Accuracy: {train_acc*100:.2f}%")
    print(f"Testing Accuracy: {test_acc*100:.2f}%")
    print("\nClassification Report (Test Data):")
    print(classification_report(y_test, y_pred_test))

    # Save
    with open("text_model.pkl", "wb") as f:
        pickle.dump(pipeline, f)
    print("Model saved to text_model.pkl")

if __name__ == "__main__":
    train()
