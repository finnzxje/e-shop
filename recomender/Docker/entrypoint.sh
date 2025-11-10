#!/bin/bash
# ============================================================================
# Smart Docker Entrypoint
# Checks data before running each pipeline stage
# ============================================================================

set -e

# ============================================================================
# Configuration
# ============================================================================

DATA_DIR="./data"
PROCESSED_DIR="${DATA_DIR}/processed"
FAISS_DIR="${DATA_DIR}/faiss"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo "[INFO] $1"
}

log_success() {
    echo "[SUCCESS] $1"
}

log_skip() {
    echo "[SKIP] $1"
}

log_error() {
    echo "[ERROR] $1"
}

# ============================================================================
# Data Check Functions
# ============================================================================

check_file_exists() {
    local file=$1
    [ -f "$file" ] && [ -s "$file" ]
}

check_etl_complete() {
    check_file_exists "${PROCESSED_DIR}/item_features.csv"
}

check_clip_complete() {
    check_file_exists "${PROCESSED_DIR}/clip_item_embeddings.npy" && \
    check_file_exists "${PROCESSED_DIR}/variant_ids.npy"
}

check_workflow_complete() {
    check_file_exists "${PROCESSED_DIR}/hybrid_embeddings.npy" && \
    check_file_exists "${PROCESSED_DIR}/hybrid_variant_ids.npy"
}

check_faiss_complete() {
    ls "${FAISS_DIR}"/*.faiss 1> /dev/null 2>&1
}

# ============================================================================
# Stage Execution with Checks
# ============================================================================

run_etl_stage() {
    log_info "ETL Stage - Checking data..."
    
    if check_etl_complete; then
        log_skip "ETL data already exists - skipping ETL"
        return 0
    fi
    
    log_info "Running ETL pipeline..."
    python run_etl.py "$@"
    
    if check_etl_complete; then
        log_success "ETL completed"
        return 0
    else
        log_error "ETL failed to produce expected data"
        return 1
    fi
}

run_clip_stage() {
    log_info "CLIP Stage - Checking data..."
    
    # Check if ETL data exists first
    if ! check_etl_complete; then
        log_error "ETL data not found - run ETL first"
        return 1
    fi
    
    if check_clip_complete; then
        log_skip "CLIP embeddings already exist - skipping"
        return 0
    fi
    
    log_info "Generating CLIP embeddings..."
    python clip_embedding_pipeline.py
    
    if check_clip_complete; then
        log_success "CLIP embeddings generated"
        return 0
    else
        log_error "CLIP failed to produce expected embeddings"
        return 1
    fi
}

run_workflow_stage() {
    log_info "Workflow Stage - Checking data..."
    
    # Check if CLIP embeddings exist first
    if ! check_clip_complete; then
        log_error "CLIP embeddings not found - run CLIP first"
        return 1
    fi
    
    if check_workflow_complete; then
        log_skip "Hybrid embeddings already exist - skipping"
        return 0
    fi
    
    log_info "Running hybrid workflow..."
    python workFLow.py
    
    if check_workflow_complete; then
        log_success "Hybrid workflow completed"
        return 0
    else
        log_error "Workflow failed to produce expected embeddings"
        return 1
    fi
}

run_faiss_stage() {
    log_info "FAISS Stage - Checking data..."
    
    # Check if hybrid embeddings exist first
    if ! check_workflow_complete; then
        log_error "Hybrid embeddings not found - run workflow first"
        return 1
    fi
    
    if check_faiss_complete; then
        log_skip "FAISS index already exists - skipping"
        return 0
    fi
    
    log_info "Building FAISS index..."
    python build_faiss_index.py --index-type flat --benchmark
    
    if check_faiss_complete; then
        log_success "FAISS index built"
        return 0
    else
        log_error "FAISS failed to build index"
        return 1
    fi
}

# ============================================================================
# Main Logic
# ============================================================================

COMMAND="${1:-auto}"

case "$COMMAND" in
    # Individual stages with smart checking
    etl)
        run_etl_stage "${@:2}"
        ;;
    
    clip)
        run_clip_stage
        ;;
    
    workflow)
        run_workflow_stage
        ;;
    
    build-faiss)
        run_faiss_stage
        ;;
    
    # Smart auto-run
    auto)
        log_info "==================================="
        log_info "Smart Pipeline - Auto Mode"
        log_info "==================================="
        
        run_etl_stage || exit 1
        run_clip_stage || exit 1
        run_workflow_stage || exit 1
        run_faiss_stage || exit 1
        
        log_success "All stages completed!"
        ;;
    
    # Force modes (skip checks)
    force-etl)
        log_info "Force running ETL..."
        python run_etl.py "${@:2}"
        ;;
    
    force-clip)
        log_info "Force running CLIP..."
        python clip_embedding_pipeline.py
        ;;
    
    force-workflow)
        log_info "Force running workflow..."
        python workFLow.py
        ;;
    
    force-faiss)
        log_info "Force building FAISS..."
        python build_faiss_index.py --index-type flat --benchmark
        ;;
    
    # API mode
    api)
        log_info "Starting API server..."
        
        # Check if all data is ready
        if ! check_faiss_complete; then
            log_error "FAISS index not found - run pipeline first"
            exit 1
        fi
        
        exec uvicorn faiss_api:eshop --host 0.0.0.0 --port 8000 "${@:2}"
        ;;
    
    # Check data status
    check)
        log_info "Checking pipeline data status..."
        python check_data.py --stage all
        ;;
    
    # Pass through to Python
    python)
        exec python "${@:2}"
        ;;
    
    # Pass through to bash
    bash|sh)
        exec /bin/bash "${@:2}"
        ;;
    
    # Default: execute command as-is
    *)
        exec "$@"
        ;;
esac