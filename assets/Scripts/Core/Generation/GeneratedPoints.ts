import { Vec2, view } from 'cc';

export function generateCurveVertices(
    pointsCount: number = 100,     // количество вершин
    amplitude: number = 200,       // высота волны
    baseSpacing: number = 50,      // БАЗОВОЕ расстояние (будет варьироваться)
    verticalOffset: number = 0,    // центр по Y
    seed: number = 42
): Vec2[] {
    const visibleSize = view.getVisibleSize();
    const points: Vec2[] = [];
    const perlin = createPerlin(seed);
    
    let currentX = 0; // текущая X позиция
    
    for (let i = 0; i < pointsCount; i++) {
        // ДИНАМИЧЕСКИЙ ШАГ X от Perlin noise
        const spacingNoise = (perlin(i * 0.3, 0) + 1) / 2; // [0,1]
        const dynamicSpacing = baseSpacing * (0.5 + spacingNoise * 1.5); // [0.5x, 2x]
        
        currentX += dynamicSpacing; // накапливаем X
        
        // Y: центр + шум
        const noiseT = currentX * 0.01;
        const noiseValue = (perlin(noiseT, 0) + 1) / 2 - 0.5;
        const screenY = visibleSize.height * 0.5 + verticalOffset + noiseValue * amplitude;
        
        points.push(new Vec2(Math.round(currentX), Math.round(screenY)));
    }
    
    return points;
};

function createPerlin(seed: number): (x: number, y: number) => number {
    const permutation: number[] = new Array(512);
    const random = seededRandom(seed);
    
    // Инициализация permutation table
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) permutation[i] = p[i % 256];
    
    const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t: number, a: number, b: number): number => a + t * (b - a);
    const grad = (hash: number, x: number, y: number): number => {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : (h === 12 || h === 14) ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };
    
    return (x: number, y: number): number => {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = fade(x);
        const v = fade(y);
        const A = permutation[X] + Y;
        const B = permutation[X + 1] + Y;
        return lerp(v,
            lerp(u, grad(permutation[A], x, y), grad(permutation[B], x - 1, y)),
            lerp(u, grad(permutation[A + 1], x, y - 1), grad(permutation[B + 1], x - 1, y - 1))
        );
    };
};

function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
    };
};
