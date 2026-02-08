import os
from pathlib import Path

class ModelLoader:
    _instances = {}
    
    def __init__(self, models_dir):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self._loaded_models = {}
    
    @classmethod
    def get_instance(cls, models_dir):
        if models_dir not in cls._instances:
            cls._instances[models_dir] = cls(models_dir)
        return cls._instances[models_dir]
    
    def load_faster_whisper(self, model_size="medium", device="cpu"):
        cache_key = f"faster_whisper_{model_size}_{device}"
        
        if cache_key in self._loaded_models:
            return self._loaded_models[cache_key]
        
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel(
                model_size, 
                device=device,
                compute_type="int8",
                download_root=str(self.models_dir)
            )
            self._loaded_models[cache_key] = model
            return model
        except ImportError:
            raise ImportError("faster-whisper not installed. Install with: pip install faster-whisper")
    
    def load_parakeet_mlx(self):
        cache_key = "parakeet_mlx"
        
        if cache_key in self._loaded_models:
            return self._loaded_models[cache_key]
        
        try:
            import parakeet_mlx
            self._loaded_models[cache_key] = parakeet_mlx
            return parakeet_mlx
        except ImportError:
            raise ImportError("parakeet-mlx not installed. Install with: pip install parakeet-mlx")
    
    def load_qwen_vl(self, model_name="Qwen/Qwen2-VL-7B-Instruct", device="cpu"):
        cache_key = f"qwen_vl_{model_name}_{device}"
        
        if cache_key in self._loaded_models:
            return self._loaded_models[cache_key]
        
        try:
            from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
            import torch
            
            model = Qwen2VLForConditionalGeneration.from_pretrained(
                model_name,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                device_map="auto" if device == "cuda" else None,
                cache_dir=str(self.models_dir)
            )
            
            processor = AutoProcessor.from_pretrained(
                model_name,
                cache_dir=str(self.models_dir)
            )
            
            self._loaded_models[cache_key] = (model, processor)
            return model, processor
        except ImportError:
            raise ImportError("transformers not installed. Install with: pip install transformers torch")
    
    def clear_cache(self):
        self._loaded_models.clear()

