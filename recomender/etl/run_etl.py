from config import Config
from etl_pipeline import ETLPipeline
import logging
from datetime import datetime


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/etl_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Main ETL runner"""
    try:
  
        logger.info("Starting ETL Pipeline")
  
        
        # Initialize ETL
        etl = ETLPipeline(Config.DB_CONFIG)
        
        # Run pipeline
        result = etl.run(lookback_days=Config.LOOKBACK_DAYS)
        
        # Log results
        logger.info("ETL COMPLETED SUCCESSFULLY")
        logger.info(f"Interactions: {len(result['interactions'])} records")
        logger.info(f"Users: {len(result['user_features'])} users")
        logger.info(f"Items: {len(result['item_features'])} items")
        return result
        
    except Exception as e:
        logger.error(f"ETL Pipeline failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    import os
    os.makedirs('logs', exist_ok=True)
    os.makedirs('data/processed', exist_ok=True)
    main()