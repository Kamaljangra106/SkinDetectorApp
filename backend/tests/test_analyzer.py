"""
Unit tests for ml/analyzer.py.
No real API calls — mocks the Groq client.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from ml.analyzer import SkinAnalysis, analyze


def _mock_groq_response(payload: dict):
    """Build a fake Groq response object returning the given payload as JSON."""
    msg = MagicMock()
    msg.content = json.dumps(payload)
    choice = MagicMock()
    choice.message = msg
    response = MagicMock()
    response.choices = [choice]
    return response


SAMPLE_PAYLOAD = {
    "skin_type": "oily",
    "acne_severity": "moderate",
    "fitzpatrick_estimate": "IV",
    "primary_concerns": ["acne", "hyperpigmentation"],
    "confidence": 0.85,
}


@patch("ml.analyzer.Groq")
def test_analyze_returns_skin_analysis(mock_groq_cls):
    mock_groq_cls.return_value.chat.completions.create.return_value = (
        _mock_groq_response(SAMPLE_PAYLOAD)
    )
    result = analyze(b"fake-image-bytes")
    assert isinstance(result, SkinAnalysis)
    assert result.skin_type == "oily"
    assert result.acne_severity == "moderate"
    assert result.fitzpatrick_estimate == "IV"
    assert result.primary_concerns == ["acne", "hyperpigmentation"]
    assert result.confidence == 0.85


@patch("ml.analyzer.Groq")
def test_darker_tone_flag(mock_groq_cls):
    for fitz, expected in [("IV", True), ("V", True), ("VI", True), ("I", False), ("III", False)]:
        payload = {**SAMPLE_PAYLOAD, "fitzpatrick_estimate": fitz}
        mock_groq_cls.return_value.chat.completions.create.return_value = (
            _mock_groq_response(payload)
        )
        result = analyze(b"fake-image-bytes")
        assert result.is_darker_tone == expected, f"Failed for Fitzpatrick {fitz}"


@patch("ml.analyzer.Groq")
def test_strips_markdown_fences(mock_groq_cls):
    msg = MagicMock()
    msg.content = "```json\n" + json.dumps(SAMPLE_PAYLOAD) + "\n```"
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    mock_groq_cls.return_value.chat.completions.create.return_value = resp

    result = analyze(b"fake-image-bytes")
    assert result.skin_type == "oily"


@patch("ml.analyzer.Groq")
def test_invalid_json_raises_value_error(mock_groq_cls):
    msg = MagicMock()
    msg.content = "sorry I cannot analyze this image"
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    mock_groq_cls.return_value.chat.completions.create.return_value = resp

    with pytest.raises(ValueError, match="invalid JSON"):
        analyze(b"fake-image-bytes")
