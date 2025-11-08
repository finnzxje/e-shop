import pandas as pd
import os
import shutil
from pathlib import Path
import re

def normalize_name(name):
    """
    Normalize name for comparison:
    - Convert to lowercase
    - Remove special characters (:, /, ', ", (, ), ., ,)
    - Replace spaces, /, : with '-'
    - Remove redundant hyphens and underscores
    """
    if pd.isna(name):
        return ""
    
    name = str(name).lower().strip()
    
    # Replace separator characters with '-'
    name = re.sub(r'[\s/:]+', '-', name)
    
    # Remove unnecessary special characters
    name = re.sub(r'[\'"(),.]', '', name)
    
    # Replace underscores
    name = name.replace('_', '-')
    
    # Remove duplicate hyphens
    name = re.sub(r'-+', '-', name)
    
    # Remove leading/trailing hyphens
    name = name.strip('-')
    
    return name

def map_images_to_variants(csv_path, images_folder, output_folder):
    """
    Map images from folder by variant_id
    
    Args:
        csv_path: Path to CSV file
        images_folder: Folder containing images (filename: product_id-color_name.ext)
        output_folder: Output folder for mapped images
    """
    
    # Read CSV
    print("Reading CSV file...")
    df = pd.read_csv(csv_path)
    
    # Create output directory if not exists
    os.makedirs(output_folder, exist_ok=True)
    
    # Get list of all image files in folder
    image_files = []
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    
    for file in os.listdir(images_folder):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            image_files.append(file)
    
    print(f"Found {len(image_files)} images in folder")
    
    # Create mapping dictionary from images
    image_mapping = {}
    for img_file in image_files:
        # Get filename without extension
        name_without_ext = os.path.splitext(img_file)[0]
        # Normalize for key
        normalized_key = normalize_name(name_without_ext)
        image_mapping[normalized_key] = img_file
    
    # Process each row in CSV
    mapped_count = 0
    not_found_count = 0
    not_found_list = []
    
    print("\nMapping images...")
    
    for idx, row in df.iterrows():
        variant_id = row['variant_id']
        product_id = row['product_id']
        color_name = row['color_name']
        
        # Create search pattern: product_id-color_name
        search_pattern = f"{product_id}-{color_name}"
        normalized_pattern = normalize_name(search_pattern)
        
        # Find matching image
        if normalized_pattern in image_mapping:
            source_file = image_mapping[normalized_pattern]
            source_path = os.path.join(images_folder, source_file)
            
            # Get original file extension
            file_ext = os.path.splitext(source_file)[1]
            
            # Create new filename with variant_id
            new_filename = f"{variant_id}{file_ext}"
            dest_path = os.path.join(output_folder, new_filename)
            
            # Copy file
            shutil.copy2(source_path, dest_path)
            mapped_count += 1
            
            if (idx + 1) % 100 == 0:
                print(f"Processed {idx + 1}/{len(df)} rows...")
        else:
            not_found_count += 1
            not_found_list.append({
                'variant_id': variant_id,
                'product_id': product_id,
                'color_name': color_name,
                'search_pattern': search_pattern
            })
    
    # Generate report
    print("\n" + "="*60)
    print("MAPPING RESULTS")
    print("="*60)
    print(f"Total variants: {len(df)}")
    print(f"Successfully mapped: {mapped_count}")
    print(f"Images not found: {not_found_count}")
    print(f"Images saved to: {output_folder}")
    
    # Export list of variants with missing images
    if not_found_list:
        not_found_df = pd.DataFrame(not_found_list)
        not_found_csv = os.path.join(output_folder, 'not_found_images.csv')
        not_found_df.to_csv(not_found_csv, index=False)
        print(f"\nList of variants with missing images: {not_found_csv}")
        print("\nSample of missing images:")
        print(not_found_df.head(10))
    
    # Create mapping CSV
    mapping_data = []
    for file in os.listdir(output_folder):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            variant_id = os.path.splitext(file)[0]
            mapping_data.append({
                'variant_id': variant_id,
                'image_filename': file,
                'image_path': os.path.abspath(os.path.join(output_folder, file))
            })
    
    if mapping_data:
        mapping_df = pd.DataFrame(mapping_data)
        mapping_csv = os.path.join(output_folder, 'variant_image_mapping.csv')
        mapping_df.to_csv(mapping_csv, index=False)
        print(f"\nVariant-image mapping file: {mapping_csv}")
        
        # Merge with item_features.csv
        print("\nUpdating item_features.csv with image_path column...")
        merged_df = df.merge(mapping_df[['variant_id', 'image_path']], on='variant_id', how='left')
        
        # Save updated CSV
        updated_csv = csv_path
        merged_df.to_csv(updated_csv, index=False)
        print(f"Successfully updated CSV file: {updated_csv}")
    
    return mapped_count, not_found_count

# Script usage
if __name__ == "__main__":
    # Configure paths
    CSV_FILE = "./data/processed/item_features.csv"
    IMAGES_FOLDER = "./data/raw/downloads"
    OUTPUT_FOLDER = "./data/raw/mapped_images"
    
    # Run script
    try:
        mapped, not_found = map_images_to_variants(CSV_FILE, IMAGES_FOLDER, OUTPUT_FOLDER)
        print(f"\nComplete! Successfully mapped {mapped} images.")
    except FileNotFoundError as e:
        print(f"Error: File or directory not found - {e}")
    except Exception as e:
        print(f"Error: {e}")