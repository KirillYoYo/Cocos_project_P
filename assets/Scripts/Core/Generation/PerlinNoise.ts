/**
 * 1D Perlin noise с поддержкой seed.
 * Чистая математика без зависимостей от Cocos.
 * Генерирует плавные значения в диапазоне ~[-1, 1] для построения кривой коридора.
 */
export class PerlinNoise {
    /** Таблица перестановок (256 значений, дублированных для удобства обращения) */
    private perm: number[] = [];

    constructor(seed?: number) {
        // Если seed не задан — используем случайный
        this.initPermutation(seed ?? Math.random() * 65536);
    }

    /**
     * Инициализация таблицы перестановок через LCG (Linear Congruential Generator).
     * Один и тот же seed всегда даёт одинаковую таблицу → воспроизводимый шум.
     */
    private initPermutation(seed: number): void {
        const p: number[] = [];
        for (let i = 0; i < 256; i++) p[i] = i;

        // Fisher-Yates shuffle с детерминированным генератором
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647; // LCG: Lehmer RNG
            const j = Math.abs(s) % (i + 1);
            // Swap
            const tmp = p[i];
            p[i] = p[j];
            p[j] = tmp;
        }

        // Дублируем массив чтобы не проверять границы при обращении perm[xi + 1]
        this.perm = p.concat(p);
    }

    /**
     * Smoothstep интерполяция (5-го порядка).
     * Обеспечивает плавные переходы между градиентами.
     */
    private fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Градиент в точке: возвращает +x или -x в зависимости от хеша.
     * Для 1D достаточно двух направлений.
     */
    private grad(hash: number, x: number): number {
        return (hash & 1) === 0 ? x : -x;
    }

    /**
     * Получить значение 1D Perlin noise в точке x.
     * @returns значение в диапазоне приблизительно [-1, 1]
     */
    noise1D(x: number): number {
        // Целая часть координаты (индекс ячейки) с маской 255
        const xi = Math.floor(x) & 255;

        // Дробная часть внутри ячейки
        const xf = x - Math.floor(x);

        // Плавная интерполяция
        const u = this.fade(xf);

        // Хеши для левого и правого края ячейки
        const a = this.perm[xi];
        const b = this.perm[xi + 1];

        // Градиенты на левом и правом краях ячейки
        const gradA = this.grad(a, xf);
        const gradB = this.grad(b, xf - 1);

        // Линейная интерполяция между градиентами (lerp)
        return gradA + u * (gradB - gradA);
    }
}
