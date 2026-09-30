"""
Image Storage System for Nigerian Directory
==========================================
Handles image downloading, optimization, and storage with CDN integration support.
"""

import os
import hashlib
import requests
from pathlib import Path
from PIL import Image, ImageOps
from typing import Optional, Dict, Any, Tuple
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

class ImageStorage:
    """
    Image storage system with optimization and CDN support
    """
    
    def __init__(self, base_path: str = "stored_images"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        self.logos_path = self.base_path / "logos"
        self.heroes_path = self.base_path / "heroes"
        self.logos_path.mkdir(exist_ok=True)
        self.heroes_path.mkdir(exist_ok=True)
        
        # Image optimization settings
        self.logo_sizes = [(100, 100), (200, 200), (400, 400)]  # Multiple sizes
        self.hero_sizes = [(800, 600), (1200, 900), (1600, 1200)]
        
        self.session = requests.Session()
    
    def generate_filename(self, url: str, school_slug: str, image_type: str) -> str:
        """Generate a consistent filename from URL and school info"""
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        return f"{school_slug}_{image_type}_{url_hash}"
    
    def download_and_store_image(self, url: str, school_slug: str, 
                                image_type: str) -> Optional[Dict[str, Any]]:
        """
        Download image, optimize it, and store in multiple sizes
        """
        try:
            # Download image
            response = self.session.get(url, timeout=15)
            if response.status_code != 200:
                return None
            
            # Open with PIL
            img = Image.open(BytesIO(response.content))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Choose storage path and sizes based on type
            if image_type == 'logo':
                storage_path = self.logos_path
                sizes = self.logo_sizes
            else:  # hero
                storage_path = self.heroes_path
                sizes = self.hero_sizes
            
            filename_base = self.generate_filename(url, school_slug, image_type)
            
            stored_files = []
            
            # Create multiple sizes
            for width, height in sizes:
                # Resize image maintaining aspect ratio
                resized = ImageOps.fit(img, (width, height), Image.LANCZOS)
                
                # Save as JPEG with good quality
                filename = f"{filename_base}_{width}x{height}.jpg"
                filepath = storage_path / filename
                
                resized.save(filepath, 'JPEG', quality=85, optimize=True)
                
                stored_files.append({
                    'size': f"{width}x{height}",
                    'path': str(filepath),
                    'url': f"/images/{image_type}s/{filename}"  # CDN-ready URL
                })
            
            return {
                'success': True,
                'original_url': url,
                'files': stored_files,
                'primary_url': stored_files[1]['url'] if len(stored_files) > 1 else stored_files[0]['url']
            }
            
        except Exception as e:
            logger.error(f"Error storing image {url}: {e}")
            return None
    
    def cleanup_old_images(self, school_slug: str):
        """Remove old images for a school when updating"""
        for path in [self.logos_path, self.heroes_path]:
            for file in path.glob(f"{school_slug}_*"):
                try:
                    file.unlink()
                except Exception as e:
                    logger.warning(f"Could not delete {file}: {e}")
    
    def get_image_info(self, school_slug: str, image_type: str) -> Optional[Dict[str, Any]]:
        """Get information about stored images for a school"""
        if image_type == 'logo':
            storage_path = self.logos_path
        else:
            storage_path = self.heroes_path
        
        files = list(storage_path.glob(f"{school_slug}_{image_type}_*"))
        
        if not files:
            return None
        
        # Group files by base name
        file_groups = {}
        for file in files:
            base_name = '_'.join(file.stem.split('_')[:-1])  # Remove size suffix
            if base_name not in file_groups:
                file_groups[base_name] = []
            file_groups[base_name].append(file)
        
        # Return info for the most recent group
        if file_groups:
            latest_group = max(file_groups.keys())
            return {
                'base_name': latest_group,
                'files': [str(f) for f in file_groups[latest_group]],
                'count': len(file_groups[latest_group])
            }
        
        return None


# Global storage instance
image_storage = ImageStorage()


if __name__ == "__main__":
    # Test image storage
    storage = ImageStorage()
    
    test_url = "https://agsoba.org/wp-content/uploads/2024/07/WhatsApp-Image-2024-07-07-at-06.27.53.jpeg"
    result = storage.download_and_store_image(test_url, "test-school", "hero")
    
    if result:
        print("✅ Image storage test successful")
        print(f"Stored {len(result['files'])} sizes")
        for file_info in result['files']:
            print(f"  {file_info['size']}: {file_info['path']}")
    else:
        print("❌ Image storage test failed")