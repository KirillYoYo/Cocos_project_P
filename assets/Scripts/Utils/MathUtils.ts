/**
 * Чистые математические утилиты.
 * Без зависимостей от Cocos — могут использоваться в Core и везде.
 */
export class MathUtils {

    /** Ограничивает value в диапазоне [min, max] */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /** Линейная интерполяция между a и b по коэффициенту t ∈ [0, 1] */
    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /** Случайное число в диапазоне [min, max) */
    static randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    /** Smoothstep — плавная S-кривая для интерполяции (5-го порядка) */
    static smoothstep(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
}
