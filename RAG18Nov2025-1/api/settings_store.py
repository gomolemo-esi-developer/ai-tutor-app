"""
Settings Store - Persistent storage for RAG configuration
Manages saving/loading settings to/from .env file
"""

from pathlib import Path
from typing import Dict, Any, Optional
import os


class SettingsStore:
    """Manage persistent settings storage in .env file"""

    def __init__(self, env_file_path: str = ".env"):
        self.env_file = Path(env_file_path)
        if not self.env_file.exists():
            self.env_file.touch()
            print(f"[SettingsStore] Created new .env file at {self.env_file}")

    def save_setting(self, key: str, value: Any) -> bool:
        """
        Save a single setting to .env file
        Creates or updates the key=value pair
        """
        try:
            from dotenv import set_key

            # Convert value to string
            str_value = str(value)

            # Update or create the key
            set_key(str(self.env_file), key.upper(), str_value)
            print(f"[SettingsStore] Saved {key.upper()} = {str_value}")
            return True
        except Exception as e:
            print(f"[SettingsStore] Error saving {key}: {e}")
            return False

    def save_settings(self, settings: Dict[str, Any]) -> bool:
        """Save multiple settings at once"""
        try:
            from dotenv import set_key

            for key, value in settings.items():
                str_value = str(value)
                set_key(str(self.env_file), key.upper(), str_value)
                print(f"[SettingsStore] Saved {key.upper()} = {str_value}")
            return True
        except Exception as e:
            print(f"[SettingsStore] Error saving settings: {e}")
            return False

    def load_setting(self, key: str, default: Optional[Any] = None) -> Any:
        """Load a setting from environment (which includes .env)"""
        return os.getenv(key.upper(), default)

    def load_all_settings(self) -> Dict[str, str]:
        """Load all settings from .env file"""
        try:
            from dotenv import dotenv_values

            settings = dotenv_values(str(self.env_file))
            return settings
        except Exception as e:
            print(f"[SettingsStore] Error loading settings: {e}")
            return {}


# Global instance
_store_instance: Optional[SettingsStore] = None


def get_settings_store(env_file: str = ".env") -> SettingsStore:
    """Get or create the global settings store instance"""
    global _store_instance
    if _store_instance is None:
        _store_instance = SettingsStore(env_file)
    return _store_instance
