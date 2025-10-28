import pandas as pd
import os
import shutil
from pathlib import Path
import re

def normalize_name(name):
    """
    Chuẩn hóa tên để so sánh:
    - Chuyển thường
    - Loại bỏ ký tự đặc biệt (:, /, ', ", (, ), ., ,)
    - Thay khoảng trắng, /, : bằng '-'
    - Loại bỏ gạch nối và gạch dưới dư thừa
    """
    if pd.isna(name):
        return ""
    
    name = str(name).lower().strip()
    
    # Thay các ký tự phân tách thành dấu '-'
    name = re.sub(r'[\s/:]+', '-', name)
    
    # Loại bỏ ký tự đặc biệt không cần thiết
    name = re.sub(r'[\'"(),.]', '', name)
    
    # Loại bỏ gạch dưới
    name = name.replace('_', '-')
    
    # Xóa gạch nối trùng nhau
    name = re.sub(r'-+', '-', name)
    
    # Bỏ gạch nối ở đầu/cuối (nếu có)
    name = name.strip('-')
    
    return name



def map_images_to_variants(csv_path, images_folder, output_folder):
    """
    Ánh xạ ảnh từ folder theo variant_id
    
    Args:
        csv_path: Đường dẫn đến file CSV
        images_folder: Thư mục chứa ảnh (tên file: product_id-color_name.ext)
        output_folder: Thư mục đầu ra chứa ảnh đã đổi tên
    """
    
    # Đọc CSV
    print("Đang đọc file CSV...")
    df = pd.read_csv(csv_path)
    
    # Tạo thư mục output nếu chưa có
    os.makedirs(output_folder, exist_ok=True)
    
    # Lấy danh sách tất cả các file ảnh trong folder
    image_files = []
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    
    for file in os.listdir(images_folder):
        if any(file.lower().endswith(ext) for ext in image_extensions):
            image_files.append(file)
    
    print(f"Tìm thấy {len(image_files)} ảnh trong folder")
    
    # Tạo mapping dictionary từ ảnh
    image_mapping = {}
    for img_file in image_files:
        # Lấy tên file không có extension
        name_without_ext = os.path.splitext(img_file)[0]
        # Chuẩn hóa để làm key
        normalized_key = normalize_name(name_without_ext)
        image_mapping[normalized_key] = img_file
    
    # Xử lý từng dòng trong CSV
    mapped_count = 0
    not_found_count = 0
    not_found_list = []
    
    print("\nĐang ánh xạ ảnh...")
    
    for idx, row in df.iterrows():
        variant_id = row['variant_id']
        product_id = row['product_id']
        color_name = row['color_name']
        
        # Tạo pattern tìm kiếm: product_id-color_name
        search_pattern = f"{product_id}-{color_name}"
        normalized_pattern = normalize_name(search_pattern)
        
        # Tìm ảnh matching
        if normalized_pattern in image_mapping:
            source_file = image_mapping[normalized_pattern]
            source_path = os.path.join(images_folder, source_file)
            
            # Lấy extension của file gốc
            file_ext = os.path.splitext(source_file)[1]
            
            # Tạo tên file mới với variant_id
            new_filename = f"{variant_id}{file_ext}"
            dest_path = os.path.join(output_folder, new_filename)
            
            # Copy file
            shutil.copy2(source_path, dest_path)
            mapped_count += 1
            
            if (idx + 1) % 100 == 0:
                print(f"Đã xử lý {idx + 1}/{len(df)} dòng...")
        else:
            not_found_count += 1
            not_found_list.append({
                'variant_id': variant_id,
                'product_id': product_id,
                'color_name': color_name,
                'search_pattern': search_pattern
            })
    
    # Tạo báo cáo
    print("\n" + "="*60)
    print("KẾT QUẢ ÁNH XẠ")
    print("="*60)
    print(f"Tổng số variant: {len(df)}")
    print(f"Ánh xạ thành công: {mapped_count}")
    print(f"Không tìm thấy ảnh: {not_found_count}")
    print(f"Ảnh đã lưu vào: {output_folder}")
    
    # Xuất danh sách các variant không tìm thấy ảnh
    if not_found_list:
        not_found_df = pd.DataFrame(not_found_list)
        not_found_csv = os.path.join(output_folder, 'not_found_images.csv')
        not_found_df.to_csv(not_found_csv, index=False)
        print(f"\nDanh sách variant không tìm thấy ảnh: {not_found_csv}")
        print("\nMột số ví dụ không tìm thấy:")
        print(not_found_df.head(10))
    
    # Tạo file CSV mapping
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
        print(f"\nFile mapping variant-image: {mapping_csv}")
        
        # ✅ Ghép thêm vào item_features.csv
        print("\nĐang cập nhật file item_features.csv với cột image_path...")
        merged_df = df.merge(mapping_df[['variant_id', 'image_path']], on='variant_id', how='left')
        
        # Lưu đè hoặc ra file mới (tùy bạn chọn)
        updated_csv = csv_path  # hoặc "./data/processed/item_features_with_image.csv"
        merged_df.to_csv(updated_csv, index=False)
        print(f"Đã cập nhật thành công file CSV: {updated_csv}")

    
    return mapped_count, not_found_count

# Sử dụng script
if __name__ == "__main__":
    # Cấu hình đường dẫn
    CSV_FILE = "./data/processed/item_features.csv"  # Đường dẫn đến file CSV của bạn
    IMAGES_FOLDER = "./data/raw/downloads"  # Thư mục chứa ảnh đã download
    OUTPUT_FOLDER = "./images"  # Thư mục đầu ra
    
    # Chạy script
    try:
        mapped, not_found = map_images_to_variants(CSV_FILE, IMAGES_FOLDER, OUTPUT_FOLDER)
        print(f"\n✓ Hoàn thành! Đã ánh xạ {mapped} ảnh thành công.")
    except FileNotFoundError as e:
        print(f"✗ Lỗi: Không tìm thấy file hoặc thư mục - {e}")
    except Exception as e:
        print(f"✗ Lỗi: {e}")