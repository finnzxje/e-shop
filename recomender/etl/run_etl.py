#!/usr/bin/env python3
"""
Unified ETL Pipeline Runner
- Extracts data from database
- Transforms and processes data
- Downloads product images
- Maps images to variants
"""

import argparse
import logging
import pathlib
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Final

from config import Config
from etl_pipeline import ETLPipeline
from mergeImageCsv import map_images_to_variants


# ===============================
#  CONSTANTS
# ===============================

BASE_HEADERS: Final = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


# ===============================
#  UTILITY FUNCTIONS
# ===============================

def _sanitize_segment(value: str) -> str:
    """Return a filesystem-friendly segment derived from the input string."""
    cleaned = re.sub(r"[^0-9A-Za-z._-]+", "-", value.strip().lower())
    cleaned = cleaned.strip("-") or "default"
    return cleaned


def derive_filename(product_id: str, color: str, url: str) -> str:
    """
    Create an output filename from product_id, color, and the image URL.
    Format: {product_id}-{color}{extension}
    """
    parsed = urllib.parse.urlparse(url)
    name = pathlib.Path(parsed.path).name
    suffix = pathlib.Path(name).suffix
    
    if not name:
        name = f"{product_id}-{color}"
    
    if not suffix:
        query_params = urllib.parse.parse_qs(parsed.query)
        sfrm = query_params.get("sfrm")
        if sfrm and sfrm[0]:
            suffix = f".{sfrm[0].split('/')[-1]}"
        else:
            suffix = ".jpg"
    
    product_segment = _sanitize_segment(product_id)
    color_segment = _sanitize_segment(color)
    return f"{product_segment}-{color_segment}{suffix}"


def ensure_unique_path(path: pathlib.Path, overwrite: bool) -> pathlib.Path:
    """Return a unique path, appending a numeric suffix unless overwrite is on."""
    if overwrite or not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    counter = 1
    candidate = path
    while candidate.exists():
        candidate = path.with_name(f"{stem}_{counter}{suffix}")
        counter += 1
    return candidate


def download_file(url: str, destination: pathlib.Path) -> None:
    """Download the URL content to the destination path."""
    parsed = urllib.parse.urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    headers = {
        **BASE_HEADERS,
        "Referer": referer,
        "Origin": referer.rstrip("/"),
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
    }

    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request) as response:
        content_type = response.info().get_content_type()
        if not content_type.startswith("image/"):
            raise ValueError(f"Unexpected content type {content_type!r}")
        data = response.read()

    destination.write_bytes(data)


# ===============================
#  IMAGE DOWNLOAD FUNCTIONS
# ===============================

def download_images_from_dataframe(
    item_features_df,
    output_dir: pathlib.Path,
    overwrite: bool = False
) -> tuple[int, int, int]:
    """
    Download all images from primary_image_url column in item_features_df.
    Files are saved as: product_id-color_name.ext
    
    Args:
        item_features_df: DataFrame containing product information
        output_dir: Directory to save images
        overwrite: If True, re-download existing files. If False, skip existing files.
        
    Returns:
        tuple: (downloaded, skipped, failed)
    """
    logger = logging.getLogger(__name__)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    downloaded = 0
    skipped = 0
    failed = 0

    for _, row in item_features_df.iterrows():
        try:
            url = row.get("primary_image_url")
            if not url or str(url).strip() == "":
                continue

            product_id = str(row.get("product_id", "unknown"))
            color = str(row.get("color_name", "default"))

            filename = derive_filename(product_id, color, url)
            destination = output_dir / filename

            # Check if file already exists
            if destination.exists():
                if overwrite:
                    logger.debug(f"Overwriting existing: {filename}")
                    destination.unlink()
                else:
                    logger.debug(f"Skipping existing: {filename}")
                    skipped += 1
                    continue

            # Download the file
            download_file(url, destination)
            logger.debug(f"Downloaded: {product_id} - {color}")
            downloaded += 1
            
        except Exception as e:
            failed += 1
            logger.warning(f"Failed to download {product_id} ({url}): {e}")

    logger.info(f"Download complete: {downloaded} new, {skipped} skipped, {failed} failed")
    return downloaded, skipped, failed


# ===============================
#  MAIN ETL PIPELINE
# ===============================

def run_full_etl_pipeline(
    lookback_days: int = None,
    output_dir: pathlib.Path = None,
    overwrite: bool = False
) -> dict:
    """
    Run complete ETL pipeline:
    1. Extract and transform data from database
    2. Download images from dataframe
    3. Map images to CSV variants
    
    Args:
        lookback_days: Number of days to look back for data
        output_dir: Directory to save downloaded images
        overwrite: Whether to overwrite existing images
        
    Returns:
        dict: ETL results with interactions, user_features, item_features
    """
    logger = logging.getLogger(__name__)
    
    # Set defaults
    if lookback_days is None:
        lookback_days = Config.LOOKBACK_DAYS
    if output_dir is None:
        output_dir = pathlib.Path("./data/raw/downloads")
    
    try:
        # ========== STEP 1: RUN MAIN ETL ==========
        logger.info("=" * 60)
        logger.info("STEP 1: Running ETL Pipeline")
        logger.info("=" * 60)
        
        etl = ETLPipeline(Config.DB_CONFIG)
        result = etl.run(lookback_days=lookback_days)

        logger.info("✓ ETL completed successfully")
        logger.info(f"  - Interactions: {len(result['interactions'])}")
        logger.info(f"  - Users: {len(result['user_features'])}")
        logger.info(f"  - Items: {len(result['item_features'])}")

        # ========== STEP 2: DOWNLOAD IMAGES FROM DATAFRAME ==========
        logger.info("")
        logger.info("=" * 60)
        logger.info("STEP 2: Downloading images from database")
        logger.info("=" * 60)
        
        downloaded, skipped, failed = download_images_from_dataframe(
            result["item_features"],
            output_dir,
            overwrite=overwrite
        )
        
        if overwrite:
            logger.info(f"✓ Downloaded {downloaded} images (overwrote existing)")
        else:
            logger.info(f"✓ Downloaded {downloaded} new images, skipped {skipped} existing")

        # ========== STEP 3: MAP IMAGES TO CSV ==========
        logger.info("")
        logger.info("=" * 60)
        logger.info("STEP 3: Mapping images to item_features.csv")
        logger.info("=" * 60)
        
        csv_path = "./data/processed/item_features.csv"
        
        
        mapped_output_dir = pathlib.Path("./data/raw/mapped_images")
        mapped_output_dir.mkdir(parents=True, exist_ok=True)
        mapped, not_found = map_images_to_variants(
            csv_path,
            str(output_dir),    
            str(mapped_output_dir)
        )

        logger.info(f"✓ Mapping complete: {mapped} matched, {not_found} not found")
        
        # ========== SUMMARY ==========
        logger.info("")
        logger.info("=" * 60)
        logger.info("ETL PIPELINE COMPLETED SUCCESSFULLY")
        logger.info("=" * 60)
        logger.info(f"Total images downloaded: {downloaded}")
        logger.info(f"Images skipped (already exist): {skipped}")
        logger.info(f"Images failed: {failed}")
        logger.info(f"Images mapped to variants: {mapped}")
        logger.info(f"Output directory: {output_dir}")

        return result

    except Exception as e:
        logger.error("=" * 60)
        logger.error("ETL PIPELINE FAILED")
        logger.error("=" * 60)
        logger.error(f"Error: {e}", exc_info=True)
        raise


# ===============================
#  CLI ARGUMENT PARSER
# ===============================

def parse_args() -> argparse.Namespace:
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Run complete ETL pipeline with image downloads",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run with default settings
  python run_etl.py

  # Specify lookback days and output directory
  python run_etl.py --lookback-days 90 --output-dir ./images

  # Overwrite existing images
  python run_etl.py --overwrite

  # Run in verbose mode
  python run_etl.py --verbose
        """
    )
    
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=None,
        help=f"Number of days to look back for data (default: {Config.LOOKBACK_DAYS})"
    )
    
    parser.add_argument(
        "--output-dir",
        type=pathlib.Path,
        default=pathlib.Path("./data/raw/downloads"),
        help="Directory to store downloaded images (default: ./data/raw/downloads)"
    )
    
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing images. Default: skip existing files to save time"
    )
    
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging (DEBUG level)"
    )
    
    return parser.parse_args()


# ===============================
#  MAIN ENTRY POINT
# ===============================

def main() -> int:
    """Main entry point for ETL pipeline"""
    args = parse_args()
    
    # Setup logging
    log_level = logging.DEBUG if args.verbose else logging.INFO
    log_dir = pathlib.Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / f"etl_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(),
        ],
    )
    
    logger = logging.getLogger(__name__)
    
    # Log configuration
    logger.info("Starting ETL Pipeline Runner")
    logger.info(f"Configuration:")
    logger.info(f"  - Lookback days: {args.lookback_days or Config.LOOKBACK_DAYS}")
    logger.info(f"  - Output directory: {args.output_dir}")
    logger.info(f"  - Overwrite: {args.overwrite}")
    logger.info(f"  - Log file: {log_file}")
    logger.info("")
    
    try:
        run_full_etl_pipeline(
            lookback_days=args.lookback_days,
            output_dir=args.output_dir,
            overwrite=args.overwrite
        )
        
        logger.info("")
        logger.info("All operations completed successfully! ✓")
        return 0
        
    except KeyboardInterrupt:
        logger.warning("")
        logger.warning("Process interrupted by user")
        return 130
        
    except Exception as e:
        logger.error("")
        logger.error(f"Pipeline failed with error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())