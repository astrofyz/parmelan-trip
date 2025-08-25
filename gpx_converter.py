#!/usr/bin/env python3
"""
GPX to JSON Converter for Hiking Story Website
Converts Strava GPX files to route and elevation data for web visualization
"""

import gpxpy
import json
import math
from datetime import datetime
import argparse
import os

def parse_time(gpx_time):
    """Parse GPX time to HH:MM"""
    if gpx_time:
        return gpx_time.strftime('%H:%M')
    return None

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

def convert_gpx_to_json(gpx_file, route_output, elevation_output, min_distance=1):
    """
    Convert GPX file to both route and elevation JSON files in one pass
    
    Args:
        gpx_file: Path to GPX file
        route_output: Output JSON file path for route data
        elevation_output: Output JSON file path for elevation data
        min_distance: Minimum distance in meters between points (for reduction)
    """
    
    with open(gpx_file, 'r') as f:
        gpx = gpxpy.parse(f)
    
    # Get all points from the first track and segment
    if not gpx.tracks:
        raise ValueError("No tracks found in GPX file")
    
    track = gpx.tracks[0]
    if not track.segments:
        raise ValueError("No segments found in track")
    
    segment = track.segments[0]
    
    # Reduce points to simplify the track
    original_count = len(segment.points)
    gpx.reduce_points(min_distance=min_distance)
    reduced_count = len(segment.points)
    
    print(f"Reduced points from {original_count} to {reduced_count} (min_distance={min_distance}m)")
    
    # Extract all points with distance calculation
    all_points = []
    elevation_points = []
    total_distance = 0
    prev_lat = prev_lon = None
    
    for point in segment.points:
        lat = point.latitude
        lon = point.longitude
        elevation = point.elevation if point.elevation is not None else 0
        time = parse_time(point.time)
        
        # Calculate distance
        if prev_lat is not None:
            segment_distance = calculate_distance(prev_lat, prev_lon, lat, lon)
            total_distance += segment_distance
        else:
            segment_distance = 0
        
        # Add to all points (for route)
        all_points.append({
            'lat': lat,
            'lon': lon,
            'elevation': elevation,
            'time': time,
            'distance': total_distance
        })
        
        # Add to elevation points if it has elevation data
        if point.elevation is not None:
            elevation_points.append({
                'distance': total_distance,
                'elevation': point.elevation,
                'time': time
            })
        
        prev_lat, prev_lon = lat, lon
    
    # Use the same points for elevation profile as the route
    # This ensures perfect synchronization between map and elevation chart
    elevation_profile = []
    
    for point in all_points:
        if point['elevation'] is not None and point['elevation'] > 0:
            elevation_profile.append({
                'distance': point['distance'],
                'elevation': point['elevation'],
                'time': point['time']
            })
    
    # Create route data
    route_data = {
        'total_distance': total_distance,
        'start_time': all_points[0]['time'] if all_points else None,
        'end_time': all_points[-1]['time'] if all_points else None,
        'points': all_points
    }
    
    # Create elevation data
    elevation_data = {
        'total_distance': total_distance,
        'points': elevation_profile
    }
    
    # Save both files
    with open(route_output, 'w') as f:
        json.dump(route_data, f, indent=2)
    
    with open(elevation_output, 'w') as f:
        json.dump(elevation_data, f, indent=2)
    
    print(f"Route data saved to {route_output}")
    print(f"Elevation data saved to {elevation_output}")
    print(f"Total distance: {total_distance:.2f} km")
    print(f"Route points: {len(all_points)}")
    print(f"Elevation points: {len(elevation_profile)}")

def create_svg_path_from_coordinates(points):
    """
    Convert coordinate points to SVG path string
    
    Args:
        points: List of dictionaries with 'lat' and 'lon' keys
    
    Returns:
        SVG path string
    """
    if not points:
        return ""
    
    # Simple projection: treat lat/lon as x/y (you might want to use proper projection)
    # Scale and offset for SVG viewport
    lats = [p['lat'] for p in points]
    lons = [p['lon'] for p in points]
    
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    
    # Scale to fit in 1000x500 viewport
    width, height = 1000, 500
    
    path_parts = []
    for i, point in enumerate(points):
        x = ((point['lon'] - min_lon) / (max_lon - min_lon)) * width
        y = ((max_lat - point['lat']) / (max_lat - min_lat)) * height
        
        if i == 0:
            path_parts.append(f"M {x:.2f} {y:.2f}")
        else:
            path_parts.append(f"L {x:.2f} {y:.2f}")
    
    return " ".join(path_parts)

def main():
    parser = argparse.ArgumentParser(description='Convert GPX files to JSON for web visualization')
    parser.add_argument('gpx_file', help='Input GPX file path')
    parser.add_argument('--output-dir', default='data', help='Output directory for JSON files')
    parser.add_argument('--day', type=int, required=True, help='Day number (1 or 2)')
    parser.add_argument('--min-distance', type=int, default=1, help='Minimum distance in meters between points (for reduction)')

    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Generate output filenames
    route_file = os.path.join(args.output_dir, f'route-day{args.day}.json')
    elevation_file = os.path.join(args.output_dir, f'elevation-day{args.day}.json')
    
    print(f"Converting GPX file: {args.gpx_file}")
    print(f"Day: {args.day}")
    print(f"Output directory: {args.output_dir}")
    print("-" * 50)
    
    # Convert to both route and elevation data in one pass
    convert_gpx_to_json(args.gpx_file, route_file, elevation_file, args.min_distance)
    
    print("-" * 50)
    print("Conversion complete!")

if __name__ == "__main__":
    main()
