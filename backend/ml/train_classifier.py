"""Trains and evaluates the intent + urgency classifiers on the synthetic dataset.

Two independent scikit-learn pipelines (TF-IDF + Logistic Regression) — one predicts
intent, one predicts urgency — saved together as a dict via joblib. Independent plain
sklearn objects (not a custom wrapper class) so the bundle stays easy to unpickle from
the FastAPI app regardless of how that code is organized.

Run: python ml/train_classifier.py
Requires ml/data/messages.csv (run generate_dataset.py first).
Writes: ml/model.joblib, ml/metrics.json
"""

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ML_DIR = Path(__file__).parent
DATA_PATH = ML_DIR / "data" / "messages.csv"
HARD_EVAL_PATH = ML_DIR / "data" / "hard_eval.csv"
MODEL_PATH = ML_DIR / "model.joblib"
METRICS_PATH = ML_DIR / "metrics.json"


def make_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )


def evaluate(pipeline: Pipeline, X_test, y_test) -> dict:
    y_pred = pipeline.predict(X_test)
    labels = sorted(pipeline.classes_)
    return {
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "labels": labels,
        "classification_report": classification_report(
            y_test, y_pred, labels=labels, output_dict=True, zero_division=0
        ),
        "confusion_matrix": confusion_matrix(y_test, y_pred, labels=labels).tolist(),
    }


def main():
    if not DATA_PATH.exists():
        raise SystemExit(f"{DATA_PATH} not found — run `python ml/generate_dataset.py` first.")

    df = pd.read_csv(DATA_PATH)
    df["stratify_key"] = df["intent"] + "_" + df["urgency"]

    train_df, test_df = train_test_split(
        df, test_size=0.2, random_state=42, stratify=df["stratify_key"]
    )

    intent_pipeline = make_pipeline()
    intent_pipeline.fit(train_df["text"], train_df["intent"])

    urgency_pipeline = make_pipeline()
    urgency_pipeline.fit(train_df["text"], train_df["urgency"])

    metrics = {
        "dataset_size": len(df),
        "train_size": len(train_df),
        "test_size": len(test_df),
        "intent": evaluate(intent_pipeline, test_df["text"], test_df["intent"]),
        "urgency": evaluate(urgency_pipeline, test_df["text"], test_df["urgency"]),
    }

    print(f"Trained on {len(train_df)} examples, evaluated on {len(test_df)} held-out examples.")
    print(f"Intent accuracy:  {metrics['intent']['accuracy']:.2%}")
    print(f"Urgency accuracy: {metrics['urgency']['accuracy']:.2%}")

    # The held-out split above is drawn from the same templates as training, so near-
    # perfect accuracy there mostly proves the templates are lexically distinctive, not
    # that the model generalizes. This second set is hand-written, separately, with
    # informal/Banglish phrasing and genuinely ambiguous cases the templates never
    # produce — a more honest read on real-world effectiveness.
    if HARD_EVAL_PATH.exists():
        hard_df = pd.read_csv(HARD_EVAL_PATH)
        metrics["hard_eval"] = {
            "description": "Hand-written informal/Banglish messages, held out from training entirely — a harder, more realistic generalization check than the templated test split above.",
            "size": len(hard_df),
            "intent": evaluate(intent_pipeline, hard_df["text"], hard_df["intent"]),
            "urgency": evaluate(urgency_pipeline, hard_df["text"], hard_df["urgency"]),
        }
        print(f"\nHard eval set ({len(hard_df)} hand-written examples):")
        print(f"Intent accuracy:  {metrics['hard_eval']['intent']['accuracy']:.2%}")
        print(f"Urgency accuracy: {metrics['hard_eval']['urgency']['accuracy']:.2%}")

    joblib.dump({"intent": intent_pipeline, "urgency": urgency_pipeline}, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2))
    print(f"\nModel   -> {MODEL_PATH}")
    print(f"Metrics -> {METRICS_PATH}")


if __name__ == "__main__":
    main()
