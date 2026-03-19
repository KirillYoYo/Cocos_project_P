import { _decorator, Component, Graphics, Color, UITransform, view } from 'cc';

const { ccclass } = _decorator;

/** Цвет корабля (временный — пока просто круг) */
const PLANE_COLOR = new Color(0, 200, 255, 255);

/** Цвет обводки корабля */
const PLANE_STROKE_COLOR = new Color(255, 255, 255, 200);

/**
 * Визуализация корабля — пока простой круг.
 * Только отрисовка — не знает о физике и вводе.
 * GameController вызывает updatePosition() каждый кадр.
 *
 * Корабль зафиксирован по X (левая треть экрана),
 * двигается только по Y.
 */
@ccclass('PlaneView')
export class PlaneView extends Component {
    /** Graphics компонент для рисования круга */
    private graphics: Graphics | null = null;

    /** Радиус корабля-круга (px) */
    private radius: number = 18;

    /** Фиксированная X-позиция на экране (px от центра Canvas) */
    private screenX: number = 0;

    onLoad(): void {
        this.graphics = this.getComponent(Graphics);
        if (!this.graphics) {
            this.graphics = this.node.addComponent(Graphics);
        }

        // Корабль фиксирован по X — в левой трети экрана
        const screenWidth = view.getVisibleSize().width;
        this.screenX = -screenWidth / 2 + screenWidth * 0.2; // 20% от левого края

        // UITransform нужен для корректного позиционирования
        let transform = this.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }

        // Начальная отрисовка
        this.drawPlane(0);
    }

    /**
     * Обновляет позицию корабля на экране.
     * Вызывается каждый кадр из GameController.
     * @param planeY — Y-позиция из PlaneSystem (мировые координаты)
     */
    updatePosition(planeY: number): void {
        this.drawPlane(planeY);
    }

    /**
     * Перерисовывает круг корабля в заданной Y-позиции.
     * X фиксирован — корабль не двигается горизонтально на экране.
     */
    private drawPlane(y: number): void {
        const g = this.graphics;
        if (!g) return;

        g.clear();

        // Заливка круга
        g.fillColor = PLANE_COLOR;
        g.circle(this.screenX, y, this.radius);
        g.fill();

        // Обводка для читаемости на фоне стен
        g.strokeColor = PLANE_STROKE_COLOR;
        g.lineWidth = 2;
        g.circle(this.screenX, y, this.radius);
        g.stroke();
    }

    /** Получить радиус корабля (для коллизий в будущем) */
    getRadius(): number {
        return this.radius;
    }

    /** Получить X-позицию на экране (для коллизий в будущем) */
    getScreenX(): number {
        return this.screenX;
    }
}
