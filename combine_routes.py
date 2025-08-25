#!/usr/bin/env python3
"""
Script to combine route data from both days into a single JSON file
for use in the landing page
"""

import json
import os

def load_route_data(filename):
    """Load route data from JSON file"""
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        print(f"File {filename} not found!")
        return None
    except json.JSONDecodeError:
        print(f"Error parsing {filename}!")
        return None

def combine_routes():
    """Combine Day 1 and Day 2 routes into a single route"""
    
    # Load both route files
    day1_data = load_route_data('data/route-day1.json')
    day2_data = load_route_data('data/route-day2.json')
    
    if not day1_data or not day2_data:
        print("Could not load route data!")
        return
    
    # Extract points from both days
    day1_points = day1_data['points']
    day2_points = day2_data['points']
    
    if not day1_points or not day2_points:
        print("No points found in route data!")
        return
    
    # Calculate total distance
    day1_distance = day1_data.get('total_distance', 0)
    day2_distance = day2_data.get('total_distance', 0)
    total_distance = day1_distance + day2_distance
    
    # Combine points with continuous distance calculation
    combined_points = []
    cumulative_distance = 0
    
    # Add Day 1 points
    for point in day1_points:
        combined_point = point.copy()
        combined_point['day'] = 1
        combined_point['original_distance'] = point.get('distance', 0)
        combined_point['distance'] = cumulative_distance
        combined_points.append(combined_point)
        cumulative_distance = point.get('distance', 0)
    
    # Add Day 2 points with adjusted distances
    for point in day2_points:
        combined_point = point.copy()
        combined_point['day'] = 2
        combined_point['original_distance'] = point.get('distance', 0)
        combined_point['distance'] = cumulative_distance + point.get('distance', 0)
        combined_points.append(combined_point)
    
    # Create combined route data
    combined_data = {
        'total_distance': total_distance,
        'day1_distance': day1_distance,
        'day2_distance': day2_distance,
        'start_time': day1_data.get('start_time'),
        'end_time': day2_data.get('end_time'),
        'day1_start_index': 0,
        'day1_end_index': len(day1_points) - 1,
        'day2_start_index': len(day1_points),
        'day2_end_index': len(combined_points) - 1,
        'points': combined_points
    }
    
    # Save combined route
    output_file = 'data/route-combined.json'
    with open(output_file, 'w') as f:
        json.dump(combined_data, f, indent=2)
    
    print(f"Combined route saved to {output_file}")
    print(f"Total distance: {total_distance:.2f} km")
    print(f"Day 1: {day1_distance:.2f} km ({len(day1_points)} points)")
    print(f"Day 2: {day2_distance:.2f} km ({len(day2_points)} points)")
    print(f"Combined: {len(combined_points)} points")
    print(f"Day 1 points: {combined_data['day1_start_index']} to {combined_data['day1_end_index']}")
    print(f"Day 2 points: {combined_data['day2_start_index']} to {combined_data['day2_end_index']}")

if __name__ == "__main__":
    combine_routes()
