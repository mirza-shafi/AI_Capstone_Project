import logging
from pathlib import Path

import joblib

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "ml" / "model.joblib"

_bundle = None
_load_attempted = False


def _get_bundle():
    """Lazily loads the trained {"intent": pipeline, "urgency": pipeline} bundle.

    Returns None if the model hasn't been trained yet (run ml/train_classifier.py) —
    callers should degrade gracefully rather than fail, since a message can still be
    stored and shown without an intent/urgency tag.
    """
    global _bundle, _load_attempted
    if _bundle is None and not _load_attempted:
        _load_attempted = True
        if MODEL_PATH.exists():
            _bundle = joblib.load(MODEL_PATH)
        else:
            logger.warning(
                "Classifier model not found at %s — run `python ml/train_classifier.py` "
                "first. Messages will be stored without intent/urgency until then.",
                MODEL_PATH,
            )
    return _bundle


def classify_message(text: str) -> dict:
    bundle = _get_bundle()
    if bundle is None:
        return {
            "intent": None,
            "intent_confidence": None,
            "urgency": None,
            "urgency_confidence": None,
        }

    intent_pipeline = bundle["intent"]
    urgency_pipeline = bundle["urgency"]

    intent_proba = intent_pipeline.predict_proba([text])[0]
    urgency_proba = urgency_pipeline.predict_proba([text])[0]

    return {
        "intent": intent_pipeline.classes_[intent_proba.argmax()],
        "intent_confidence": round(float(intent_proba.max()), 4),
        "urgency": urgency_pipeline.classes_[urgency_proba.argmax()],
        "urgency_confidence": round(float(urgency_proba.max()), 4),
    }
