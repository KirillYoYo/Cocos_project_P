import { PerlinNoise } from './PerlinNoise';
import { IPathConfig, IPathJump, PathSegment } from './IPathConfig';
import { MathUtils } from '../../Utils/MathUtils';

/**
 * Генерирует кривую безопасного коридора на основе Perlin noise.
 * Чистая логика — никаких зависимостей от Cocos.
 *
 * Использование:
 *   const gen = new PathGenerator(config, screenHeight);
 *   const segments = gen.generateSegments(0, 80, 0);
 */
export class PathGenerator {
    private noise: PerlinNoise;
    private config: IPathConfig;

    /** Половина высоты экрана — для ограничения коридора в видимой области */
    private halfScreenH: number;

    constructor(config: IPathConfig, screenHeight: number) {
        this.config = config;
        this.halfScreenH = screenHeight / 2;
        this.noise = new PerlinNoise(config.seed);
    }

    /**
     * Генерирует порцию сегментов пути.
     * @param startX      — начальная X-позиция в мировых координатах
     * @param count        — количество сегментов
     * @param totalDistance — сколько всего пройдено (для сужения коридора)
     * @returns PathSegment[] — сегменты с x, centerY, corridorWidth
     */
    generateSegments(startX: number, count: number, totalDistance: number): PathSegment[] {
        const cfg = this.config;
        const segments: PathSegment[] = [];

        for (let i = 0; i < count; i++) {
            const x = startX + i * cfg.segmentLength;

            // Perlin noise возвращает ~[-1, 1], масштабируем амплитудой
            const noiseVal = this.noise.noise1D(x * cfg.noiseFrequency);

            // Суммируем базовый Perlin noise со смещением от резких скачков
            const jumpOffset = this.calculateJumpOffset(x);
            const rawCenterY = noiseVal * cfg.noiseAmplitude + jumpOffset;

            // Ширина коридора сужается с прогрессом
            const shrink = totalDistance * cfg.corridorShrinkRate;
            const width = Math.max(cfg.corridorWidthMin, cfg.corridorWidth - shrink);
            const halfCorridor = width / 2;

            // Ограничиваем centerY, чтобы коридор не выходил за экран
            const maxCenter = this.halfScreenH - halfCorridor - 10; // 10px отступ от края
            const centerY = MathUtils.clamp(rawCenterY, -maxCenter, maxCenter);

            segments.push({ x, centerY, corridorWidth: width });
        }

        return segments;
    }

    /**
     * Вычисляет суммарное смещение от всех резких скачков, активных для данной X-позиции.
     * Каждый скачок линейно интерполируется от 0 до offsetY на протяжении transitionLength.
     * После завершения перехода смещение сохраняется на всю оставшуюся длину пути.
     */
    private calculateJumpOffset(x: number): number {
        const jumps: IPathJump[] = this.config.sharpJumps ?? [];
        let totalOffset = 0;

        for (const jump of jumps) {
            // Если ещё не дошли до точки скачка — пропускаем
            if (x < jump.atX) continue;

            // Прогресс перехода: 0 → 1 на протяжении transitionLength px
            const progress = Math.min(1, (x - jump.atX) / jump.transitionLength);

            // Накапливаем смещение (скачки кумулятивны)
            totalOffset += jump.offsetY * progress;
        }

        return totalOffset;
    }
}
