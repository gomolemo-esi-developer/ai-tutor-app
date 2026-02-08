from tqdm import tqdm
import os

class ProgressTracker:
    def __init__(self, description="Processing", unit="item"):
        self.description = description
        self.unit = unit
        
    def create_bar(self, total, unit=None, **kwargs):
        unit_to_use = unit if unit is not None else self.unit
        return tqdm(
            total=total,
            desc=self.description,
            unit=unit_to_use,
            bar_format='{l_bar}{bar}| {n_fmt}/{total_fmt} [{elapsed}<{remaining}]',
            **kwargs
        )
    
    def create_file_bar(self, filepath):
        try:
            file_size = os.path.getsize(filepath)
            size_mb = file_size / (1024 * 1024)
            return self.create_bar(
                total=100,
                desc=f"{self.description} ({size_mb:.1f}MB)",
                unit="%"
            )
        except:
            return self.create_bar(total=100, unit="%")

