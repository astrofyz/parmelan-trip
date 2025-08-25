// Day 1 Narrative JavaScript
class Day1Narrative {
    constructor() {
        this.stories = [];
        this.routeData = [];
        this.elevationData = [];
        this.currentStoryIndex = 0;
        this.routeSvg = null;
        this.elevationSvg = null;
        
        this.init();
    }

    async init() {
        try {
            // Load data
            await this.loadData();
            
            // Initialize components
            this.initSvgMaps();
            this.renderStorySections();
            this.renderTimeline();
            
            // Set up scroll listener
            this.setupScrollListener();
            
            // Initial update
            this.updateActiveStory(0);
            
        } catch (error) {
            console.error('Error initializing Day 1 narrative:', error);
        }
    }

    async loadData() {
        try {
            // Load stories
            const storiesResponse = await fetch('data/stories-day1.json');
            const storiesData = await storiesResponse.json();
            this.stories = storiesData.stories;
            
            // Load route data
            const routeResponse = await fetch('data/route-day1.json');
            const routeData = await routeResponse.json();
            this.routeData = routeData.points;
            
            // Load elevation data
            const elevationResponse = await fetch('data/elevation-day1.json');
            const elevationData = await elevationResponse.json();
            this.elevationData = elevationData.points;
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    initSvgMaps() {
        this.routeSvg = document.getElementById('route-svg');
        this.elevationSvg = document.getElementById('elevation-svg');
        
        // Add background grid to route map for debugging
        this.addRouteGrid();
        
        // Draw initial route and elevation
        this.updateRouteDisplay(0);
        this.updateElevationDisplay(0);
    }

    addRouteGrid() {
        if (!this.routeSvg) return;
        
        // Add a simple grid for debugging
        for (let i = 0; i <= 400; i += 50) {
            // Vertical lines
            const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            vLine.setAttribute('x1', i);
            vLine.setAttribute('y1', 0);
            vLine.setAttribute('x2', i);
            vLine.setAttribute('y2', 200);
            vLine.setAttribute('stroke', '#e0e0e0');
            vLine.setAttribute('stroke-width', '1');
            this.routeSvg.appendChild(vLine);
            
            // Horizontal lines
            const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hLine.setAttribute('x1', 0);
            hLine.setAttribute('y1', i);
            hLine.setAttribute('x2', 400);
            hLine.setAttribute('y2', i);
            hLine.setAttribute('stroke', '#e0e0e0');
            hLine.setAttribute('stroke-width', '1');
            this.routeSvg.appendChild(hLine);
        }
    }

    renderStorySections() {
        const container = document.getElementById('story-sections');
        container.innerHTML = '';
        
        this.stories.forEach((story, index) => {
            const section = document.createElement('div');
            section.className = 'story-section';
            section.id = `story-${index}`;
            section.dataset.storyIndex = index;
            
            section.innerHTML = `
                <h2>${story.title}</h2>
                <div class="story-time">${story.time}</div>
                <div class="story-content-text">${story.content}</div>
                <div class="story-stats">
                    <div class="story-stat">
                        <span class="story-stat-value">${story.distance} km</span>
                        <span class="story-stat-label">Distance</span>
                    </div>
                    <div class="story-stat">
                        <span class="story-stat-value">${story.elevation} m</span>
                        <span class="story-stat-label">Elevation</span>
                    </div>
                </div>
            `;
            
            container.appendChild(section);
        });
    }

    renderTimeline() {
        const container = document.getElementById('timeline');
        container.innerHTML = '';
        
        this.stories.forEach((story, index) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.dataset.storyIndex = index;
            
            item.innerHTML = `
                <h4>${story.title}</h4>
                <div class="time">${story.time}</div>
            `;
            
            item.addEventListener('click', () => {
                this.scrollToStory(index);
            });
            
            container.appendChild(item);
        });
    }

    setupScrollListener() {
        const storyContent = document.querySelector('.story-content');
        
        storyContent.addEventListener('scroll', () => {
            this.handleScroll();
        });
    }

    handleScroll() {
        const storyContent = document.querySelector('.story-content');
        const sections = document.querySelectorAll('.story-section');
        const scrollTop = storyContent.scrollTop;
        const containerHeight = storyContent.clientHeight;
        
        // Calculate which story should be active based on scroll position
        let activeIndex = 0;
        let maxVisible = 0;
        
        sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            const storyContentRect = storyContent.getBoundingClientRect();
            
            // Calculate how much of the section is visible
            const visibleHeight = Math.min(rect.bottom, storyContentRect.bottom) - 
                                Math.max(rect.top, storyContentRect.top);
            
            if (visibleHeight > maxVisible) {
                maxVisible = visibleHeight;
                activeIndex = index;
            }
        });
        
        // Update active story if it changed
        if (activeIndex !== this.currentStoryIndex) {
            this.updateActiveStory(activeIndex);
        }
    }

    updateActiveStory(index) {
        this.currentStoryIndex = index;
        
        // Update story sections
        document.querySelectorAll('.story-section').forEach((section, i) => {
            section.classList.toggle('active', i === index);
        });
        
        // Update timeline
        document.querySelectorAll('.timeline-item').forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        // Update maps
        this.updateRouteDisplay(index);
        this.updateElevationDisplay(index);
    }

    updateRouteDisplay(storyIndex) {
        const story = this.stories[storyIndex];
        if (!story || !this.routeSvg) return;
        
        // Clear existing route but keep grid
        const gridElements = this.routeSvg.querySelectorAll('line');
        this.routeSvg.innerHTML = '';
        gridElements.forEach(element => this.routeSvg.appendChild(element));
        
        // Find route points up to current story distance
        const currentDistance = story.distance;
        const routePoints = this.routeData.filter(point => point.distance <= currentDistance);
        
        console.log('Current distance:', currentDistance);
        console.log('Route points found:', routePoints.length);
        
        if (routePoints.length > 1) {
            // For now, let's create a simple test route to see if SVG is working
            const testPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            testPath.setAttribute('points', '50,50 100,100 150,50 200,100 250,50 300,100 350,50');
            testPath.setAttribute('fill', 'none');
            testPath.setAttribute('stroke', '#ff0000');
            testPath.setAttribute('stroke-width', '5');
            testPath.setAttribute('stroke-linecap', 'round');
            testPath.setAttribute('stroke-linejoin', 'round');
            
            this.routeSvg.appendChild(testPath);
            
            // Calculate bounds for the route
            const lats = routePoints.map(p => p.lat);
            const lons = routePoints.map(p => p.lon);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLon = Math.min(...lons);
            const maxLon = Math.max(...lons);
            
            // Ensure minimum bounds for visibility
            const latRange = maxLat - minLat;
            const lonRange = maxLon - minLon;
            const minRange = 0.001; // Minimum range to ensure visibility
            
            const effectiveLatRange = Math.max(latRange, minRange);
            const effectiveLonRange = Math.max(lonRange, minRange);
            
            // Add padding
            const latPadding = effectiveLatRange * 0.2;
            const lonPadding = effectiveLonRange * 0.2;
            
            // Create path data
            const pathData = routePoints.map(point => {
                const x = ((point.lon - (minLon - lonPadding)) / ((maxLon + lonPadding) - (minLon - lonPadding))) * 400;
                const y = 200 - ((point.lat - (minLat - latPadding)) / ((maxLat + latPadding) - (minLat - latPadding))) * 200;
                return `${x},${y}`;
            }).join(' ');
            
            console.log('Path data:', pathData);
            
            // Create route path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            path.setAttribute('points', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#4CAF50');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            
            this.routeSvg.appendChild(path);
            
            // Add current position marker
            const currentPoint = routePoints[routePoints.length - 1];
            const markerX = ((currentPoint.lon - (minLon - lonPadding)) / ((maxLon + lonPadding) - (minLon - lonPadding))) * 400;
            const markerY = 200 - ((currentPoint.lat - (minLat - latPadding)) / ((maxLat + latPadding) - (minLat - latPadding))) * 200;
            
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            marker.setAttribute('cx', markerX);
            marker.setAttribute('cy', markerY);
            marker.setAttribute('r', '5');
            marker.setAttribute('fill', '#ff4444');
            marker.setAttribute('stroke', 'white');
            marker.setAttribute('stroke-width', '2');
            
            this.routeSvg.appendChild(marker);
            
            // Add debug info
            console.log('Route bounds:', { minLat, maxLat, minLon, maxLon, latRange, lonRange });
            console.log('Route points:', routePoints.length);
        }
    }

    updateElevationDisplay(storyIndex) {
        const story = this.stories[storyIndex];
        if (!story || !this.elevationSvg) return;
        
        // Clear existing elevation
        this.elevationSvg.innerHTML = '';
        
        // Find elevation points up to current story distance
        const currentDistance = story.distance;
        const elevationPoints = this.elevationData.filter(point => point.distance <= currentDistance);
        
        if (elevationPoints.length > 1) {
            // Calculate bounds for elevation
            const elevations = elevationPoints.map(p => p.elevation);
            const distances = elevationPoints.map(p => p.distance);
            const minElevation = Math.min(...elevations);
            const maxElevation = Math.max(...elevations);
            const maxDistance = Math.max(...distances);
            
            // Add padding
            const elevationPadding = (maxElevation - minElevation) * 0.1;
            
            // Create path data
            const pathData = elevationPoints.map(point => {
                const x = (point.distance / maxDistance) * 400;
                const y = 200 - ((point.elevation - (minElevation - elevationPadding)) / ((maxElevation + elevationPadding) - (minElevation - elevationPadding))) * 200;
                return `${x},${y}`;
            }).join(' ');
            
            // Create elevation path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            path.setAttribute('points', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#4CAF50');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            
            this.elevationSvg.appendChild(path);
            
            // Add current position marker
            const currentPoint = elevationPoints[elevationPoints.length - 1];
            const markerX = (currentPoint.distance / maxDistance) * 400;
            const markerY = 200 - ((currentPoint.elevation - (minElevation - elevationPadding)) / ((maxElevation + elevationPadding) - (minElevation - elevationPadding))) * 200;
            
            const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            marker.setAttribute('cx', markerX);
            marker.setAttribute('cy', markerY);
            marker.setAttribute('r', '5');
            marker.setAttribute('fill', '#ff4444');
            marker.setAttribute('stroke', 'white');
            marker.setAttribute('stroke-width', '2');
            
            this.elevationSvg.appendChild(marker);
        }
    }

    scrollToStory(index) {
        const storySection = document.getElementById(`story-${index}`);
        const storyContent = document.querySelector('.story-content');
        
        if (storySection) {
            const offset = storySection.offsetTop - storyContent.offsetTop - 50;
            storyContent.scrollTo({
                top: offset,
                behavior: 'smooth'
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Day1Narrative();
});
