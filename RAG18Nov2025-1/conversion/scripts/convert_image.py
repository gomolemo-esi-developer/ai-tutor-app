import sys
from pathlib import Path
from PIL import Image

sys.path.append(str(Path(__file__).parent.parent))

from utils.progress_tracker import ProgressTracker
from utils.file_handler import FileHandler
from utils.model_loader import ModelLoader

class ImageConverter:
    def __init__(self, output_dir, models_dir, model_name="Qwen/Qwen2-VL-7B-Instruct"):
        self.file_handler = FileHandler(output_dir)
        self.model_loader = ModelLoader.get_instance(models_dir)
        self.model_name = model_name
        self.model = None
        self.processor = None
        
    def extract_text_from_image(self, image_path):
        try:
            import torch
            from qwen_vl_utils import process_vision_info
            
            if self.model is None or self.processor is None:
                print("Loading Qwen VL model (this may take a while on first run)...")
                self.model, self.processor = self.model_loader.load_qwen_vl(
                    model_name=self.model_name
                )
                print("Model loaded successfully\n")
            
            image = Image.open(str(image_path))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "image": image,
                        },
                        {
                            "type": "text", 
                            "text": "Extract all text from this image. Provide the text exactly as it appears, maintaining the original formatting and structure. If this is an infographic, diagram, or contains structured information, preserve that structure in your output."
                        },
                    ],
                }
            ]
            
            text = self.processor.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            
            image_inputs, video_inputs = process_vision_info(messages)
            
            inputs = self.processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt",
            )
            
            inputs = inputs.to(self.model.device)
            
            generated_ids = self.model.generate(**inputs, max_new_tokens=2048)
            generated_ids_trimmed = [
                out_ids[len(in_ids):] 
                for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]
            
            output_text = self.processor.batch_decode(
                generated_ids_trimmed, 
                skip_special_tokens=True, 
                clean_up_tokenization_spaces=False
            )
            
            return output_text[0] if output_text else ""
            
        except Exception as e:
            raise RuntimeError(f"OCR extraction failed: {str(e)}")
    
    def convert(self, image_path):
        image_extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', 
            '.tiff', '.tif', '.webp', '.svg'
        ]
        
        image_path = self.file_handler.validate_input_file(
            image_path, 
            allowed_extensions=image_extensions
        )
        
        print(f"\nExtracting text from image: {image_path.name}")
        print(f"Size: {self.file_handler.get_file_size_mb(image_path):.2f} MB\n")
        
        progress = ProgressTracker("Processing image", "step")
        pbar = progress.create_bar(100, unit="%")
        
        pbar.set_description("Loading image")
        pbar.update(20)
        
        pbar.set_description("Running OCR")
        extracted_text = self.extract_text_from_image(image_path)
        pbar.update(70)
        
        pbar.set_description("Saving results")
        output_path = self.file_handler.get_output_path(
            image_path,
            suffix="_ocr",
            extension=".txt"
        )
        
        self.file_handler.save_text(extracted_text, output_path)
        
        pbar.update(10)
        pbar.close()
        
        print(f"\n✅ Extracted text saved to: {output_path}")
        return str(output_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_image.py <image_file> [model_name]")
        print("  model_name: default 'Qwen/Qwen2-VL-7B-Instruct'")
        print("              or use 'Qwen/Qwen2-VL-2B-Instruct' for lighter model")
        sys.exit(1)
    
    image_file = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "Qwen/Qwen2-VL-7B-Instruct"
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    converter = ImageConverter(
        output_dir=output_dir,
        models_dir=models_dir,
        model_name=model_name
    )
    
    try:
        converter.convert(image_file)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

