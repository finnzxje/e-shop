# ============================================================================
# E-Shop Recommendation System - Makefile
# ============================================================================

.PHONY: help build up down logs status clean test full-pipeline

.DEFAULT_GOAL := help

BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

help: ## Show this help message
	@echo "$(GREEN)E-Shop Recommendation System - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# Build & Infrastructure
# ============================================================================

build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker compose build

up: ## Start all services
	@echo "$(BLUE)Starting services...$(NC)"
	docker compose up -d postgres redis
	@sleep 5
	docker compose up -d api

down: ## Stop all services
	@echo "$(BLUE)Stopping services...$(NC)"
	docker compose down

restart: down up ## Restart all services

# ============================================================================
# Smart Pipeline Commands
# ============================================================================

smart-run: ## Smart pipeline - auto-skip completed steps (RECOMMENDED)
	@echo "$(GREEN)Running smart pipeline...$(NC)"
	@chmod +x smart_pipeline.sh
	@./smart_pipeline.sh auto

pipeline-status: ## Show pipeline status
	@echo "$(BLUE)Checking pipeline status...$(NC)"
	@chmod +x smart_pipeline.sh
	@./smart_pipeline.sh status

force-etl:
	@./smart_pipeline.sh force-etl

force-clip:
	@./smart_pipeline.sh force-clip

force-workflow:
	@./smart_pipeline.sh force-workflow

force-faiss:
	@./smart_pipeline.sh force-faiss

force-all:
	@./smart_pipeline.sh force-all

# ============================================================================
# Individual Pipeline Stages
# ============================================================================

etl:
	@echo "$(BLUE)Running ETL...$(NC)"
	docker compose --profile etl up etl

clip:
	@echo "$(BLUE)Generating CLIP embeddings...$(NC)"
	docker compose --profile clip up clip-embeddings

workflow:
	@echo "$(BLUE)Running hybrid workflow...$(NC)"
	docker compose --profile workflow up workflow

build-index:
	@echo "$(BLUE)Building FAISS index...$(NC)"
	docker compose --profile build-index up build-faiss

rebuild-index: build-index
	@echo "$(BLUE)Restarting API...$(NC)"
	docker compose restart api

# ============================================================================
# Development
# ============================================================================

api:
	@echo "$(BLUE)Starting API server...$(NC)"
	docker compose up -d postgres redis api
	@sleep 3
	@echo "$(GREEN)API available at: http://localhost:8000$(NC)"
	@echo "$(GREEN)API docs at: http://localhost:8000/docs$(NC)"

gradio:
	@echo "$(BLUE)Starting API + Gradio...$(NC)"
	docker compose --profile testing up -d api gradio-tester
	@sleep 3
	@echo "$(GREEN)API: http://localhost:8000$(NC)"
	@echo "$(GREEN)Gradio: http://localhost:7860$(NC)"

logs:
	docker compose logs -f api

logs-all:
	docker compose logs -f

status:
	@echo "$(BLUE)Container Status:$(NC)"
	@docker compose ps
	@echo ""
	@echo "$(BLUE)API Health:$(NC)"
	@curl -s http://localhost:8000/health | python3 -m json.tool || echo "API not available"

# ============================================================================
# Testing
# ============================================================================

test:
	@echo "$(BLUE)Running tests...$(NC)"
	docker compose exec api pytest tests/ -v

test-api:
	@echo "$(BLUE)Testing API endpoints...$(NC)"
	python etl/test_eshop_api.py

benchmark:
	@echo "$(BLUE)Running benchmark...$(NC)"
	docker compose exec api python test_eshop_api.py

# ============================================================================
# Database
# ============================================================================

db-shell:
	docker compose exec postgres psql -U app -d eshop

redis-cli:
	docker compose exec redis redis-cli

# ============================================================================
# Maintenance
# ============================================================================

clean:
	@echo "$(YELLOW)Removing containers and volumes...$(NC)"
	docker compose down -v

clean-data:
	@echo "$(YELLOW)Removing processed data...$(NC)"
	rm -rf etl/data/processed/*.npy
	rm -rf etl/data/processed/*.pkl
	rm -rf etl/data/faiss/*.faiss
	rm -rf etl/logs/*.log

clean-all: clean clean-data
	@echo "$(GREEN)Everything cleaned$(NC)"

prune:
	@echo "$(YELLOW)Pruning Docker resources...$(NC)"
	docker system prune -f

# ============================================================================
# Quick Start Guides
# ============================================================================

first-time:
	@echo "$(GREEN)First Time Setup$(NC)"
	@echo "This will run the complete pipeline..."
	@make build
	@make smart-run

dev:
	@echo "$(GREEN)Development Mode$(NC)"
	@make build
	@make api
	@make logs

production:
	@echo "$(GREEN)Production Deployment$(NC)"
	@make build
	@docker compose up -d

# ============================================================================
# Information
# ============================================================================

info:
	@echo "$(BLUE)System Information:$(NC)"
	@echo "Docker Version: $$(docker --version)"
	@echo "Docker Compose Version: $$(docker compose version)"
	@echo ""
	@echo "$(BLUE)Project Structure:$(NC)"
	@echo "  - ETL: etl/run_etl.py"
	@echo "  - CLIP: etl/clip_embedding_pipeline.py"
	@echo "  - Workflow: etl/workFLow.py"
	@echo "  - FAISS: etl/build_faiss_index.py"
	@echo "  - API: etl/faiss_api.py"
	@echo ""
	@make status

run: smart-run
start: api
stop: down
