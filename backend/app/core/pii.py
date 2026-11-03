import logging
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine

logger = logging.getLogger("requirements_ai")

_analyzer = None
_anonymizer = None


def _get_analyzer(): #create PII analyzer if not exist
    global _analyzer
    if _analyzer is None:
        try:
            provider = NlpEngineProvider(nlp_configuration={
                "nlp_engine_name": "spacy",
                "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
            })
            _analyzer = AnalyzerEngine(nlp_engine=provider.create_engine(), supported_languages=["en"])
        except Exception as e:
            logger.error("PII analyzer init failed — PII detection disabled: %s", e)
            return None
    return _analyzer


def _get_anonymizer(): #create PII anonymizer if not exist
    global _anonymizer
    if _anonymizer is None:
        try:
            _anonymizer = AnonymizerEngine() #create object
        except Exception as e:
            logger.error("PII anonymizer init failed — anonymization disabled: %s", e)
            return None
    return _anonymizer


def remove_pii(text: str) -> str:
    if not text:
        return text
    analyzer = _get_analyzer()
    anonymizer = _get_anonymizer()
    if analyzer is None or anonymizer is None:
        return text
    results = analyzer.analyze(text=text, language="en")
    anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
    return anonymized.text


def has_pii(text: str) -> bool:
    if not text:
        return False
    analyzer = _get_analyzer()
    if analyzer is None:
        return False
    results = analyzer.analyze(text=text, language="en")
    return len(results) > 0
