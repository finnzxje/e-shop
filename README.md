# e-shop

## Development

Run the API with its development database:

```
docker compose up --build
```

Stop the stack when you are done:

```
docker compose down
```

## Testing

Start the isolated PostgreSQL instance for integration tests:

```
docker compose -f docker-compose.test.yml up -d
```

Tear it down after tests complete:

```
docker compose -f docker-compose.test.yml down
```

# RECOMMENDATION SYSTEM

## 1. Introduction

This Recommendation System (RS) is designed to provide personalized suggestions for products, content, or services based on item features and user interactions. The project leverages modern techniques such as:

- **Content-based filtering**: Recommends items similar to the ones the user has interacted with, based on item features.
- **Collaborative filtering**: Suggests items based on user behavior and interaction patterns.
- **Hybrid approaches**: Combines content-based and collaborative filtering to improve recommendation accuracy.

Use cases include:

- E-commerce (product recommendations)
- Media platforms (video, article, music suggestions)
- Social applications (friend or content suggestions)

---

## 2. System Architecture

    Product Data
    │
    ├─── Images + Text ────→ CLIP ────→ 512D embedding
    │
    └─── Metadata ─────────→ BERT ────→ 512D embedding
         (category, color,
          price, rating)
                    │
                    ↓
        Hybrid = α × CLIP + (1-α) × BERT
                    │
                    ↓ (L2 normalize)
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
     FAISS Index         PostgreSQL (backup)
        ↓
    FastAPI Server ← Redis Cache
        ↓
    REST API Endpoints

- **Feature Extraction**:

  - `CLIP` is used to generate embeddings from images and textual descriptions.
  - `BERT` is used to extract embeddings from textual product descriptions.

- **Vector Indexing**:

  - FAISS is used to store and quickly search through vector embeddings.

- **Recommendation Logic**:

  - Returns items with the closest vector distances in the embedding space.
  - Can be extended to Hybrid Filtering when user interaction data is available.

- **Caching**:
  - Redis is used for caching recommendation results to improve response time.

---

## 3. Installation

### 3.1 Requirements

- Python >= 3.10
- CUDA (if using GPU for FAISS)
- Python libraries:

```bash
pip install -r requirements.txt
```

### 3.2 Environment Setup

- Create a virtual environment:

```bash
      python -m venv venv
      source venv/bin/activate  # Linux/macOS
      venv\Scripts\activate     # Windows
```

- Install dependencies:

```bash
    pip install -r requirements.txt

```

## 4. Usage

### Step 1 : Run ETL pipeline

```bash
    cd recomender/etl
    python3 run_etl.py
```

## Step 2 : Run Clip Embedding (embedding iteam feature in database to np file )

```bash
   python3 clip_embedding_pipeline.py
```

## Step 3: Run Bert embedding and test recomender system

```bash
  cd Content_Base_Model
  python3 workFlow.py
```

## Step 4 . Run build Faiss Index and API

```bash
    python3 build_faiss_index.py
    python3 faiss_api.py
    or
    uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

## Step 5 : test API

```bash
    python3 testAPI.py
```

## 5. Hybrid Recommendation API Documentation

### Base URL

```
http://localhost:8000
```

### Overview

The API is built with FastAPI and powered by CLIP and BERT hybrid embeddings, using FAISS for vector similarity search and Redis for caching. It supports both single and batch recommendation requests, along with system monitoring endpoints.

#### Key Features

- **Hybrid embeddings** using CLIP (visual) and BERT (textual)
- **Fast similarity search** with FAISS indexing
- **Caching layer** with Redis for improved performance
- **Batch processing** for multiple recommendations
- **Health monitoring** and statistics endpoints

---

## 6. API Endpoints

### 6.1 Root Endpoint

**`GET /`**

Simple endpoint to verify that the API is running.

**Example Request:**

```bash
curl -X GET http://localhost:8000/
```

**Response:**

```json
{
  "message": "Hybrid Recommendation API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

---

### 6.2 Health Check

**`GET /health`**

Returns current system status, FAISS index size, Redis connection status, and embedding dimension.

**Example Request:**

```bash
curl -X GET http://localhost:8000/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T09:33:20.123Z",
  "faiss_index_size": 19350,
  "redis_connected": true,
  "version": "1.0.0",
  "embedding_dimension": 512
}
```

---

### 6.3 Single Product Recommendation

**`GET /recommend/{product_id}`**

Returns a list of similar products for a given product ID.

**Path Parameters:**

| Name         | Type   | Description                                     |
| ------------ | ------ | ----------------------------------------------- |
| `product_id` | string | UUID of the product to find recommendations for |

**Query Parameters:**

| Name | Type | Default | Description                       |
| ---- | ---- | ------- | --------------------------------- |
| `k`  | int  | `5`     | Number of similar items to return |

**Example Request:**

```bash
curl -X GET "http://localhost:8000/recommend/2b6ae79d-4169-415e-8b53-d9e87c832240?k=5"
```

**Response:**

```json
{
  "query_product_id": "2b6ae79d-4169-415e-8b53-d9e87c832240",
  "recommendations": [
    {
      "product_id": "7614d53a-2ea1-4da4-b0b2-3bc196f1a804",
      "similarity_score": 0.9896,
      "product_name": "Áo thun thể thao",
      "category_name": "Thời trang nam",
      "price": 199000,
      "image_path": "/images/men_sport_tee.jpg"
    }
  ],
  "response_time_ms": 22.45,
  "from_cache": false,
  "total_results": 5
}
```

**Use Case:**

> Use this endpoint to recommend similar products when a user views a product detail page. The response can be directly consumed by frontend applications or backend services (e.g., Spring Boot).

---

### 6.4 Batch Recommendation

**`POST /recommend/batch`**

Get recommendations for multiple product IDs in a single request, optimizing performance for batch operations.

**Request Body:**

```json
{
  "product_ids": [
    "2b6ae79d-4169-415e-8b53-d9e87c832240",
    "7614d53a-2ea1-4da4-b0b2-3bc196f1a804"
  ],
  "k": 5
}
```

**Example Request:**

```bash
curl -X POST http://localhost:8000/recommend/batch \
  -H "Content-Type: application/json" \
  -d '{
    "product_ids": [
      "2b6ae79d-4169-415e-8b53-d9e87c832240",
      "7614d53a-2ea1-4da4-b0b2-3bc196f1a804"
    ],
    "k": 5
  }'
```

**Response:**

```json
{
  "results": {
    "2b6ae79d-4169-415e-8b53-d9e87c832240": {
      "recommendations": [
        {
          "product_id": "7614d53a-2ea1-4da4-b0b2-3bc196f1a804",
          "similarity_score": 0.98
        }
      ],
      "total_results": 5
    }
  },
  "response_time_ms": 44.21,
  "total_queries": 2
}
```

---

### 6.5 FAISS Statistics

**`GET /stats`**

Retrieve system and FAISS configuration details including index size, cache settings, and technical parameters.

**Example Request:**

```bash
curl -X GET http://localhost:8000/stats
```

**Response:**

```json
{
  "total_products": 19350,
  "index_type": "Flat",
  "embedding_dimension": 512,
  "redis_enabled": true,
  "cache_ttl_seconds": 3600,
  "max_k": 100
}
```

**Response Fields:**

| Field                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `total_products`      | Total number of products indexed in FAISS           |
| `index_type`          | FAISS index type (e.g., "Flat")                     |
| `embedding_dimension` | Dimension of embedding vectors (512)                |
| `redis_enabled`       | Whether Redis caching is active                     |
| `cache_ttl_seconds`   | Cache time-to-live in seconds                       |
| `max_k`               | Maximum number of recommendations allowed per query |

---

## 7. Technical Details

### 7.1 Architecture Overview

The API uses a hybrid approach combining:

1. **CLIP embeddings** - For visual similarity based on product images
2. **BERT embeddings** - For textual similarity based on descriptions
3. **FAISS indexing** - For efficient nearest neighbor search
4. **Redis caching** - For improved response times on repeated queries

### 7.2 Performance Characteristics

- **Average response time**: ~20-50ms for single queries
- **Cache hit benefit**: ~5-10x faster response
- **Batch efficiency**: Process multiple queries with minimal overhead
- **Scalability**: Handles 19,350+ products with sub-second response times

### 7.3 Best Practices

> **Recommendations:**
>
> - Use batch endpoints when requesting recommendations for multiple products
> - Monitor the `/health` endpoint for system status
> - Consider implementing client-side caching for frequently accessed products
> - Set appropriate `k` values based on your UI requirements (default: 5)
> - Handle timeout scenarios gracefully in production environments

### 7.4 Error Handling

The API returns standard HTTP status codes:

| Status Code | Description                                         |
| ----------- | --------------------------------------------------- |
| 200         | Successful request                                  |
| 400         | Bad request (invalid parameters)                    |
| 404         | Product not found                                   |
| 500         | Internal server error                               |
| 503         | Service unavailable (FAISS/Redis connection issues) |
