"""
E-Shop Recommendation Quality Checker with Product Images
==========================================================
"""

import gradio as gr
import requests
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional
import json
import time
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import pathlib  # ✅ FIX: Thêm import này

BASE_URL = "http://localhost:8000"

# ==============================================================
# Load Product Data
# ==============================================================
def load_product_data():
    """Load product metadata and image paths from item_features.csv"""
    try:
        import pandas as pd
        import os
        from pathlib import Path

        # Load item_features.csv with image_path column
        csv_path = "../data/processed/item_features.csv"
        df = pd.read_csv(csv_path)

        # Resolve repository root (project root = e-shop/)
        repo_root = Path(__file__).resolve().parents[3]

        # Mapping dicts
        names_dict = {}
        images_dict = {}

        def resolve_image_path(img_path: str) -> Optional[str]:
            """Resolve image_path stored in CSV to a usable absolute path or URL."""
            if pd.isna(img_path) or not img_path:
                return None
            s = str(img_path).strip()

            # If it's already a URL, return as-is
            if s.lower().startswith(("http://", "https://")):
                return s

            p = Path(s)
            # If absolute path and exists -> use it
            if p.is_absolute():
                return str(p) if p.exists() else None

            # Try candidate locations (first existing wins)
            candidates = [
                repo_root / s,                                 # e.g. recomender/etl/data/...
                repo_root / "recomender" / "etl" / s,          # in case stored without project root
                repo_root / "data" / "raw" / p.name,           # data/raw/filename.jpg
                repo_root / "data" / "processed" / p.name,     # data/processed/filename.jpg
                repo_root / p.name                             # file at project root
            ]

            for c in candidates:
                try:
                    if c.exists():
                        return str(c)
                except Exception:
                    continue
            return None

        for _, row in df.iterrows():
            variant_id = str(row.get('id') or row.get('variant_id') or "")
            if not variant_id:
                continue

            names_dict[variant_id] = row.get('product_name', f"Product {variant_id}")

            # Get image_path from CSV and resolve it
            raw_image_path = row.get('image_path', None)
            resolved = resolve_image_path(raw_image_path)
            images_dict[variant_id] = resolved

        valid_images = sum(1 for v in images_dict.values() if v)
        print(f"Loaded {len(names_dict)} products with {valid_images} resolved image paths")

        return {
            'names': names_dict,
            'images': images_dict
        }
    except Exception as e:
        print(f"Error loading product data from item_features.csv: {e}")
        # Fallback to numpy files
        try:
            variant_ids = np.load("../data/processed/hybrid_variant_ids.npy", allow_pickle=True)
            product_names = np.load("../data/processed/product_names.npy", allow_pickle=True)
            return {
                'names': {str(vid): name for vid, name in zip(variant_ids, product_names)},
                'images': {str(vid): None for vid in variant_ids}
            }
        except:
            return {'names': {}, 'images': {}}

PRODUCT_DATA = load_product_data()

# ==============================================================
# Image Functions
# ==============================================================
def get_product_image(variant_id: str) -> Optional[Image.Image]:
    """Get product image from local path or URL. Returns PIL Image or placeholder."""
    image_path = PRODUCT_DATA['images'].get(str(variant_id))

    if not image_path:
        return create_placeholder_image(variant_id)

    try:
        # If it's a URL
        if isinstance(image_path, str) and image_path.lower().startswith(('http://', 'https://')):
            response = requests.get(image_path, timeout=6)
            response.raise_for_status()
            img = Image.open(io.BytesIO(response.content)).convert("RGB")
            return img
        else:
            # Local path: ensure it's an absolute path string or Path
            p = pathlib.Path(image_path)
            if not p.is_absolute():
                # try to make absolute relative to project root
                repo_root = pathlib.Path(__file__).resolve().parents[3]
                p = repo_root / p
            if p.exists():
                return Image.open(p).convert("RGB")
            else:
                return create_placeholder_image(variant_id)
    except Exception as e:
        print(f"Error loading image for {variant_id}: {e}")
        return create_placeholder_image(variant_id)

def create_placeholder_image(variant_id: str) -> Image.Image:
    """Create a placeholder image with variant ID"""
    img = Image.new('RGB', (200, 200), color='#f0f0f0')
    draw = ImageDraw.Draw(img)
    
    # Draw border
    draw.rectangle([0, 0, 199, 199], outline='#cccccc', width=2)
    
    # Add text
    text = f"Product\n{variant_id[:20]}"
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except:
        font = ImageFont.load_default()
    
    # Center text
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((200 - text_width) // 2, (200 - text_height) // 2)
    
    draw.text(position, text, fill='#666666', font=font, align='center')
    
    return img

def create_recommendation_gallery(recommendations: List[Dict]) -> List[Tuple[Image.Image, str]]:
    """Create image gallery with captions for recommendations"""
    gallery_data = []
    
    for i, rec in enumerate(recommendations[:12], 1):  # Limit to 12 images
        variant_id = rec['variant_id']  # ✅ FIX: Đổi từ 'product_id' sang 'variant_id'
        img = get_product_image(variant_id)
        
        # Create caption
        name = PRODUCT_DATA['names'].get(str(variant_id), "Unknown")
        caption = f"#{i} - {name}\nScore: {rec['similarity_score']:.4f} ({rec['similarity_score']*100:.1f}%)\nID: {variant_id}"
        
        gallery_data.append((img, caption))
    
    return gallery_data

# ==============================================================
# API Functions
# ==============================================================
def get_recommendations(variant_id: str, k: int = 10) -> Tuple[Dict, str]:
    """Get recommendations from API"""
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/recommend/{variant_id}?k={k}", timeout=5)
        elapsed = (time.time() - start) * 1000
        
        if response.status_code == 200:
            data = response.json()
            return data, f"✅ Success in {elapsed:.0f}ms (API: {data['response_time_ms']:.0f}ms, Cache: {data['from_cache']})"
        else:
            return {}, f"❌ Error {response.status_code}: {response.text}"
    except Exception as e:
        return {}, f"❌ Exception: {str(e)}"

def check_api_health() -> str:
    """Check if API is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code == 200:
            data = response.json()
            return f"""✅ API Status: {data['status']}
📊 FAISS Index: {data['faiss_index_size']} products
💾 Redis: {'Connected' if data['redis_connected'] else 'Disconnected'}
📦 Version: {data['version']}"""
        return "❌ API returned error"
    except:
        return "❌ Cannot connect to API. Please start: python faiss_api.py"

# ==============================================================
# UI Functions
# ==============================================================
def format_product_info(variant_id: str) -> Tuple[str, Image.Image]:
    """Format product information with image"""
    name = PRODUCT_DATA['names'].get(str(variant_id), "Unknown Product")
    info = f"""### 🎯 Source Product
**Variant ID:** `{variant_id}`
**Name:** {name}
"""
    image = get_product_image(variant_id)
    return info, image

def format_recommendations_table(recommendations: List[Dict]) -> pd.DataFrame:
    """Format recommendations as a table"""
    if not recommendations:
        return pd.DataFrame()
    
    data = []
    for i, rec in enumerate(recommendations, 1):
        variant_id = rec['variant_id']  # ✅ FIX: Đổi từ 'product_id' sang 'variant_id'
        data.append({
            'Rank': f"#{i}",
            'Variant ID': variant_id,
            'Product Name': PRODUCT_DATA['names'].get(str(variant_id), "Unknown"),
            'Similarity': f"{rec['similarity_score']:.4f}",
            'Score %': f"{rec['similarity_score']*100:.2f}%"
        })
    
    return pd.DataFrame(data)

def analyze_recommendation_quality(recommendations: List[Dict]) -> str:
    """Analyze the quality of recommendations"""
    if not recommendations:
        return "❌ No recommendations to analyze"
    
    scores = [r['similarity_score'] for r in recommendations]
    
    analysis = f"""### 📊 Quality Analysis
    
**Score Distribution:**
- Highest: {max(scores):.4f} ({max(scores)*100:.1f}%)
- Lowest: {min(scores):.4f} ({min(scores)*100:.1f}%)
- Average: {np.mean(scores):.4f} ({np.mean(scores)*100:.1f}%)
- Std Dev: {np.std(scores):.4f}

**Quality Assessment:**
"""
    
    avg_score = np.mean(scores)
    if avg_score > 0.8:
        analysis += "✅ **Excellent** - Very high similarity scores\n"
    elif avg_score > 0.6:
        analysis += "✅ **Good** - Strong similarity scores\n"
    elif avg_score > 0.4:
        analysis += "⚠️ **Moderate** - Acceptable similarity\n"
    else:
        analysis += "❌ **Poor** - Low similarity scores\n"
    
    score_range = max(scores) - min(scores)
    if score_range < 0.1:
        analysis += "- Consistent similarity across recommendations\n"
    else:
        analysis += "- Varied similarity - recommendations span different relevance levels\n"
    
    top3_avg = np.mean(scores[:3])
    if top3_avg > 0.85:
        analysis += "- Top 3 recommendations are highly relevant\n"
    
    return analysis

def test_recommendation(variant_id: str, k: int, show_analysis: bool, show_images: bool):
    """Main function to test recommendations"""
    if not variant_id:
        return "⚠️ Please enter a variant ID", None, pd.DataFrame(), None, "", ""
    
    # Get recommendations
    data, status = get_recommendations(variant_id, k)
    
    if not data:
        return status, None, pd.DataFrame(), None, "", ""
    
    # Format results
    product_info, product_image = format_product_info(variant_id)
    recommendations_df = format_recommendations_table(data['recommendations'])
    
    # Gallery
    gallery = None
    if show_images:
        gallery = create_recommendation_gallery(data['recommendations'])
    
    # Analysis
    analysis = ""
    if show_analysis:
        analysis = analyze_recommendation_quality(data['recommendations'])
    
    # Metadata
    metadata = f"""### ⚙️ Request Info
- **K (number of results):** {k}
- **From cache:** {data['from_cache']}
- **Response time:** {data['response_time_ms']:.2f}ms
- **Total recommendations:** {len(data['recommendations'])}
"""
    
    return product_info, product_image, recommendations_df, gallery, analysis, metadata

def get_random_product() -> str:
    """Get a random variant ID"""
    if PRODUCT_DATA['names']:
        return np.random.choice(list(PRODUCT_DATA['names'].keys()))
    return ""

# ==============================================================
# Gradio Interface
# ==============================================================
with gr.Blocks(title="E-Shop Recommendation Tester", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 🛍️ E-Shop Recommendation Quality Checker
    Test and visualize product recommendations with images
    """)
    
    # API Status
    with gr.Row():
        api_status = gr.Textbox(label="API Status", value=check_api_health(), lines=4)
        refresh_btn = gr.Button("🔄 Refresh Status")
        refresh_btn.click(check_api_health, outputs=api_status)
    
    gr.Markdown("---")
    
    # Main Tab
    with gr.Tabs():
        # Tab 1: Single Product Test
        with gr.Tab("🎯 Single Product Test"):
            with gr.Row():
                with gr.Column(scale=2):
                    product_input = gr.Textbox(
                        label="Variant ID",  # ✅ FIX: Đổi label
                        placeholder="Enter variant ID",
                        value=get_random_product()
                    )
                with gr.Column(scale=1):
                    k_slider = gr.Slider(
                        minimum=1, maximum=50, value=10, step=1,
                        label="Number of recommendations (k)"
                    )
            
            with gr.Row():
                show_analysis = gr.Checkbox(label="Show Quality Analysis", value=True)
                show_images = gr.Checkbox(label="Show Product Images", value=True)
                test_btn = gr.Button("🔍 Get Recommendations", variant="primary")
                random_btn = gr.Button("🎲 Random Product")
            
            # Source Product Display
            with gr.Row():
                with gr.Column(scale=1):
                    source_image = gr.Image(label="Source Product Image", height=250)
                with gr.Column(scale=2):
                    product_info = gr.Markdown()
            
            # Recommendations Table
            recommendations_table = gr.Dataframe(
                label="Recommendations",
                wrap=True
            )
            
            # Image Gallery
            recommendations_gallery = gr.Gallery(
                label="Recommended Products (Visual)",
                columns=4,
                rows=3,
                height="auto",
                object_fit="contain"
            )
            
            # Analysis and Metadata
            with gr.Row():
                with gr.Column():
                    analysis_output = gr.Markdown()
                with gr.Column():
                    metadata_output = gr.Markdown()
            
            test_btn.click(
                test_recommendation,
                inputs=[product_input, k_slider, show_analysis, show_images],
                outputs=[product_info, source_image, recommendations_table, 
                        recommendations_gallery, analysis_output, metadata_output]
            )
            
            random_btn.click(
                get_random_product,
                outputs=product_input
            )
    
    gr.Markdown("""
    ---
    ### 💡 Tips:
    - **High similarity (>0.8)**: Very similar products
    - **Medium similarity (0.5-0.8)**: Related products  
    - **Low similarity (<0.5)**: Loosely related
    - Toggle "Show Product Images" to see visual recommendations
    - Images are loaded from CSV or generated as placeholders
    """)

# ==============================================================
# Launch
# ==============================================================
if __name__ == "__main__":
    print("\n" + "="*70)
    print("E-Shop Recommendation Quality Checker with Images")
    print("="*70)
    print(f"Loaded {len(PRODUCT_DATA['names'])} products")
    print(f"Image data available: {sum(1 for v in PRODUCT_DATA['images'].values() if v)}")
    print(f"API URL: {BASE_URL}")
    print("Starting Gradio interface...")
    print("="*70 + "\n")
    
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=True
    )