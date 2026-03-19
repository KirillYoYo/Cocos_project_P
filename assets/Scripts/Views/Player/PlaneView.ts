import { _decorator, Component, Sprite, SpriteFrame, UITransform, Size } from 'cc';

const { ccclass } = _decorator;

/**
 * Визуализация корабля — отображает спрайт самолёта.
 * Только отрисовка — не знает о физике и вводе.
 *
 * Позиция ноды управляется RigidBody2D (через PlaneController),
 * спрайт автоматически двигается вместе с нодой.
 */
@ccclass('PlaneView')
export class PlaneView extends Component {
    /** Sprite компонент для отображения самолёта */
    private sprite: Sprite | null = null;

    /** Размер отображения (соответствует диаметру коллайдера) */
    private radius: number = 18;

    onLoad(): void {
        // Получаем или добавляем Sprite компонент
        this.sprite = this.getComponent(Sprite);
        if (!this.sprite) {
            this.sprite = this.node.addComponent(Sprite);
        }

        // UITransform нужен для корректного рендера и размера
        let transform = this.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }

        // Устанавливаем размер спрайта по радиусу коллайдера
        this.updateSize();
        this.node.angle = -90;
    }

    /**
     * Устанавливает SpriteFrame (PNG) для отображения самолёта.
     * Вызывается из GameController после создания.
     */
    setSpriteFrame(spriteFrame: SpriteFrame): void {
        if (!this.sprite) {
            this.sprite = this.getComponent(Sprite) || this.node.addComponent(Sprite);
        }
        // Назначаем текстуру самолёта
        this.sprite.spriteFrame = spriteFrame;
    }

    /**
     * Задать радиус (вызывается из GameController при создании).
     * Масштабирует спрайт под размер коллайдера.
     */
    setRadius(radius: number): void {
        this.radius = radius;
        this.updateSize();
    }

    /**
     * Обновляет размер UITransform — спрайт вписывается в диаметр коллайдера.
     */
    private updateSize(): void {
        const transform = this.getComponent(UITransform);
        if (!transform) return;

        // Размер = диаметр коллайдера (ширина и высота)
        const diameter = this.radius * 2;
        transform.setContentSize(new Size(diameter, diameter * 2));
    }

    /** Получить радиус корабля */
    getRadius(): number {
        return this.radius;
    }
}
