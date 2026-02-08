import sys
import os
from pathlib import Path
from PIL import Image

sys.path.append(str(Path(__file__).parent.parent))

from utils.progress_tracker import ProgressTracker
from utils.file_handler import FileHandler
from utils.model_loader import ModelLoader

class PDFConverter:
    def __init__(self, output_dir, models_dir, model_name="Qwen/Qwen2-VL-7B-Instruct"):
        self.file_handler = FileHandler(output_dir)
        self.model_loader = ModelLoader.get_instance(models_dir)
        self.model_name = model_name
        self.model = None
        self.processor = None
        
    def pdf_to_images(self, pdf_path, max_pages=None):
        try:
            from pdf2image import convert_from_path
            
            if max_pages:
                print(f"📄 Converting first {max_pages} pages to images...")
                images = convert_from_path(str(pdf_path), last_page=max_pages)
            else:
                print("📄 Converting ALL PDF pages to images...")
                images = convert_from_path(str(pdf_path))
            
            print(f"✅ Converted {len(images)} pages to images\n")
            return images
            
        except ImportError:
            raise ImportError("pdf2image not installed. Install with: pip install pdf2image")
        except Exception as e:
            raise RuntimeError(f"PDF to image conversion failed: {str(e)}")
    
    def extract_text_from_image(self, image):
        try:
            import torch
            from qwen_vl_utils import process_vision_info
            
            if self.model is None or self.processor is None:
                print("Loading Qwen VL model (this may take a while on first run)...")
                self.model, self.processor = self.model_loader.load_qwen_vl(
                    model_name=self.model_name
                )
                print("Model loaded successfully\n")
            
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
                            "text": "Extract all text from this image. Provide the text exactly as it appears, maintaining the original formatting and structure."
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
    
    def convert(self, pdf_path, max_pages=None):
        pdf_path = self.file_handler.validate_input_file(
            pdf_path, 
            allowed_extensions=['.pdf']
        )
        
        print(f"\n{'='*60}")
        print(f"📕 PDF OCR CONVERSION")
        print(f"{'='*60}")
        print(f"File: {pdf_path.name}")
        print(f"Size: {self.file_handler.get_file_size_mb(pdf_path):.2f} MB")
        if max_pages:
            print(f"Page limit: First {max_pages} pages only")
        else:
            print(f"Mode: Processing ALL pages")
        print(f"{'='*60}\n")
        
        images = self.pdf_to_images(pdf_path, max_pages)
        
        progress = ProgressTracker("Processing pages", "page")
        pbar = progress.create_bar(len(images))
        
        extracted_text_parts = []
        
        for i, image in enumerate(images, 1):
            pbar.set_description(f"Processing page {i}/{len(images)}")
            
            try:
                page_text = self.extract_text_from_image(image)
                extracted_text_parts.append(f"--- Page {i} ---\n{page_text}\n")
            except Exception as e:
                print(f"\n⚠️  Error on page {i}: {str(e)}")
                extracted_text_parts.append(f"--- Page {i} ---\n[Error extracting text]\n")
            
            pbar.update(1)
        
        pbar.close()
        
        full_text = "\n".join(extracted_text_parts)
        
        output_path = self.file_handler.get_output_path(
            pdf_path,
            suffix="_extracted",
            extension=".txt"
        )
        
        self.file_handler.save_text(full_text, output_path)
        
        print(f"\n{'='*60}")
        print(f"✅ PDF OCR COMPLETE")
        print(f"{'='*60}")
        print(f"Output: {output_path}")
        print(f"{'='*60}\n")
        return str(output_path)

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert_pdf.py <pdf_file> [model_name] [max_pages]")
        print("  model_name: default 'Qwen/Qwen2-VL-7B-Instruct'")
        print("              or use 'Qwen/Qwen2-VL-2B-Instruct' for lighter model")
        print("  max_pages: optional, process only first N pages (e.g., 3, 10)")
        print("\nExamples:")
        print("  python convert_pdf.py doc.pdf 'Qwen/Qwen2-VL-2B-Instruct' 3  # First 3 pages")
        print("  python convert_pdf.py doc.pdf 'Qwen/Qwen2-VL-2B-Instruct'    # All pages")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "Qwen/Qwen2-VL-7B-Instruct"
    max_pages = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    script_dir = Path(__file__).parent.parent
    output_dir = script_dir / "output"
    models_dir = script_dir / "models"
    
    converter = PDFConverter(
        output_dir=output_dir,
        models_dir=models_dir,
        model_name=model_name
    )
    
    try:
        converter.convert(pdf_file, max_pages=max_pages)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

