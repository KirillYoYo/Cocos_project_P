import { _decorator, Component, Node, view, UITransform, Graphics, Sprite, SpriteFrame, PhysicsSystem2D, Vec2, log } from 'cc';
import { PathGenerator } from '../Core/Generation/PathGenerator';
import { PathSegment } from '../Core/Generation/IPathConfig';
import { PlaneController } from '../Core/Systems/PlaneController';
import { InputSystem } from '../Core/Systems/InputSystem';
import { GameState } from '../Core/Models/GameState';
import { LevelRegistry } from '../Core/Levels/LevelRegistry';
import { ILevelConfig } from '../Core/Levels/ILevelConfig';
import { CorridorView } from '../Views/Environment/CorridorView';
import { PlaneView } from '../Views/Player/PlaneView';
import { EventBus } from '../Managers/EventBus';
import { GameEvent } from '../Utils/Constants';

const { ccclass, property } = _decorator;

/**
 * Главный контроллер игровой сцены.
 * Связывает генерацию → скролл → отображение.
 *
 * Установка в редакторе:
 * 1. Создать ноду Game под Canvas, добавить этот компонент
 * 2. Назначить SpriteFrame самолёта в поле planeSpriteFrame
 * 3. Запустить — коридор и самолёт создаются автоматически
 */
@ccclass('GameController')
export class GameController extends Component {
    /** Спрайт самолёта — назначить PNG в редакторе */
    @property(SpriteFrame)
    planeSpriteFrame: SpriteFrame | null = null;
    // --- Системы ---
    private pathGenerator: PathGenerator | null = null;
    private planeController: PlaneController | null = null;
    private gameState: GameState = GameState.instance;

    // --- Ввод ---
    private inputSystem: InputSystem | null = null;

    // --- View ---
    private corridorView: CorridorView | null = null;
    private planeView: PlaneView | null = null;

    // --- Конфиг ---
    private levelConfig: ILevelConfig | null = null;

    // --- Состояние генерации ---
    /** Текущее смещение скролла (px) */
    private scrollOffset: number = 0;

    /** X-координата до которой уже сгенерированы сегменты */
    private generatedUpToX: number = 0;

    /** Все сгенерированные сегменты пути */
    private allSegments: PathSegment[] = [];

    /** Размеры экрана */
    private screenWidth: number = 0;
    private screenHeight: number = 0;

    start(): void {
        // Получаем размеры видимой области
        const visibleSize = view.getVisibleSize();
        this.screenWidth = visibleSize.width;
        this.screenHeight = visibleSize.height;

        // Загружаем конфиг первого уровня
        this.levelConfig = LevelRegistry.getConfig(1);

        // Настраиваем 2D-физику (Box2D)
        this.initPhysics();

        // Инициализируем системы
        this.pathGenerator = new PathGenerator(
            this.levelConfig.path,
            this.screenHeight
        );

        // Ввод — Cocos-компонент, добавляем на эту же ноду
        this.inputSystem = this.node.addComponent(InputSystem);

        // Создаём ноды для визуализации
        this.createCorridorView();
        this.createPlaneNode();

        // Генерируем начальные сегменты
        this.generateInitialSegments();

        // Запускаем игру
        this.gameState.isRunning = true;
    }

    update(dt: number): void {
        // Не обновляем если игра не запущена или на паузе
        if (!this.gameState.isRunning || this.gameState.isPaused) return;
        if (!this.planeController || !this.inputSystem || !this.corridorView) return;

        // Передаём ввод в физику корабля (Box2D применяет силы)
        const inputDir = this.inputSystem.getDirection();
        this.planeController.applyInput(inputDir);

        // Скролл мира = фиксированная горизонтальная скорость корабля
        const forwardDelta = this.levelConfig!.plane.forwardSpeed * dt;
        this.scrollOffset += forwardDelta;
        this.gameState.totalDistance = this.scrollOffset;
        this.gameState.planeY = this.planeController.getY();
        this.gameState.currentScrollSpeed = this.levelConfig!.plane.forwardSpeed;

        // Проверяем нужно ли генерировать новые сегменты
        this.checkAndGenerateMore();

        // Удаляем старые сегменты за пределами экрана (экономия памяти)
        this.pruneOldSegments();

        // Обновляем визуал коридора (корабль обновляется автоматически через Box2D)
        this.corridorView.updateView(this.scrollOffset);

        // Транслируем событие скролла
        EventBus.emit(GameEvent.SCROLL_CHANGED, this.scrollOffset);
    }

    /**
     * Создаёт дочернюю ноду с CorridorView и Graphics.
     * Нода размещается в (0,0) родителя (центр Canvas).
     */
    private createCorridorView(): void {
        const corridorNode = new Node('CorridorView');
        this.node.addChild(corridorNode);

        // UITransform — определяет размер области рисования
        const transform = corridorNode.addComponent(UITransform);
        transform.setContentSize(this.screenWidth, this.screenHeight);

        // Graphics — компонент для отрисовки полигонов стен
        corridorNode.addComponent(Graphics);

        // CorridorView — наш компонент визуализации
        this.corridorView = corridorNode.addComponent(CorridorView);
    }

    /**
     * Настраивает 2D-физику (Box2D).
     * Важно: в Project Settings → Physics должен быть выбран Box2D как 2D physics engine.
     */
    private initPhysics(): void {
        // Включаем физику и задаём гравитацию мира
        PhysicsSystem2D.instance.enable = true;
        PhysicsSystem2D.instance.gravity = new Vec2(0, -600);
    }

    /**
     * Создаёт ноду корабля с физикой (Box2D) и визуалом.
     * Позиционируется на 20% от левого края, Y = 0.
     * RigidBody2D управляет вертикальной позицией.
     */
    private createPlaneNode(): void {
        if (!this.levelConfig) return;

        const planeNode = new Node('Plane');
        this.node.addChild(planeNode);

        // Позиция: 20% от левого края, Y = 0
        const planeX = -this.screenWidth / 2 + this.screenWidth * 0.2;
        planeNode.setPosition(planeX, 0);

        // UITransform — нужен для рендера и размера спрайта
        planeNode.addComponent(UITransform);

        // Sprite — для отображения PNG самолёта
        const sprite = planeNode.addComponent(Sprite);
        // Назначаем SpriteFrame из @property (если задан в редакторе)
        if (this.planeSpriteFrame) {
            sprite.spriteFrame = this.planeSpriteFrame;
        }

        // PlaneView — визуал (управляет размером спрайта)
        this.planeView = planeNode.addComponent(PlaneView);
        this.planeView.setRadius(this.levelConfig.plane.colliderRadius);

        // PlaneController — физика (RigidBody2D + CircleCollider2D)
        this.planeController = planeNode.addComponent(PlaneController);
        this.planeController.init(this.levelConfig.plane, this.screenHeight);
    }

    /**
     * Генерирует начальную порцию сегментов (заполняет экран + буфер вперёд).
     */
    private generateInitialSegments(): void {
        if (!this.pathGenerator || !this.levelConfig) return;

        const count = this.levelConfig.path.prebuildSegments;
        const segments = this.pathGenerator.generateSegments(0, count, 0);

        this.allSegments = segments;
        this.generatedUpToX = segments.length > 0
            ? segments[segments.length - 1].x + this.levelConfig.path.segmentLength
            : 0;

        // Передаём сегменты в View
        this.corridorView?.setSegments(this.allSegments);
    }

    /**
     * Проверяет, нужно ли генерировать новые сегменты.
     * Если правый край экрана приближается к generatedUpToX — генерируем ещё.
     */
    private checkAndGenerateMore(): void {
        if (!this.pathGenerator || !this.levelConfig) return;

        // Правый край видимой области в мировых координатах
        const rightEdge = this.scrollOffset + this.screenWidth;
        const cfg = this.levelConfig.path;

        // Генерируем когда до края осталось меньше половины буфера
        const threshold = cfg.prebuildSegments * cfg.segmentLength * 0.5;

        if (this.generatedUpToX - rightEdge < threshold) {
            // Генерируем новую порцию
            const newSegments = this.pathGenerator.generateSegments(
                this.generatedUpToX,
                cfg.prebuildSegments,
                this.gameState.totalDistance
            );

            // Добавляем к общему массиву и обновляем View
            this.allSegments = this.allSegments.concat(newSegments);
            this.corridorView?.setSegments(this.allSegments);

            // Обновляем границу генерации
            if (newSegments.length > 0) {
                this.generatedUpToX = newSegments[newSegments.length - 1].x + cfg.segmentLength;
            }
        }
    }

    /**
     * Удаляет сегменты, которые ушли далеко за левый край экрана.
     * Освобождает память при бесконечной генерации.
     */
    private pruneOldSegments(): void {
        // Удаляем сегменты, которые на 2 экрана левее текущей позиции
        const pruneThreshold = this.scrollOffset - this.screenWidth * 2;

        let cutIndex = 0;
        while (cutIndex < this.allSegments.length &&
               this.allSegments[cutIndex].x < pruneThreshold) {
            cutIndex++;
        }

        if (cutIndex > 0) {
            this.allSegments.splice(0, cutIndex);
            // Обновляем ссылку в View
            this.corridorView?.setSegments(this.allSegments);
        }
    }
}
