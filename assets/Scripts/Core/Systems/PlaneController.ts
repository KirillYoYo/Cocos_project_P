import {
    _decorator, Component, RigidBody2D, CircleCollider2D,
    ERigidBody2DType, Collider2D, Contact2DType, IPhysics2DContact,
    Vec2, Vec3, PhysicsSystem2D
} from 'cc';
import { IPlaneConfig } from '../Generation/IPlaneConfig';
import { EventBus } from '../../Managers/EventBus';
import { GameEvent } from '../../Utils/Constants';

const { ccclass } = _decorator;

/**
 * Управляет физикой корабля через Box2D.
 * Заменяет PlaneSystem — физика теперь в движке, а не в ручных расчётах.
 *
 * Механика:
 * - Гравитация тянет корабль вниз (gravityScale)
 * - Нажатие вверх → сила вверх (медленный подъём, борется с гравитацией)
 * - Нажатие вниз → сила вниз (быстрое пикирование, суммируется с гравитацией)
 * - Без ввода → корабль постепенно падает под действием гравитации
 * - linearDamping обеспечивает сопротивление воздуха / инерцию
 *
 * Установка: добавляется программно через GameController.
 * Требование: в Project Settings → Physics выбрать Box2D как 2D physics engine.
 */
@ccclass('PlaneController')
export class PlaneController extends Component {
    /** Ссылка на RigidBody2D (кешируется после init) */
    private rb: RigidBody2D | null = null;

    /** Конфиг физики корабля */
    private config: IPlaneConfig | null = null;

    /** Временный Vec2 для приложения сил (избегаем аллокаций каждый кадр) */
    private forceVec: Vec2 = new Vec2();

    /** Половина высоты экрана (для ограничения по Y) */
    private halfScreenHeight: number = 0;

    /** Временный Vec3 для позиции (избегаем аллокаций) */
    private tempPos: Vec3 = new Vec3();

    /**
     * Инициализирует физику корабля.
     * Вызывается из GameController после добавления компонента.
     * Настраивает RigidBody2D и CircleCollider2D.
     */
    init(config: IPlaneConfig, screenHeight: number): void {
        this.config = config;
        // Сохраняем половину высоты экрана для ограничения позиции
        this.halfScreenHeight = screenHeight / 2;

        // --- RigidBody2D ---
        this.rb = this.getComponent(RigidBody2D);
        if (!this.rb) {
            this.rb = this.node.addComponent(RigidBody2D);
        }
        // Dynamic — физика управляет позицией
        this.rb.type = ERigidBody2DType.Dynamic;
        // Не вращать корабль от столкновений
        this.rb.fixedRotation = true;
        // Гравитация: корабль падает без ввода
        this.rb.gravityScale = config.gravityScale;
        // Сопротивление воздуха / инерция
        this.rb.linearDamping = config.linearDamping;
        // Включаем колбэки столкновений
        this.rb.enabledContactListener = true;

        // --- CircleCollider2D ---
        let collider = this.getComponent(CircleCollider2D);
        if (!collider) {
            collider = this.node.addComponent(CircleCollider2D);
        }
        collider.radius = config.colliderRadius;
        // Применяем изменения коллайдера
        collider.apply();

        // --- Contact callbacks ---
        collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        collider.on(Contact2DType.END_CONTACT, this.onEndContact, this);
    }

    /**
     * Применяет ввод игрока: прикладывает силу вверх или вниз.
     * Вызывается каждый кадр из GameController.
     * @param inputDir — 1 = вверх, -1 = вниз, 0 = нет ввода
     */
    applyInput(inputDir: number): void {
        if (!this.rb || !this.config) return;

        if (inputDir > 0) {
            // Вверх — сила против гравитации (медленный подъём)
            this.forceVec.set(0, this.config.upForce);
            this.rb.applyForceToCenter(this.forceVec, true);
        } else if (inputDir < 0) {
            // Вниз — дополнительная сила к гравитации (пикирование)
            this.forceVec.set(0, -this.config.downForce);
            this.rb.applyForceToCenter(this.forceVec, true);
        }
        // inputDir === 0 → ничего не делаем, гравитация тянет вниз сама

        // Ограничиваем вертикальную скорость
        this.clampVelocity();
    }

    /**
     * Ограничивает вертикальную скорость (разные лимиты вверх/вниз).
     * Горизонтальную скорость обнуляем — корабль не двигается по X.
     */
    private clampVelocity(): void {
        if (!this.rb || !this.config) return;

        const vel = this.rb.linearVelocity;

        // Обнуляем горизонтальную скорость (корабль зафиксирован по X)
        vel.x = 0;

        // Ограничиваем вертикальную скорость
        if (vel.y > this.config.maxUpSpeed) {
            vel.y = this.config.maxUpSpeed;
        } else if (vel.y < -this.config.maxDownSpeed) {
            vel.y = -this.config.maxDownSpeed;
        }

        this.rb.linearVelocity = vel;
    }

    /**
     * Вызывается после физического шага — ограничиваем позицию экраном.
     * lateUpdate гарантирует, что Box2D уже обновил позицию ноды.
     */
    lateUpdate(): void {
        this.clampPosition();
    }

    /**
     * Ограничивает Y-позицию корабля в пределах экрана.
     * Учитывает радиус коллайдера — корабль не выходит за край даже частично.
     * При касании границы обнуляет вертикальную скорость.
     */
    private clampPosition(): void {
        if (!this.rb || !this.config || this.halfScreenHeight === 0) return;

        const pos = this.node.position;
        const radius = this.config.colliderRadius;
        // Верхняя и нижняя границы с учётом размера корабля
        const maxY = this.halfScreenHeight - radius;
        const minY = -this.halfScreenHeight + radius;

        if (pos.y > maxY) {
            // Корабль упёрся в потолок — прижимаем и гасим скорость вверх
            this.tempPos.set(pos.x, maxY, pos.z);
            this.node.setPosition(this.tempPos);
            const vel = this.rb.linearVelocity;
            if (vel.y > 0) vel.y = 0;
            this.rb.linearVelocity = vel;
        } else if (pos.y < minY) {
            // Корабль упёрся в пол — прижимаем и гасим скорость вниз
            this.tempPos.set(pos.x, minY, pos.z);
            this.node.setPosition(this.tempPos);
            const vel = this.rb.linearVelocity;
            if (vel.y < 0) vel.y = 0;
            this.rb.linearVelocity = vel;
        }
    }

    /** Текущая Y-позиция корабля */
    getY(): number {
        return this.node.position.y;
    }

    /** Текущая вертикальная скорость (px/сек) */
    getVelocityY(): number {
        return this.rb ? this.rb.linearVelocity.y : 0;
    }

    // --- Contact Callbacks ---

    /**
     * Вызывается Box2D при начале контакта с другим коллайдером.
     * Отправляет событие PLAYER_HIT через EventBus.
     */
    private onBeginContact(
        selfCollider: Collider2D,
        otherCollider: Collider2D,
        contact: IPhysics2DContact | null
    ): void {
        // Уведомляем систему о столкновении
        EventBus.emit(GameEvent.PLAYER_HIT, otherCollider, contact);
    }

    /**
     * Вызывается Box2D при окончании контакта.
     * Пока пустой — заготовка для будущей логики.
     */
    private onEndContact(
        selfCollider: Collider2D,
        otherCollider: Collider2D,
        contact: IPhysics2DContact | null
    ): void {
        // Заготовка: можно использовать для снятия эффектов
    }

    /** Сброс физики к начальному состоянию */
    reset(): void {
        if (!this.rb) return;
        this.rb.linearVelocity = new Vec2(0, 0);
        this.node.setPosition(this.node.position.x, 0);
    }
}
