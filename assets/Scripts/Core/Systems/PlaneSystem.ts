import { IPlaneConfig } from '../Generation/IPlaneConfig';
import { MathUtils } from '../../Utils/MathUtils';

/**
 * Результат обновления физики корабля за один кадр.
 * Используется GameController для обновления скролла и позиции.
 */
export interface PlaneUpdateResult {
    /** Горизонтальное смещение за кадр (px) — определяет скорость скролла */
    forwardDelta: number;

    /** Текущая Y-позиция корабля (px) */
    newY: number;
}

/**
 * Управляет физикой корабля: вертикальное движение + горизонтальная скорость.
 * Чистая логика — никаких зависимостей от Cocos.
 *
 * Ключевые механики:
 * - Вверх — медленное ускорение (тяжёлый подъём)
 * - Вниз — быстрое ускорение (пикирование)
 * - При отпускании ввода — скорость затухает через инерцию (damping)
 * - Горизонтальная скорость фиксирована — определяет скролл мира
 */
export class PlaneSystem {
    /** Текущая Y-позиция корабля в мировых координатах */
    private y: number = 0;

    /** Текущая вертикальная скорость (px/сек), положительная = вверх */
    private velocityY: number = 0;

    /** Конфиг физики корабля */
    private config: IPlaneConfig;

    /** Половина высоты экрана — для ограничения позиции */
    private halfScreenH: number;

    /** Порог скорости, ниже которого считаем что корабль остановился */
    private static readonly VELOCITY_THRESHOLD = 1;

    constructor(config: IPlaneConfig, screenHeight: number) {
        this.config = config;
        this.halfScreenH = screenHeight / 2;
    }

    /**
     * Обновляет физику корабля на один кадр.
     * @param inputDir — направление ввода: 1 = вверх, -1 = вниз, 0 = нет ввода
     * @param dt — deltaTime (секунды)
     * @returns forwardDelta (px) и новая Y-позиция
     */
    update(inputDir: number, dt: number): PlaneUpdateResult {
        if (inputDir > 0) {
            // Движение вверх — медленное ускорение
            this.velocityY += this.config.upAcceleration * dt;
        } else if (inputDir < 0) {
            // Движение вниз — быстрое ускорение (пикирование)
            this.velocityY -= this.config.downAcceleration * dt;
        } else {
            // Нет ввода — применяем инерцию (экспоненциальное затухание)
            this.velocityY *= Math.pow(1 - this.config.inertiaDamping, dt);

            // Обнуляем микро-скорости чтобы корабль полностью останавливался
            if (Math.abs(this.velocityY) < PlaneSystem.VELOCITY_THRESHOLD) {
                this.velocityY = 0;
            }
        }

        // Ограничиваем вертикальную скорость (разные лимиты вверх/вниз)
        this.velocityY = MathUtils.clamp(
            this.velocityY,
            -this.config.maxDownSpeed,
            this.config.maxUpSpeed
        );

        // Обновляем Y-позицию
        this.y += this.velocityY * dt;

        // Ограничиваем позицию экраном (с небольшим отступом)
        const margin = 20;
        this.y = MathUtils.clamp(this.y, -this.halfScreenH + margin, this.halfScreenH - margin);

        // Если упёрлись в границу — гасим скорость в этом направлении
        if ((this.y >= this.halfScreenH - margin && this.velocityY > 0) ||
            (this.y <= -this.halfScreenH + margin && this.velocityY < 0)) {
            this.velocityY = 0;
        }

        // Горизонтальное смещение — фиксированная скорость
        const forwardDelta = this.config.forwardSpeed * dt;

        return { forwardDelta, newY: this.y };
    }

    /** Текущая вертикальная скорость (px/сек) */
    getVelocityY(): number {
        return this.velocityY;
    }

    /** Текущая Y-позиция корабля */
    getY(): number {
        return this.y;
    }

    /** Сброс к начальному состоянию */
    reset(): void {
        this.y = 0;
        this.velocityY = 0;
    }
}
