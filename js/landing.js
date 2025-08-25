// Landing page JavaScript
class LandingPage {
    constructor() {
        this.routeData = {};
        this.svg = document.querySelector('.route-svg');
        this.loadingIndicator = document.getElementById('loading');
        this.totalDistanceElement = document.getElementById('total-distance');
        this.totalElevationElement = document.getElementById('total-elevation');
        this.currentBounds = null;
        this.currentPoints = null;
        
        // Map configuration - fixed center
        this.mapCenter = { lat: 45.941112, lon: 6.2080575 };
        
        // Bind resize handler
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);
        
        this.init();
    }
    
    async init() {
        try {
            this.showLoading();
            await this.loadRouteData();
            // this.debugRouteData(); // Add debug logging
            this.createRoutePaths();
            // this.updateStats();
            
            // Wait for background to load before animating
            console.log('Waiting for background to load before animation...');
            await this.waitForBackgroundLoad();
            console.log('Background loaded, starting animation');
            
            this.hideLoading();
            this.animateRoutes();
        } catch (error) {
            console.error('Error initializing landing page:', error);
            this.hideLoading();
        }
    }
    
    showLoading() {
        this.loadingIndicator.classList.add('show');
    }
    
    hideLoading() {
        this.loadingIndicator.classList.remove('show');
    }
    
    async loadRouteData() {
        try {
            // Load combined route data
            const combinedData = await fetch('data/route-combined.json').then(response => response.json());
            
            this.routeData = {
                combined: combinedData
            };
        } catch (error) {
            console.warn('Could not load combined route data, using fallback:', error);
            // Fallback data if needed
        }
    }
    
    createRoutePaths() {
        // Use combined route data
        // console.log('Route data structure:', this.routeData);
        
        if (!this.routeData.combined || !this.routeData.combined.points) {
            console.error('No combined route data found!');
            return;
        }
        
        const allPoints = this.routeData.combined.points;
        // console.log('All points:', allPoints);
        
        if (allPoints.length === 0) {
            console.error('No points in combined route!');
            return;
        }
        
        // Calculate bounds for scaling
        const routeBounds = this.calculateBounds(allPoints);
        const viewBox = this.calculateViewBox();
        
        // console.log('ViewBox:', viewBox);
        
        // Store current bounds and points for resize handling
        this.currentBounds = routeBounds;
        this.currentPoints = allPoints;
        
        // Clear any existing paths from the SVG
        const existingPaths = this.svg.querySelectorAll('.route-path');
        existingPaths.forEach(path => path.remove());
        // console.log('Cleared existing paths:', existingPaths.length);
        
        // Update SVG viewBox
        this.svg.setAttribute('viewBox', viewBox);
        
        // Debug route bounds
        // console.log('Route bounds:', routeBounds);
        
        // Debug route data
        
        // console.log('Combined route points:', allPoints.length);
        // console.log('Total distance:', this.routeData.combined.total_distance);
        // console.log('First point:', allPoints[0]);
        // console.log('Last point:', allPoints[allPoints.length - 1]);
        
        // Calculate optimal bounds based on route and window
        const optimalBounds = this.calculateOptimalBounds(routeBounds);
        
        // Load Mapbox background with optimal bounds
        this.loadMapboxBackground(optimalBounds);
        
        // Create single combined path using optimal bounds
        this.createCombinedPath(allPoints, optimalBounds);
    }
    
    calculateBounds(points) {
        // console.log('Calculating bounds for points:', points.length);
        // console.log('First few points:', points.slice(0, 3));
        
        const lats = points.map(p => p.lat);
        const lons = points.map(p => p.lon);
        
        // console.log('Latitudes:', lats.slice(0, 5));
        // console.log('Longitudes:', lons.slice(0, 5));
        
        const bounds = {
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats),
            minLon: Math.min(...lons),
            maxLon: Math.max(...lons)
        };
        
        // console.log('Route bounds:', bounds);
        // console.log('Map should cover:', {
            // topLeft: [bounds.maxLat, bounds.minLon],     // Top-left corner
            // topRight: [bounds.maxLat, bounds.maxLon],    // Top-right corner
            // bottomLeft: [bounds.minLat, bounds.minLon],  // Bottom-left corner
            // bottomRight: [bounds.minLat, bounds.maxLon]  // Bottom-right corner
        // });
        
        return bounds;
    }
    
    calculateOptimalBounds(routeBounds) {
        // 1) Fixed center
        const centerLat = this.mapCenter.lat;
        const centerLon = this.mapCenter.lon;
        
        // 2) Route bounding box
        const routeLatSpan = routeBounds.maxLat - routeBounds.minLat;
        const routeLonSpan = routeBounds.maxLon - routeBounds.minLon;
        
        // 3) Get window extent
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // 4) Fit route width to window width with padding
        const padding = 0.2; // 20% padding on each side
        const targetLonSpan = routeLonSpan * (1 + 0.5 * padding);
        const targetLatSpan = routeLatSpan * (1 + 0.5 * padding);
        
        // Calculate the corresponding lat span to maintain aspect ratio
        // const aspectRatio = windowWidth / windowHeight;
        // const targetLatSpan = targetLonSpan / aspectRatio;
        
        // 5) Calculate bounds centered on our fixed center
        const bounds = {
            minLat: centerLat - targetLatSpan / 2,
            maxLat: centerLat + targetLatSpan / 2,
            minLon: centerLon - targetLonSpan / 2,
            maxLon: centerLon + targetLonSpan / 2
        };
        
        // console.log('Optimal bounds calculation:', {
            // center: { lat: centerLat, lon: centerLon },
            // routeSpan: { lat: routeLatSpan, lon: routeLonSpan },
            // windowSize: { width: windowWidth, height: windowHeight },
            // targetSpan: { lat: targetLatSpan, lon: targetLonSpan },
            // finalBounds: bounds
        // });
        
        return bounds;
    }
    
    calculateOptimalMapConfig(routeBounds) {
        // Calculate center of the route
        const centerLat = (routeBounds.minLat + routeBounds.maxLat) / 2;
        const centerLon = (routeBounds.minLon + routeBounds.maxLon) / 2;
        
        // Calculate the span of the route
        const latSpan = routeBounds.maxLat - routeBounds.minLat;
        const lonSpan = routeBounds.maxLon - routeBounds.minLon;
        const maxSpan = Math.max(latSpan, lonSpan);
        
        // Add some padding (20% on each side)
        const paddedSpan = maxSpan * 1.4;
        
        // Calculate zoom level based on the span
        // At zoom level z, one pixel represents approximately 156543.03392 * cos(lat) / 2^z meters
        // We want the route to take up about 80% of the image width/height
        const metersPerDegree = 111320; // Approximate meters per degree
        const routeMeters = paddedSpan * metersPerDegree;
        
        // Get current window dimensions to determine image size
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const aspectRatio = windowWidth / windowHeight;
        
        let width, height;
        if (aspectRatio > 2) {
            height = 500;
            width = height * aspectRatio;
        } else {
            width = 1000;
            height = width / aspectRatio;
        }
        width = Math.max(Math.round(width), 800);
        height = Math.max(Math.round(height), 400);
        
        // Calculate zoom level so the route fits nicely in the image
        const targetPixels = Math.min(width, height) * 0.8; // Use 80% of the smaller dimension
        const metersPerPixel = routeMeters / targetPixels;
        const zoom = Math.log2(156543.03392 * Math.cos(centerLat * Math.PI / 180) / metersPerPixel);
        
        // Set the optimal configuration
        this.mapCenter = { lat: centerLat, lon: centerLon };
        this.mapZoom = Math.max(8, Math.min(18, zoom)); // Clamp between zoom 8-18
        
        // console.log('Optimal map configuration:', {
            // center: this.mapCenter,
            // zoom: this.mapZoom,
            // routeSpan: { lat: latSpan, lon: lonSpan, max: maxSpan },
            // paddedSpan: paddedSpan,
            // targetPixels: targetPixels,
            // calculatedZoom: zoom
        // });
    }
    
    calculateViewBox() {
        // Use window dimensions directly to match Mapbox image
        const width = Math.round(window.innerWidth);
        const height = Math.round(window.innerHeight);
        
        // console.log(`ViewBox: 0 0 ${width} ${height} (matches window and Mapbox image)`);
        
        return `0 0 ${width} ${height}`;
    }
    
    getMapboxUrl(bounds) {
        // Mapbox static image API
        const accessToken = 'pk.eyJ1IjoiYXN0cm9meXoiLCJhIjoiY2xtMWF4MTBxMzByMTNxcGkwc2cycDlhMSJ9.0o3QKpA4eMmFsX2pfk-Idw';
        
        // Get current window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Use window dimensions directly for image size
        const width = Math.round(windowWidth);
        const height = Math.round(windowHeight);
        
        // Use bounding box format: [minLon,minLat,maxLon,maxLat]
        const bbox = `${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}`;
        const mapUrl = `https://api.mapbox.com/styles/v1/astrofyz/cmeaghtkp00c401sdc39r9mq8/static/[${bbox}]/${width}x${height}@2x?access_token=${accessToken}`;
        
        // console.log('Mapbox URL:', mapUrl);
        // console.log('Bounds:', bounds);
        // console.log('Image dimensions:', { width, height });
        // console.log('Window dimensions:', { width: windowWidth, height: windowHeight });
        
        return mapUrl;
    }
    

    
    loadMapboxBackground(bounds) {
        const mapUrl = this.getMapboxUrl(bounds);
        console.log('Loading Mapbox background:', mapUrl);
        
        // Find the background image element
        const backgroundImage = document.querySelector('.background-image img');
        if (backgroundImage) {
            backgroundImage.src = mapUrl;
            backgroundImage.onerror = () => {
                console.error('Failed to load Mapbox background');
                // Fallback to dummy image
                backgroundImage.src = 'assets/images/dummy_front_map_bg.png';
            };
        }
    }
    
    waitForBackgroundLoad() {
        return new Promise((resolve) => {
            const backgroundImage = document.querySelector('.background-image img');
            if (!backgroundImage) {
                console.log('No background image found, proceeding');
                resolve();
                return;
            }
            
            // Check if already loaded
            if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
                console.log('Background already loaded');
                resolve();
                return;
            }
            
            // Check if src is set (loading started)
            if (!backgroundImage.src || backgroundImage.src === '') {
                console.log('Background image src not set yet, waiting...');
                // Wait a bit and check again
                setTimeout(() => {
                    this.waitForBackgroundLoad().then(resolve);
                }, 100);
                return;
            }
            
            console.log('Waiting for background image to load...');
            backgroundImage.onload = () => {
                console.log('Background loaded successfully, ready to animate');
                resolve();
            };
            backgroundImage.onerror = () => {
                console.log('Background failed to load, proceeding anyway');
                resolve();
            };
        });
    }
    
    createCombinedPath(points, bounds) {
        if (points.length === 0) return;
        
        // console.log(`Creating combined path with ${points.length} points`);
        // console.log('Bounds:', bounds);
        
        // Check if D3 is available
        if (typeof d3 === 'undefined') {
            console.error('D3 is not available, falling back to manual coordinate conversion');
            this.createCombinedPathManual(points, bounds);
            return;
        }
        
        // Convert points to GeoJSON format for D3
        const coordinates = points.map(point => [point.lon, point.lat]);
        
        const geoJsonFeature = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: coordinates
            },
            properties: {}
        };
        
        // Use the Mapbox bounds directly (not route bounds)
        // This ensures the route coordinates are mapped to the same coordinate system as the Mapbox image
        const mapboxBounds = {
            minLat: bounds.minLat,
            maxLat: bounds.maxLat,
            minLon: bounds.minLon,
            maxLon: bounds.maxLon
        };
        
        // Create a bounding box feature for D3 to fit using Mapbox bounds
        const boundingBox = {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [mapboxBounds.minLon, mapboxBounds.minLat],
                    [mapboxBounds.maxLon, mapboxBounds.minLat],
                    [mapboxBounds.maxLon, mapboxBounds.maxLat],
                    [mapboxBounds.minLon, mapboxBounds.maxLat],
                    [mapboxBounds.minLon, mapboxBounds.minLat]
                ]]
            },
            properties: {}
        };
        
        // Get current viewBox dimensions
        const viewBox = this.svg.getAttribute('viewBox');
        const [, , width, height] = viewBox.split(' ').map(Number);
        
        // Create D3 projection that matches the Mapbox image exactly
        // Use Web Mercator projection (same as Mapbox) with proper scaling
        const projection = d3.geoMercator()
            .fitSize([window.innerWidth, window.innerHeight], boundingBox);
        // Create D3 path generator
        const pathGenerator = d3.geoPath().projection(projection);
        
        // Generate the SVG path data
        const pathData = pathGenerator(geoJsonFeature);
        
        // console.log('Generated path data:', pathData);
        // console.log('GeoJSON coordinates range:', {
            // lons: coordinates.map(c => c[0]).slice(0, 5),
            // lats: coordinates.map(c => c[1]).slice(0, 5)
        // });
        // console.log('Using Web Mercator projection with Mapbox bounds:', mapboxBounds);
        // console.log('ViewBox dimensions:', { width, height });
        
        // Create SVG path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'route-path route-path-combined');
        
        this.svg.appendChild(path);
        
        // Get the actual path length and set stroke-dasharray/offset
        const pathLength = path.getTotalLength();
        path.setAttribute('stroke-dasharray', pathLength);
        path.setAttribute('stroke-dashoffset', pathLength);
        
        // console.log('Added combined path to SVG, length:', pathLength);
        
        // Store reference for animation
        this.combinedPath = path;
    }
    
    createCombinedPathManual(points, bounds) {
        // Fallback method using manual coordinate conversion
        console.log('Using manual coordinate conversion');
        
        // Convert coordinates to SVG coordinates
        const svgPoints = points.map(point => {
            const x = this.lonToX(point.lon, bounds);
            const y = this.latToY(point.lat, bounds);
            return `${x},${y}`;
        });
        
        // Create path data
        const pathData = `M ${svgPoints.join(' L ')}`;
        
        // Create SVG path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'route-path route-path-combined');
        
        this.svg.appendChild(path);
        
        // Get the actual path length and set stroke-dasharray/offset
        const pathLength = path.getTotalLength();
        path.setAttribute('stroke-dasharray', pathLength);
        path.setAttribute('stroke-dashoffset', pathLength);
        
        console.log('Added combined path to SVG (manual), length:', pathLength);
        
        // Store reference for animation
        this.combinedPath = path;
    }
    
    handleResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            console.log('Window resized, updating route display');
            
            if (this.currentPoints && this.currentBounds) {
                // Recalculate optimal bounds for new window size
                const newOptimalBounds = this.calculateOptimalBounds(this.currentBounds);
                
                // Reload background with new bounds
                this.loadMapboxBackground(newOptimalBounds);
                
                // Update viewBox to match new window size
                const newViewBox = this.calculateViewBox();
                this.svg.setAttribute('viewBox', newViewBox);
                
                // Clear existing paths
                const existingPaths = this.svg.querySelectorAll('.route-path');
                existingPaths.forEach(path => path.remove());
                
                // Recreate path with new bounds
                this.createCombinedPath(this.currentPoints, newOptimalBounds);
                
                // Re-animate the route after recreation
                setTimeout(() => {
                    this.animateRoutes();
                }, 100); // Small delay to ensure path is created
            }
        }, 250); // 250ms debounce
    }
    
    destroy() {
        // Cleanup event listeners
        window.removeEventListener('resize', this.handleResize);
        clearTimeout(this.resizeTimeout);
    }
    
    lonToX(lon, bounds) {
        // Get current viewBox dimensions
        const viewBox = this.svg.getAttribute('viewBox');
        const [, , width, height] = viewBox.split(' ').map(Number);
        
        // Web Mercator projection for longitude (linear)
        const geoWidth = bounds.maxLon - bounds.minLon;
        const scale = width / geoWidth;
        const x = (lon - bounds.minLon) * scale;
        
        return x;
    }
    
    latToY(lat, bounds) {
        // Get current viewBox dimensions
        const viewBox = this.svg.getAttribute('viewBox');
        const [, , width, height] = viewBox.split(' ').map(Number);
        
        // Web Mercator projection for latitude (non-linear)
        // Convert latitude to Web Mercator Y coordinate
        const latRad = lat * Math.PI / 180;
        const mercatorY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
        
        // Convert bounds to Web Mercator
        const minLatRad = bounds.minLat * Math.PI / 180;
        const maxLatRad = bounds.maxLat * Math.PI / 180;
        const minMercatorY = Math.log(Math.tan(Math.PI / 4 + minLatRad / 2));
        const maxMercatorY = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));
        
        // Scale to viewBox height
        const mercatorHeight = maxMercatorY - minMercatorY;
        const scale = height / mercatorHeight;
        const y = (maxMercatorY - mercatorY) * scale; // Invert Y axis
        
        return y;
    }
    
    // Debug method to log route data
    debugRouteData() {
        console.log('Route Data:', this.routeData);
        if (this.routeData.day1 && this.routeData.day1.points) {
            console.log('Day 1 points:', this.routeData.day1.points.length);
            console.log('Day 1 first point:', this.routeData.day1.points[0]);
        }
        if (this.routeData.day2 && this.routeData.day2.points) {
            console.log('Day 2 points:', this.routeData.day2.points.length);
            console.log('Day 2 first point:', this.routeData.day2.points[0]);
        }
    }
    
    updateStats() {
        const totalDistance = this.routeData.combined.total_distance;
        
        // Calculate total elevation gain from combined route
        const allElevations = this.routeData.combined.points
            .map(p => p.elevation)
            .filter(e => e !== null && e !== undefined);
        
        const maxElevation = Math.max(...allElevations);
        const minElevation = Math.min(...allElevations);
        const totalElevation = maxElevation - minElevation;
        
        // Animate the numbers
        this.animateNumber(this.totalDistanceElement, totalDistance, 1);
        this.animateNumber(this.totalElevationElement, totalElevation, 0);
    }
    
    animateNumber(element, targetValue, decimals) {
        const duration = 2000;
        const startTime = performance.now();
        const startValue = 0;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
            
            element.textContent = currentValue.toFixed(decimals);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    animateRoutes() {
        // Animate the combined route
        if (this.combinedPath) {
            this.animatePath(this.combinedPath, 4000); // Longer duration for full route
            console.log('Combined path animated');
        }
    }
    
    animatePath(path, duration) {
        const startTime = performance.now();
        const pathLength = path.getTotalLength();
        const startOffset = pathLength;
        const endOffset = 0;
        
        // console.log('Animating path with length:', pathLength);
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentOffset = startOffset - (startOffset - endOffset) * easeOutQuart;
            
            path.style.strokeDashoffset = currentOffset;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
}

// Initialize the landing page when DOM is loaded and D3 is available
function initializeLandingPage() {
    if (typeof d3 !== 'undefined') {
        console.log('D3 is available, initializing landing page');
        new LandingPage();
    } else {
        console.log('D3 not available yet, waiting...');
        setTimeout(initializeLandingPage, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeLandingPage();
});
