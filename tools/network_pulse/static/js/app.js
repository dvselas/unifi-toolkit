/**
 * Network Pulse Dashboard - Alpine.js Application
 */

const API_BASE_PATH = '/pulse';

function networkPulse() {
    return {
        // State
        data: {
            gateway: {},
            wan: {},
            devices: {},
            current_tx_rate: 0,
            current_rx_rate: 0,
            access_points: [],
            top_clients: [],
            health: {},
            last_refresh: null,
            refresh_interval: 60
        },
        isLoading: true,
        isConnected: false,
        error: null,
        theme: 'dark',
        isFullscreen: false,

        // WebSocket
        ws: null,
        wsReconnectTimer: null,
        wsPingInterval: null,

        // State
        _initialized: false,

        /**
         * Initialize the dashboard
         */
        async init() {
            // Prevent double initialization
            if (this._initialized) {
                console.log('Dashboard already initialized, skipping');
                return;
            }
            this._initialized = true;

            console.log('Initializing Network Pulse dashboard');

            // Load theme from localStorage
            this.theme = localStorage.getItem('unifi-toolkit-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', this.theme);

            // Listen for fullscreen changes
            document.addEventListener('fullscreenchange', () => {
                this.isFullscreen = !!document.fullscreenElement;
            });

            // Load data
            await this.loadStats();

            // Connect WebSocket for real-time updates
            this.connectWebSocket();
        },

        /**
         * Load dashboard statistics from API
         */
        async loadStats() {
            try {
                const response = await fetch(`${API_BASE_PATH}/api/stats`);

                if (!response.ok) {
                    if (response.status === 503) {
                        this.error = 'Waiting for initial data refresh...';
                        this.isLoading = true;
                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                this.data = data;
                this.isConnected = true;
                this.isLoading = false;
                this.error = null;

            } catch (e) {
                console.error('Failed to load stats:', e);
                this.error = 'Failed to load dashboard data';
                this.isConnected = false;
            }
        },

        /**
         * Connect to WebSocket for real-time updates
         */
        connectWebSocket() {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                return;
            }

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}${API_BASE_PATH}/ws`;

            console.log('Connecting to WebSocket:', wsUrl);

            try {
                this.ws = new WebSocket(wsUrl);

                this.ws.onopen = () => {
                    console.log('WebSocket connected');
                    this.isConnected = true;

                    // Clear any reconnect timer
                    if (this.wsReconnectTimer) {
                        clearTimeout(this.wsReconnectTimer);
                        this.wsReconnectTimer = null;
                    }

                    // Start ping interval
                    this.wsPingInterval = setInterval(() => {
                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'ping' }));
                        }
                    }, 30000);
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);

                        if (message.type === 'stats_update' && message.data) {
                            console.log('Received stats update via WebSocket');
                            this.data = message.data;
                            this.isLoading = false;
                            this.error = null;
                        } else if (message.type === 'pong') {
                            // Pong received, connection is alive
                        }
                    } catch (e) {
                        console.error('Failed to parse WebSocket message:', e);
                    }
                };

                this.ws.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.isConnected = false;

                    // Clear ping interval
                    if (this.wsPingInterval) {
                        clearInterval(this.wsPingInterval);
                        this.wsPingInterval = null;
                    }

                    // Reconnect after delay
                    this.wsReconnectTimer = setTimeout(() => {
                        console.log('Attempting WebSocket reconnection...');
                        this.connectWebSocket();
                    }, 5000);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };

            } catch (e) {
                console.error('Failed to create WebSocket:', e);
                // Retry connection
                this.wsReconnectTimer = setTimeout(() => {
                    this.connectWebSocket();
                }, 5000);
            }
        },

        /**
         * Toggle dark/light theme
         */
        toggleTheme() {
            this.theme = this.theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', this.theme);
            localStorage.setItem('unifi-toolkit-theme', this.theme);
        },

        /**
         * Toggle fullscreen mode
         */
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(e => {
                    console.error('Fullscreen request failed:', e);
                });
            } else {
                document.exitFullscreen();
            }
        },

        /**
         * Format bytes to human-readable string
         */
        formatBytes(bytes) {
            if (bytes === null || bytes === undefined) return '0 B';
            if (bytes === 0) return '0 B';

            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            const value = bytes / Math.pow(1024, i);

            return value.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
        },

        /**
         * Format bandwidth rate (bytes/sec) to human-readable string
         */
        formatBandwidth(bytesPerSec) {
            if (bytesPerSec === null || bytesPerSec === undefined) return '0 bps';
            if (bytesPerSec === 0) return '0 bps';

            // Convert to bits per second
            const bitsPerSec = bytesPerSec * 8;

            const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
            const i = Math.floor(Math.log(bitsPerSec) / Math.log(1000));
            const value = bitsPerSec / Math.pow(1000, i);

            return value.toFixed(1) + ' ' + units[Math.min(i, units.length - 1)];
        },

        /**
         * Format percentage
         */
        formatPercent(value) {
            if (value === null || value === undefined) return 'N/A';
            return value.toFixed(1) + '%';
        },

        /**
         * Format timestamp to local time
         */
        formatTime(timestamp) {
            if (!timestamp) return 'Never';

            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        },

        /**
         * Get status emoji based on status string
         */
        getStatusEmoji(status) {
            switch (status) {
                case 'ok': return '🟢';
                case 'warning': return '🟡';
                case 'error': return '🔴';
                default: return '⚪';
            }
        }
    };
}
