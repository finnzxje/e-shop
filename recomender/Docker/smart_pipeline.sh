#!/bin/bash

# ============================================================================
# Smart E-Shop Pipeline - Skip completed steps
# ============================================================================
# Checks if data exists before running each step
# Only runs what's needed!
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# Configuration
# ============================================================================

DATA_PROCESSED_DIR="./etl/data/processed"
DATA_FAISS_DIR="./etl/data/faiss"
DATA_RAW_DIR="./etl/data/raw"

# Required files for each stage
ITEM_FEATURES_FILE="${DATA_PROCESSED_DIR}/item_features.csv"
CLIP_EMBEDDINGS_FILE="${DATA_PROCESSED_DIR}/clip_item_embeddings.npy"
VARIANT_IDS_FILE="${DATA_PROCESSED_DIR}/variant_ids.npy"
HYBRID_EMBEDDINGS_FILE="${DATA_PROCESSED_DIR}/hybrid_embeddings.npy"
HYBRID_VARIANT_IDS_FILE="${DATA_PROCESSED_DIR}/hybrid_variant_ids.npy"
FAISS_INDEX_FILE="${DATA_FAISS_DIR}/hybrid_flat.faiss"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_skip() {
    echo -e "${CYAN}[SKIP]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo -e "${GREEN}"
    echo "============================================================================"
    echo "  Smart E-Shop Recommendation Pipeline"
    echo "  Automatically skips completed steps"
    echo "============================================================================"
    echo -e "${NC}"
}

# ============================================================================
# Data Check Functions
# ============================================================================

check_file_exists() {
    local file=$1
    local name=$2
    
    if [ -f "$file" ]; then
        local size=$(du -h "$file" | cut -f1)
        log_success "$name exists (${size})"
        return 0
    else
        log_warning "$name not found: $file"
        return 1
    fi
}

check_directory_not_empty() {
    local dir=$1
    local name=$2
    
    if [ -d "$dir" ] && [ "$(ls -A $dir)" ]; then
        local count=$(ls -1 $dir | wc -l)
        log_success "$name exists ($count files)"
        return 0
    else
        log_warning "$name is empty or not found: $dir"
        return 1
    fi
}

# ============================================================================
# Stage Check Functions
# ============================================================================

check_etl_complete() {
    log_info "Checking ETL data..."
    
    local all_exist=true
    
    # Check item_features.csv
    if ! check_file_exists "$ITEM_FEATURES_FILE" "item_features.csv"; then
        all_exist=false
    fi
    
    # Check interactions.csv (optional but good to have)
    if [ -f "${DATA_PROCESSED_DIR}/interactions.csv" ]; then
        log_success "interactions.csv exists"
    fi
    
    # Check if images downloaded
    if check_directory_not_empty "${DATA_RAW_DIR}/downloads" "Product images"; then
        :
    else
        log_warning "No product images found (optional)"
    fi
    
    if [ "$all_exist" = true ]; then
        log_success "ETL data is complete"
        return 0
    else
        log_warning "ETL data is incomplete"
        return 1
    fi
}

check_clip_complete() {
    log_info "Checking CLIP embeddings..."
    
    if check_file_exists "$CLIP_EMBEDDINGS_FILE" "CLIP embeddings" && \
       check_file_exists "$VARIANT_IDS_FILE" "Variant IDs"; then
        log_success "CLIP embeddings are complete"
        return 0
    else
        log_warning "CLIP embeddings are incomplete"
        return 1
    fi
}

check_workflow_complete() {
    log_info "Checking hybrid embeddings..."
    
    if check_file_exists "$HYBRID_EMBEDDINGS_FILE" "Hybrid embeddings" && \
       check_file_exists "$HYBRID_VARIANT_IDS_FILE" "Hybrid variant IDs"; then
        log_success "Hybrid embeddings are complete"
        return 0
    else
        log_warning "Hybrid embeddings are incomplete"
        return 1
    fi
}

check_faiss_complete() {
    log_info "Checking FAISS index..."
    
    if check_file_exists "$FAISS_INDEX_FILE" "FAISS index"; then
        # Also check for mappings file
        local mappings_file="${FAISS_INDEX_FILE%.faiss}_mappings.pkl"
        if [ -f "$mappings_file" ]; then
            log_success "FAISS index is complete"
            return 0
        fi
    fi
    
    log_warning "FAISS index is incomplete"
    return 1
}

# ============================================================================
# Pipeline Status Report
# ============================================================================

show_pipeline_status() {
    echo ""
    echo -e "${CYAN}============================================================================${NC}"
    echo -e "${CYAN}Pipeline Status Report${NC}"
    echo -e "${CYAN}============================================================================${NC}"
    
    echo ""
    echo -e "${BLUE}Stage 1: ETL Pipeline${NC}"
    if check_etl_complete > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}✓ COMPLETE${NC}"
        ETL_STATUS="complete"
    else
        echo -e "  Status: ${YELLOW}⚠ INCOMPLETE${NC}"
        ETL_STATUS="incomplete"
    fi
    
    echo ""
    echo -e "${BLUE}Stage 2: CLIP Embeddings${NC}"
    if check_clip_complete > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}✓ COMPLETE${NC}"
        CLIP_STATUS="complete"
    else
        echo -e "  Status: ${YELLOW}⚠ INCOMPLETE${NC}"
        CLIP_STATUS="incomplete"
    fi
    
    echo ""
    echo -e "${BLUE}Stage 3: Hybrid Workflow${NC}"
    if check_workflow_complete > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}✓ COMPLETE${NC}"
        WORKFLOW_STATUS="complete"
    else
        echo -e "  Status: ${YELLOW}⚠ INCOMPLETE${NC}"
        WORKFLOW_STATUS="incomplete"
    fi
    
    echo ""
    echo -e "${BLUE}Stage 4: FAISS Index${NC}"
    if check_faiss_complete > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}✓ COMPLETE${NC}"
        FAISS_STATUS="complete"
    else
        echo -e "  Status: ${YELLOW}⚠ INCOMPLETE${NC}"
        FAISS_STATUS="incomplete"
    fi
    
    echo ""
    echo -e "${CYAN}============================================================================${NC}"
}

# ============================================================================
# Stage Execution Functions
# ============================================================================

run_etl() {
    echo ""
    log_info "Stage 1/4: Running ETL Pipeline..."
    echo ""
    
    docker compose --profile etl up etl
    
    if [ $? -eq 0 ]; then
        log_success "ETL completed"
        return 0
    else
        log_error "ETL failed"
        return 1
    fi
}

run_clip() {
    echo ""
    log_info "Stage 2/4: Generating CLIP Embeddings..."
    echo ""
    
    docker compose --profile clip up clip-embeddings
    
    if [ $? -eq 0 ]; then
        log_success "CLIP embeddings generated"
        return 0
    else
        log_error "CLIP embedding generation failed"
        return 1
    fi
}

run_workflow() {
    echo ""
    log_info "Stage 3/4: Running Hybrid Workflow..."
    echo ""
    
    docker compose --profile workflow up workflow
    
    if [ $? -eq 0 ]; then
        log_success "Hybrid workflow completed"
        return 0
    else
        log_error "Hybrid workflow failed"
        return 1
    fi
}

run_build_faiss() {
    echo ""
    log_info "Stage 4/4: Building FAISS Index..."
    echo ""
    
    docker compose --profile build-index up build-faiss
    
    if [ $? -eq 0 ]; then
        log_success "FAISS index built"
        return 0
    else
        log_error "FAISS index building failed"
        return 1
    fi
}

# ============================================================================
# Smart Pipeline Execution
# ============================================================================

run_smart_pipeline() {
    print_banner
    
    # Show current status
    show_pipeline_status
    
    echo ""
    echo -e "${BLUE}Starting smart pipeline execution...${NC}"
    echo ""
    
    # Track what we need to run
    local need_etl=false
    local need_clip=false
    local need_workflow=false
    local need_faiss=false
    
    # Determine what needs to run
    if [ "$ETL_STATUS" = "incomplete" ]; then
        need_etl=true
        need_clip=true
        need_workflow=true
        need_faiss=true
    elif [ "$CLIP_STATUS" = "incomplete" ]; then
        need_clip=true
        need_workflow=true
        need_faiss=true
    elif [ "$WORKFLOW_STATUS" = "incomplete" ]; then
        need_workflow=true
        need_faiss=true
    elif [ "$FAISS_STATUS" = "incomplete" ]; then
        need_faiss=true
    else
        log_success "All stages are complete! Pipeline is ready."
        echo ""
        log_info "Starting API server..."
        docker compose up -d api
        log_success "API is running at http://localhost:8000"
        return 0
    fi
    
    # Start infrastructure if not running
    log_info "Ensuring infrastructure is running..."
    docker compose up -d postgres redis
    sleep 5
    
    # Run required stages
    if [ "$need_etl" = true ]; then
        run_etl || exit 1
    else
        log_skip "ETL - data already exists"
    fi
    
    if [ "$need_clip" = true ]; then
        run_clip || exit 1
    else
        log_skip "CLIP embeddings - already exist"
    fi
    
    if [ "$need_workflow" = true ]; then
        run_workflow || exit 1
    else
        log_skip "Hybrid workflow - already complete"
    fi
    
    if [ "$need_faiss" = true ]; then
        run_build_faiss || exit 1
    else
        log_skip "FAISS index - already built"
    fi
    
    # Start API
    echo ""
    log_info "Starting API server..."
    docker compose up -d api
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}"
        echo "============================================================================"
        echo "  ✓ PIPELINE COMPLETED SUCCESSFULLY!"
        echo "============================================================================"
        echo -e "${NC}"
        echo ""
        echo "Services running:"
        echo "  - API:           ${GREEN}http://localhost:8000${NC}"
        echo "  - API Docs:      ${GREEN}http://localhost:8000/docs${NC}"
        echo "  - Health Check:  ${GREEN}http://localhost:8000/health${NC}"
        echo ""
        echo "Commands:"
        echo "  View logs:       ${CYAN}docker compose logs -f api${NC}"
        echo "  Test UI:         ${CYAN}make gradio${NC}"
        echo "  Stop services:   ${CYAN}docker compose down${NC}"
        echo ""
    else
        log_error "Failed to start API"
        exit 1
    fi
}

# ============================================================================
# Force Re-run Functions
# ============================================================================

force_etl() {
    log_warning "Forcing ETL re-run..."
    rm -f "$ITEM_FEATURES_FILE"
    run_etl
}

force_clip() {
    log_warning "Forcing CLIP re-run..."
    rm -f "$CLIP_EMBEDDINGS_FILE" "$VARIANT_IDS_FILE"
    run_clip
}

force_workflow() {
    log_warning "Forcing Workflow re-run..."
    rm -f "$HYBRID_EMBEDDINGS_FILE" "$HYBRID_VARIANT_IDS_FILE"
    run_workflow
}

force_faiss() {
    log_warning "Forcing FAISS rebuild..."
    rm -f "$FAISS_INDEX_FILE"
    run_build_faiss
}

force_all() {
    log_warning "Forcing complete pipeline re-run..."
    rm -f "$ITEM_FEATURES_FILE"
    rm -f "$CLIP_EMBEDDINGS_FILE" "$VARIANT_IDS_FILE"
    rm -f "$HYBRID_EMBEDDINGS_FILE" "$HYBRID_VARIANT_IDS_FILE"
    rm -f "$FAISS_INDEX_FILE"
    run_smart_pipeline
}

# ============================================================================
# CLI Commands
# ============================================================================

show_help() {
    echo "Smart E-Shop Pipeline"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  auto (default)    Run smart pipeline (skip completed steps)"
    echo "  status            Show pipeline status"
    echo "  force-etl         Force re-run ETL"
    echo "  force-clip        Force re-run CLIP embeddings"
    echo "  force-workflow    Force re-run hybrid workflow"
    echo "  force-faiss       Force rebuild FAISS index"
    echo "  force-all         Force complete re-run"
    echo "  api               Start API only"
    echo "  clean-cache       Clean cache files only"
    echo "  clean-all         Clean all generated data"
    echo "  help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                # Auto-run (recommended)"
    echo "  $0 status         # Check what's done"
    echo "  $0 force-faiss    # Rebuild index only"
}

# ============================================================================
# Main Entry Point
# ============================================================================

case "${1:-auto}" in
    auto)
        run_smart_pipeline
        ;;
    
    status)
        show_pipeline_status
        echo ""
        ;;
    
    force-etl)
        force_etl
        ;;
    
    force-clip)
        force_clip
        ;;
    
    force-workflow)
        force_workflow
        ;;
    
    force-faiss)
        force_faiss
        ;;
    
    force-all)
        force_all
        ;;
    
    api)
        log_info "Starting API only..."
        docker compose up -d postgres redis api
        log_success "API started at http://localhost:8000"
        ;;
    
    clean-cache)
        log_warning "Cleaning cache files..."
        rm -f "${DATA_FAISS_DIR}"/*.faiss
        log_success "Cache cleaned"
        ;;
    
    clean-all)
        log_warning "This will remove all generated data!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "${DATA_PROCESSED_DIR}"/*
            rm -rf "${DATA_FAISS_DIR}"/*
            log_success "All data cleaned"
        fi
        ;;
    
    help|--help|-h)
        show_help
        ;;
    
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac