from openai import OpenAI
import config

_online_client = None
_offline_client = None

def get_openai_client() -> OpenAI:
    global _online_client, _offline_client
    
    if config.OFFLINE_MODE:
        if _offline_client is None:
            _offline_client = OpenAI(
                base_url=config.LM_STUDIO_BASE_URL,
                api_key="not-needed"
            )
        return _offline_client
    else:
        if _online_client is None:
            _online_client = OpenAI(api_key=config.OPENAI_API_KEY)
        return _online_client

def get_current_model() -> str:
    if config.OFFLINE_MODE:
        return config.LM_STUDIO_MODEL
    else:
        return config.LLM_MODEL

