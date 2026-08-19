#!/usr/bin/env python3
"""Bake Mapbox + route into static JPEGs used as a slow-connection fallback."""

import json
import math
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ACCESS_TOKEN = "pk.eyJ1IjoiYXN0cm9meXoiLCJhIjoiY2xtMWF4MTBxMzByMTNxcGkwc2cycDlhMSJ9.0o3QKpA4eMmFsX2pfk-Idw"
STYLE = "astrofyz/cmeaghtkp00c401sdc39r9mq8"
MAP_CENTER = {"lat": 45.941112, "lon": 6.2080575}
ROUTE_BOUNDS = {
    "minLat": 45.904317,
    "maxLat": 45.977907,
    "minLon": 6.169607,
    "maxLon": 6.246508,
}
OUT_DIR = Path("assets/images")


def optimal_bounds(route_bounds):
    padding = 0.2
    lat_span = route_bounds["maxLat"] - route_bounds["minLat"]
    lon_span = route_bounds["maxLon"] - route_bounds["minLon"]
    target_lat = lat_span * (1 + 0.5 * padding)
    target_lon = lon_span * (1 + 0.5 * padding)
    return {
        "minLat": MAP_CENTER["lat"] - target_lat / 2,
        "maxLat": MAP_CENTER["lat"] + target_lat / 2,
        "minLon": MAP_CENTER["lon"] - target_lon / 2,
        "maxLon": MAP_CENTER["lon"] + target_lon / 2,
    }


def mercator_x(lon):
    return lon


def mercator_y(lat):
    lat_rad = math.radians(lat)
    return math.log(math.tan(math.pi / 4 + lat_rad / 2))


def project(lon, lat, bounds, width, height):
    min_x, max_x = mercator_x(bounds["minLon"]), mercator_x(bounds["maxLon"])
    min_y, max_y = mercator_y(bounds["minLat"]), mercator_y(bounds["maxLat"])
    dx, dy = max_x - min_x, max_y - min_y
    scale = min(width / dx, height / dy)
    pad_x = (width - dx * scale) / 2
    pad_y = (height - dy * scale) / 2
    x = pad_x + (mercator_x(lon) - min_x) * scale
    y = height - (pad_y + (mercator_y(lat) - min_y) * scale)
    return x, y


def downsample(points, max_points=800):
    if len(points) <= max_points:
        return points
    last = len(points) - 1
    step = last / (max_points - 1)
    sampled = []
    prev = -1
    for i in range(max_points - 1):
        idx = round(i * step)
        if idx != prev:
            sampled.append(points[idx])
            prev = idx
    if prev != last:
        sampled.append(points[last])
    return sampled


def fetch_map(bounds, width, height):
    bbox = f"{bounds['minLon']},{bounds['minLat']},{bounds['maxLon']},{bounds['maxLat']}"
    url = (
        f"https://api.mapbox.com/styles/v1/{STYLE}/static/[{bbox}]/"
        f"{width}x{height}?access_token={ACCESS_TOKEN}"
    )
    with urllib.request.urlopen(url, timeout=60) as response:
        return Image.open(response).convert("RGBA")


def draw_route(image, points, bounds):
    width, height = image.size
    draw = ImageDraw.Draw(image)
    xy = [project(p["lon"], p["lat"], bounds, width, height) for p in points]
    draw.line(xy, fill=(0, 0, 0, 180), width=8, joint="curve")
    draw.line(xy, fill=(220, 20, 60, 255), width=5, joint="curve")
    return image


def save_jpeg(image, path):
    rgb = image.convert("RGB")
    rgb.save(path, "JPEG", quality=80, optimize=True, progressive=True)
    print(f"Wrote {path} ({path.stat().st_size / 1024:.0f} KB, {rgb.size[0]}x{rgb.size[1]})")


def main():
    with open("data/route-combined.json") as fh:
        points = downsample(json.load(fh)["points"])
    bounds = optimal_bounds(ROUTE_BOUNDS)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    landscape = draw_route(fetch_map(bounds, 1280, 720), points, bounds)
    save_jpeg(landscape, OUT_DIR / "landing-map-fallback-landscape.jpg")

    portrait = draw_route(fetch_map(bounds, 720, 1280), points, bounds)
    save_jpeg(portrait, OUT_DIR / "landing-map-fallback-portrait.jpg")


if __name__ == "__main__":
    main()
