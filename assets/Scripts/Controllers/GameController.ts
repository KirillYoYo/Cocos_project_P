import { _decorator, Component, Node, view, UITransform, Graphics, log } from 'cc';
import { PathGenerator } from '../Core/Generation/PathGenerator';
import { PathSegment } from '../Core/Generation/IPathConfig';
import { ScrollSystem } from '../Core/Systems/ScrollSystem';
import { GameState } from '../Core/Models/GameState';
import { LevelRegistry } from '../Core/Levels/LevelRegistry';
import { ILevelConfig } from '../Core/Levels/ILevelConfig';
import { CorridorView } from '../Views/Environment/CorridorView';
import { EventBus } from '../Managers/EventBus';
import { GameEvent } from '../Utils/Constants';

const { ccclass } = _decorator;

/**
 * Главный контроллер игровой сцены.
 * Связывает генерацию → скролл → отображение.
 *
 * Установка в редакторе:
 * 1. Создать пустую ноду под Canvas
 * 2. Добавить этот компонент
 * 3. Запустить — коридор генерируется и скроллится автоматически
 */
@ccclass('GameController')
export class GameController extends Component {
    // --- Системы (чистая логика) ---
    private pathGenerator: PathGenerator | null = null;
    private scrollSystem: ScrollSystem | null = null;
    private gameState: GameState = GameState.instance;

    // --- View ---
    private corridorView: CorridorView | null = null;

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

        // Инициализируем системы
        this.pathGenerator = new PathGenerator(
            this.levelConfig.path,
            this.screenHeight
        );
        this.scrollSystem = new ScrollSystem(
            this.levelConfig.scrollSpeed,
            this.levelConfig.speedIncrement
        );

        // Создаём ноду для CorridorView (программно)
        this.createCorridorView();

        // Генерируем начальные сегменты
        this.generateInitialSegments();

        // Запускаем игру
        this.gameState.isRunning = true;
    }

    update(dt: number): void {
        // Не обновляем если игра не запущена или на паузе
        if (!this.gameState.isRunning || this.gameState.isPaused) return;
        if (!this.scrollSystem || !this.corridorView) return;

        // Обновляем скролл — получаем смещение за кадр
        const scrollDelta = this.scrollSystem.update(dt);
        this.scrollOffset += scrollDelta;
        this.gameState.totalDistance = this.scrollOffset;
        this.gameState.currentScrollSpeed = this.scrollSystem.getSpeed();

        // Проверяем нужно ли генерировать новые сегменты
        this.checkAndGenerateMore();

        // Удаляем старые сегменты за пределами экрана (экономия памяти)
        this.pruneOldSegments();

        // Обновляем визуал
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
