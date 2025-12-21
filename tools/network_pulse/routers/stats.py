"""
API endpoints for Network Pulse dashboard data
"""
from fastapi import APIRouter, HTTPException
from typing import Optional

from tools.network_pulse.scheduler import get_cached_data, get_last_refresh, get_last_error
from tools.network_pulse.models import DashboardData, SystemStatus

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=DashboardData)
async def get_stats():
    """
    Get all dashboard statistics in one call.

    Returns complete dashboard data including:
    - Gateway health (CPU, RAM, uptime, WAN status)
    - Device counts
    - Current throughput
    - Bandwidth history (24 hours)
    - AP status list
    - Top clients by bandwidth
    - Network health by subsystem
    """
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(
            status_code=503,
            detail="Dashboard data not yet available. Please wait for initial refresh."
        )
    return cached


@router.get("/gateway")
async def get_gateway_stats():
    """Get just the gateway health statistics"""
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(status_code=503, detail="Data not available")
    return cached.gateway


@router.get("/bandwidth")
async def get_bandwidth_stats():
    """
    Get bandwidth data for charts.

    Returns:
    - current_tx_rate: Current upload rate (bytes/sec)
    - current_rx_rate: Current download rate (bytes/sec)
    - bandwidth_history: List of hourly data points
    """
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(status_code=503, detail="Data not available")
    return {
        "current_tx_rate": cached.current_tx_rate,
        "current_rx_rate": cached.current_rx_rate,
        "bandwidth_history": [p.model_dump() for p in cached.bandwidth_history]
    }


@router.get("/aps")
async def get_ap_stats():
    """Get access point status list"""
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(status_code=503, detail="Data not available")
    return {"access_points": [ap.model_dump() for ap in cached.access_points]}


@router.get("/clients")
async def get_top_clients():
    """Get top clients by bandwidth usage"""
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(status_code=503, detail="Data not available")
    return {"top_clients": [c.model_dump() for c in cached.top_clients]}


@router.get("/health")
async def get_network_health():
    """Get network health by subsystem"""
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(status_code=503, detail="Data not available")
    return cached.health.model_dump()


@router.get("/devices")
async def get_device_counts():
    """Get device counts summary"""
    cached = get_cached_data()
    if cached is None:
        raise HTTPException(status_code=503, detail="Data not available")
    return cached.devices.model_dump()
