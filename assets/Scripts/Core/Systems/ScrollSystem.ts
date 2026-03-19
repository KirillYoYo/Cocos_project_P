/**
 * Управляет скоростью авто-скролла.
 * Чистая логика — вычисляет смещение, не двигает ноды.
 * GameController применяет результат к позициям View.
 */
export class ScrollSystem {
    /** Базовая скорость скролла (px/сек) из конфига уровня */
    private baseSpeed: number;

    /** Ускорение: на сколько px/сек² растёт скорость со временем */
    private speedIncrement: number;

    /** Текущая скорость скролла (px/сек) */
    private currentSpeed: number;

    /** Суммарное время с начала уровня (сек) */
    private elapsed: number = 0;

    constructor(baseSpeed: number, speedIncrement: number) {
        this.baseSpeed = baseSpeed;
        this.speedIncrement = speedIncrement;
        this.currentSpeed = baseSpeed;
    }

    /**
     * Обновляет скорость и возвращает смещение за этот кадр.
     * @param dt — deltaTime (секунды)
     * @returns смещение в пикселях за этот кадр
     */
    update(dt: number): number {
        this.elapsed += dt;

        // Скорость плавно растёт со временем
        this.currentSpeed = this.baseSpeed + this.elapsed * this.speedIncrement;

        // Возвращаем дельту смещения за кадр
        return this.currentSpeed * dt;
    }

    /** Текущая скорость скролла (px/сек) */
    getSpeed(): number {
        return this.currentSpeed;
    }

    /** Сброс к начальным параметрам */
    reset(): void {
        this.elapsed = 0;
        this.currentSpeed = this.baseSpeed;
    }
}
