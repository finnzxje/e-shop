"""
E-Shop Recommendation API Tester
===================================
Kiểm thử các endpoints của hệ thống gợi ý sản phẩm eShop (FastAPI + FAISS)

Usage:
    python test_eshop_api.py
"""

import requests
import time
import numpy as np
from typing import List, Dict
import logging
from concurrent.futures import ThreadPoolExecutor
import statistics

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("eshop_tester")

BASE_URL = "http://localhost:8000"


class EShopAPITester:
    """Tester cho E-Shop Recommendation API"""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url

    # ==========================================================
    # 1️⃣ Health Check
    # ==========================================================
    def test_health(self) -> Dict:
        """Kiểm tra endpoint /health"""
        logger.info("\n🏥 Testing /health endpoint...")
        response = requests.get(f"{self.base_url}/health")

        if response.status_code == 200:
            data = response.json()
            logger.info("✓ API Health OK")
            logger.info(f"  Status: {data['status']}")
            logger.info(f"  FAISS index size: {data['faiss_index_size']}")
            logger.info(f"  Redis connected: {data['redis_connected']}")
            logger.info(f"  Version: {data['version']}")
            return data
        else:
            logger.error(f"✗ Health check failed: {response.status_code}")
            return {}

    # ==========================================================
    # 2️⃣ Single Product Recommendation
    # ==========================================================
    def test_single_recommendation(self, product_id: str, k: int = 10) -> Dict:
        """Test gợi ý 1 sản phẩm"""
        logger.info(f"\n🔍 Testing recommendation for product: {product_id}")

        start_time = time.time()
        response = requests.get(f"{self.base_url}/recommend/{product_id}?k={k}")
        request_time = (time.time() - start_time) * 1000

        if response.status_code == 200:
            data = response.json()
            logger.info(f"✓ Got {len(data['recommendations'])} recommendations")
            logger.info(f"  Request time: {request_time:.2f}ms")
            logger.info(f"  Server time: {data['response_time_ms']:.2f}ms")
            logger.info(f"  From cache: {data['from_cache']}")

            # In top 3 recommendations
            logger.info("\n  🔝 Top 3 recommendations:")
            for i, rec in enumerate(data['recommendations'][:5], 1):
                logger.info(f"    {i}. {rec['product_id']} (score: {rec['similarity_score']:.4f})")
                if rec.get('product_name'):
                    logger.info(f"       {rec['product_name']}")
            return data
        else:
            logger.error(f"✗ Recommendation failed: {response.status_code}")
            logger.error(f"  Error: {response.text}")
            return {}

    # ==========================================================
    # 3️⃣ Batch Recommendation
    # ==========================================================
    def test_batch_recommendation(self, product_ids: List[str], k: int = 10) -> Dict:
        """Test gợi ý cho nhiều sản phẩm cùng lúc"""
        logger.info(f"\n📦 Testing batch recommendation for {len(product_ids)} products...")

        start_time = time.time()
        response = requests.post(
            f"{self.base_url}/recommend/batch",
            json={"product_ids": product_ids, "k": k}
        )
        request_time = (time.time() - start_time) * 1000

        if response.status_code == 200:
            data = response.json()
            logger.info("✓ Batch recommendation completed")
            logger.info(f"  Request time: {request_time:.2f}ms")
            logger.info(f"  Server time: {data['response_time_ms']:.2f}ms")
            logger.info(f"  Avg per product: {data['response_time_ms']/len(product_ids):.2f}ms")
            return data
        else:
            logger.error(f"✗ Batch recommendation failed: {response.status_code}")
            return {}

    # ==========================================================
    # 4️⃣ Cache Effectiveness
    # ==========================================================
    def test_cache_effectiveness(self, product_id: str, n_requests: int = 10) -> Dict:
        """Đánh giá tốc độ cache Redis"""
        logger.info(f"\n💾 Testing cache with {n_requests} repeated requests...")

        times, from_cache_count = [], 0
        for _ in range(n_requests):
            start = time.time()
            response = requests.get(f"{self.base_url}/recommend/{product_id}?k=10")
            t = (time.time() - start) * 1000
            if response.status_code == 200:
                data = response.json()
                times.append(t)
                if data['from_cache']:
                    from_cache_count += 1

        first_time = times[0]
        cached_time = statistics.mean(times[1:]) if len(times) > 1 else 0
        speedup = first_time / cached_time if cached_time > 0 else 0

        logger.info("📊 Cache Performance:")
        logger.info(f"  First request: {first_time:.2f}ms")
        logger.info(f"  Cached avg: {cached_time:.2f}ms")
        logger.info(f"  Speedup: {speedup:.1f}x")
        logger.info(f"  Cache hits: {from_cache_count}/{n_requests}")

        return {'first': first_time, 'cached_avg': cached_time, 'speedup': speedup, 'hits': from_cache_count}

    # ==========================================================
    # 5️⃣ Benchmark Throughput
    # ==========================================================
    def benchmark_throughput(self, product_ids: List[str], n_concurrent: int = 10) -> Dict:
        """Đo hiệu năng khi gửi nhiều request song song"""
        logger.info(f"\n⚡ Benchmarking throughput with {n_concurrent} concurrent requests...")

        def make_request(pid):
            start = time.time()
            resp = requests.get(f"{self.base_url}/recommend/{pid}?k=10")
            duration = (time.time() - start) * 1000
            return {'ok': resp.status_code == 200, 'time': duration}

        start_time = time.time()
        with ThreadPoolExecutor(max_workers=n_concurrent) as ex:
            results = list(ex.map(make_request, product_ids[:n_concurrent]))

        total = time.time() - start_time
        ok_count = sum(r['ok'] for r in results)
        durations = [r['time'] for r in results if r['ok']]
        avg = statistics.mean(durations) if durations else 0
        p95 = np.percentile(durations, 95) if durations else 0
        throughput = ok_count / total

        logger.info("📊 Throughput:")
        logger.info(f"  Success: {ok_count}/{n_concurrent}")
        logger.info(f"  Total time: {total:.2f}s")
        logger.info(f"  Throughput: {throughput:.1f} req/s")
        logger.info(f"  Avg latency: {avg:.2f}ms | P95: {p95:.2f}ms")

        return {'throughput': throughput, 'avg_latency': avg, 'p95': p95, 'success_rate': ok_count / n_concurrent}

    # ==========================================================
    # 6️⃣ Error Handling
    # ==========================================================
    def test_error_handling(self):
        """Kiểm thử phản hồi lỗi"""
        logger.info("\n🚨 Testing error handling...")
        # Invalid product
        r1 = requests.get(f"{self.base_url}/recommend/INVALID_PRODUCT?k=10")
        if r1.status_code == 404:
            logger.info("✓ Invalid product -> 404 OK")
        else:
            logger.warning(f"✗ Expected 404, got {r1.status_code}")

        # Invalid k
        r2 = requests.get(f"{self.base_url}/recommend/test?k=999")
        if r2.status_code == 422:
            logger.info("✓ Invalid k -> 422 OK")
        else:
            logger.warning(f"✗ Expected 422, got {r2.status_code}")

        # Empty batch
        r3 = requests.post(f"{self.base_url}/recommend/batch", json={"product_ids": [], "k": 10})
        if r3.status_code == 422:
            logger.info("✓ Empty batch -> 422 OK")
        else:
            logger.warning(f"✗ Expected 422, got {r3.status_code}")

    # ==========================================================
    # 🔁 Run All Tests
    # ==========================================================
    def run_all_tests(self, product_ids: List[str]):
        logger.info("\n" + "="*70)
        logger.info("🧪 RUNNING ALL ESHOP API TESTS")
        logger.info("="*70)

        results = {}
        results['health'] = self.test_health()

        if product_ids:
            results['single'] = self.test_single_recommendation(product_ids[0])
        if len(product_ids) >= 5:
            results['batch'] = self.test_batch_recommendation(product_ids[:5])
        if product_ids:
            results['cache'] = self.test_cache_effectiveness(product_ids[0])
        if len(product_ids) >= 10:
            results['throughput'] = self.benchmark_throughput(product_ids[:20])
        self.test_error_handling()

        logger.info("\n" + "="*70)
        logger.info("📊 TEST SUMMARY")
        logger.info("="*70)
        if 'throughput' in results:
            logger.info(f"✓ Throughput: {results['throughput']['throughput']:.1f} req/s")
            logger.info(f"✓ Avg Latency: {results['throughput']['avg_latency']:.2f}ms")
        if 'cache' in results:
            logger.info(f"✓ Cache Speedup: {results['cache']['speedup']:.1f}x")
        logger.info("="*70)

        return results


# ==============================================================
# Load product IDs
# ==============================================================
def get_sample_product_ids() -> List[str]:
    """Load danh sách product IDs từ file embedding"""
    try:
        variant_ids = np.load("../data/processed/hybrid_variant_ids.npy", allow_pickle=True)
        idxs = np.random.choice(len(variant_ids), min(20, len(variant_ids)), replace=False)
        return [str(variant_ids[i]) for i in idxs]
    except Exception as e:
        logger.warning(f" Cannot load product IDs: {e}")
        return []


# ==============================================================
# Entry Point
# ==============================================================
def main():
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code != 200:
            logger.error("❌ API is not responding correctly")
            return
    except requests.exceptions.RequestException:
        logger.error("❌ Cannot connect to API. Please start: python faiss_api.py")
        return

    logger.info(" E-Shop API is running")

    product_ids = get_sample_product_ids()
    if not product_ids:
        logger.error("❌ No product IDs found in data/processed/hybrid_variant_ids.npy")
        return

    logger.info(f"✓ Loaded {len(product_ids)} product IDs")
    tester = EShopAPITester(BASE_URL)
    tester.run_all_tests(product_ids)
    logger.info("\n✅ All tests completed successfully!")


if __name__ == "__main__":
    main()
