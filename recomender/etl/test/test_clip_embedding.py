from clip_embedding_pipeline import CLIPEmbedder
import numpy as np

# Initialize embedder
embedder = CLIPEmbedder(model_name="ViT-B/32")

# 1. Encode text
text = "red summer dress for women"
text_emb = embedder.encode_text(text)
print(f"Text embedding shape: {text_emb.shape}")  # (512,)

# 2. Encode image from URL
image_url = "https://www.patagonia.com/dw/image/v2/BDJB_PRD/on/demandware.static/-/Sites-patagonia-master/default/dwc8e201ac/images/hi-res/81786_DKAS.jpg?sw=768&sh=768&sfrm=png&q=95&bgcolor=f3f4ef"
image_emb = embedder.encode_image_from_url(image_url)
print(f"Image embedding shape: {image_emb.shape}")  # (512,)

# 3. Encode product (multimodal)
product_emb = embedder.encode_product(
    product_name="Summer Dress",
    product_description="Beautiful red floral dress perfect for summer",
    image_url=image_url,
    text_weight=0.5  # 50% text, 50% image
)
print(f"Product embedding shape: {product_emb.shape}")  # (512,)