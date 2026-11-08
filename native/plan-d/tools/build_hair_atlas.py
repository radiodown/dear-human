#!/usr/bin/env python3
"""Bake original 2D strand curves to an RGBA hair-card atlas (stdlib only).
Not an AI image or copied art: the deterministic curve recipe is saved beside PNG.
RGB = neutral fibre variation, A = supersampled analytic fibre coverage.
"""
import argparse, json, math, random, struct, zlib
from pathlib import Path


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)


def bake(destination):
    width, height, tiles, pad = 1536, 1024, 12, 5
    tile_width = width // tiles
    pixels = bytearray(width * height * 4)
    recipes = []
    for tile in range(tiles):
        rng = random.Random(41700 + tile)
        count = 240 if tile >= 8 else (145 if tile < 4 else (86 if tile < 6 else 35))
        coverage = [0.0] * (tile_width * height)
        shade = [0.0] * (tile_width * height)
        for strand in range(count):
            root = rng.uniform(.075, .925)
            # Separate strand ends soften the tip without a triangular mesh silhouette.
            end = rng.uniform(.92, .998) if tile >= 8 else rng.uniform(.76, .993)
            drift = rng.uniform(-.028, .028)
            wave = rng.uniform(.0008, .006)
            phase = rng.uniform(0, 2 * math.pi)
            radius = rng.uniform(.65, .95) if tile >= 8 else rng.uniform(.45, .85)
            value = rng.uniform(.55, 1.0)
            recipes.append(dict(tile=tile, root=root, end=end, drift=drift, wave=wave,
                                phase=phase, radius_pixels=radius, shade=value))
            for y in range(pad, min(height-pad, int(end*(height-2*pad))+pad)):
                v = (y-pad)/(height-2*pad)
                x = (root+drift*v+wave*math.sin(v*9+phase)*v)*tile_width
                tip = min(1.0, (end-v)/.035)
                rad = radius * max(.08, tip)
                for px in range(max(pad,int(x-2)), min(tile_width-pad,int(x+3))):
                    # Integrated box-filter approximation of the narrow fibre.
                    alpha = max(0.0, min(1.0, rad+.5-abs(px+.5-x)))
                    k = y*tile_width+px
                    coverage[k] = alpha + coverage[k]*(1-alpha)
                    shade[k] = value*alpha + shade[k]*(1-alpha)
        for y in range(height):
            for x in range(tile_width):
                k=y*tile_width+x; a=coverage[k]
                gray=round(255*(shade[k]/a if a else .72))
                dst=(y*width+tile*tile_width+x)*4
                pixels[dst:dst+4]=bytes((gray,gray,gray,round(a*255)))
    scan=b''.join(b'\0'+pixels[y*width*4:(y+1)*width*4] for y in range(height))
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(scan,9))+chunk(b'IEND',b'')
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_bytes(png)
    destination.with_suffix('.curves.json').write_text(json.dumps(dict(schema=1,seed=41700,width=width,height=height,tiles=tiles,padding=pad,strands=recipes),indent=2)+'\n')
    print(f'{destination}: {width}x{height}, {len(recipes)} source strands, {len(png)} bytes')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    bake(parser.parse_args().output)
