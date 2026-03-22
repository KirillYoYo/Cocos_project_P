import {
    _decorator, Component, Node, view, UITransform, Graphics,
    Sprite, SpriteFrame,
    Vec2, Color, log
} from 'cc';
import { GameState } from '../Core/Models/GameState';
import { LevelRegistry } from '../Core/Levels/LevelRegistry';
import { ILevelConfig } from '../Core/Levels/ILevelConfig';
import { PlaneController } from './PlaneController';
import { generateCurveVertices } from '../Core/Generation/GeneratedPoints';
import { GAME_CONFIG } from './GAME_CONFIG';
import { CurveManager } from '../Core/Curve/CurveManager';
    
const { ccclass, property } = _decorator;

/**
 * Главный контроллер игровой сцены.
 *
 * Установка в редакторе:
 * 1. Создать ноду Game под Canvas, добавить этот компонент
 * 2. Назначить SpriteFrame самолёта в поле planeSpriteFrame
 */
@ccclass('GameController')
export class GameController extends Component {
    /** Спрайт самолёта — назначить PNG в редакторе */
    @property(SpriteFrame)
    planeSpriteFrame: SpriteFrame | null = null;
    private gameState: GameState = GameState.instance;
    private graphicsNode: Node | null = null;

    private planeController: PlaneController | null = null;

    // --- Конфиг ---
    private levelConfig: ILevelConfig | null = null;

    private graphics: Graphics | null = null;
    private allPoints: Vec2[] = [];
    visiblePoints: Vec2[] = [];
    headIndex: number = 0;       // ← указатель на первую видимую точку
    scrollOffset: number = 0;  // глобальный сдвиг всех точек влево
    private fillingInProgress = false;
    private scrollSpeed: number = GAME_CONFIG.speed;

    /** Размеры экрана */
    private screenWidth: number = 0;
    private screenHeight: number = 0;

    private readonly CLEANUP_INTERVAL = 2.0; // сек
    private lastCleanupTime = 0;

    private curve: CurveManager | null = null;

    start(): void {
        this.graphics = this.getComponent(Graphics)!;
        this.createGraphicsNode();

        // Получаем размеры видимой области
        const visibleSize = view.getVisibleSize();
        this.screenWidth = visibleSize.width;
        this.screenHeight = visibleSize.height;

        // Загружаем конфиг первого уровня
        this.levelConfig = LevelRegistry.getConfig(1);

        // Запускаем игру
        this.gameState.isRunning = true;

        this.curve = new CurveManager(this.screenWidth, this.screenHeight);

        this.curve.init(
            generateCurveVertices(
                GAME_CONFIG.poinsLength,
                GAME_CONFIG.amplitude,
                GAME_CONFIG.baseSpacing,
                GAME_CONFIG.verticalOffset,
                123
            )
        );

        this.curve.fillVisiblePointsStep(1.5);

        this.createPlaneNode();
    }

    private drawPoints() {
        const centerX = this.screenWidth / 2;
        const centerY = this.screenHeight / 2;

        this.graphics!.clear();

        const points = this.curve!.getRenderablePoints();
        const offset = this.curve!.getScrollOffset();

        for (const point of points) {
            const screenX = point.x - offset;

            if (screenX >= -50 && screenX <= this.screenWidth + 50) {
                const localX = screenX - centerX;
                const localY = point.y - centerY;

                this.graphics!.circle(localX, localY, 8);
            }
        }

        this.graphics!.fillColor = new Color(255, 100, 100, 255);
        this.graphics!.fill();
    }

    update(dt: number): void {
        if (!this.gameState.isRunning || this.gameState.isPaused || !this.curve) return;
        
        this.scrollOffset += this.scrollSpeed * dt;
        
        // 1. ✅ УДАЛЯЕМ слева — ПРОСТО сдвигаем указатель!
        while (this.headIndex < this.visiblePoints.length) {
            const screenX = this.visiblePoints[this.headIndex].x - this.scrollOffset;
            if (screenX < -100) {
                this.headIndex++;
            } else {
                break;
            }
        }

        this.curve!.update(dt, this.scrollSpeed);

        const now = performance.now() / 1000;
        if (now - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            this.curve!.cleanup();
            this.lastCleanupTime = now;
        }

        this.curve!.fillVisiblePointsStep(1.5);

        const targetY = this.curve!.getYAtCenter();
        if (targetY !== null && this.planeController) {
            this.planeController.setPositionY(targetY);
        }

        this.drawPoints();
    }

    private getLastVisibleX(): number {
        if (this.visiblePoints.length === 0) return 0;
        return this.visiblePoints[this.visiblePoints.length - 1].x;
    }

    
    private createGraphicsNode() {
        // Создаём дочерний узел
        this.graphicsNode = new Node('GraphicsNode');
        this.node.addChild(this.graphicsNode);

        // Добавляем Graphics компонент
        this.graphics = this.graphicsNode!.addComponent(Graphics);
        this.graphics!.enabled = true;
    }

    private cleanupOldPoints(): void {
        // TODO проверить как будет себя ring buffer
        // Создаём новый массив только с актуальными точками
        const activePoints: Vec2[] = [];
        for (let i = this.headIndex; i < this.visiblePoints.length; i++) {
            activePoints.push(this.visiblePoints[i]);
        }
        
        // // Заменяем старый массив новым (O(n) раз в 2 сек — НЕ критично!)
        this.visiblePoints = activePoints;
        this.headIndex = 0; // сбрасываем указатель
    }
 
    //
    // PLANE
    //
    private createPlaneNode(): void {
        if (!this.levelConfig) return;

        const planeNode = new Node('Plane');
        this.node.addChild(planeNode);
        planeNode.setPosition(0, 0);

        planeNode.addComponent(UITransform);

        const sprite = planeNode.addComponent(Sprite);
        if (this.planeSpriteFrame) {
            sprite.spriteFrame = this.planeSpriteFrame;
        }

        this.planeController = planeNode.getComponent(PlaneController) || planeNode.addComponent(PlaneController);
        this.planeController.init(this.scrollSpeed);
        this.planeController.setupVisual(this.planeSpriteFrame);

        // Устанавливаем начальную позицию: X в центре (0), Y по интерполированной кривой у центра экрана
        const initialY = this.getCurveYAtCenter();
        if (initialY !== null) {
            planeNode.setPosition(0, initialY, 0);
        } else {
            planeNode.setPosition(0, 0, 0);
        }
    }

    private getCurveYAtCenter(): number | null {
        if (this.visiblePoints.length < 2) return null;

        const centerX = this.screenWidth / 2;
        const points = this.visiblePoints
            .slice(this.headIndex)
            .map(p => new Vec2(p.x - this.scrollOffset, p.y));

        // Найдём сегмент для центра экрана
        let i = 0;
        while (i + 1 < points.length && points[i + 1].x < centerX) {
            i++;
        }

        if (i + 1 >= points.length) {
            i = points.length - 2;
        }
        if (i < 0) i = 0;

        const p1 = points[i];
        const p2 = points[i + 1];
        const segmentHeight = p2.x - p1.x;

        if (segmentHeight === 0) {
            return p1.y - this.screenHeight / 2;
        }

        const t = (centerX - p1.x) / segmentHeight;

        const p0 = i > 0 ? points[i - 1] : p1;
        const p3 = i + 2 < points.length ? points[i + 2] : p2;

        const yCurve = this.catmullRom(p0.y, p1.y, p2.y, p3.y, t);
        return yCurve - this.screenHeight / 2;
    }

    private catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
        const t2 = t * t;
        const t3 = t2 * t;
        return 0.5 * ((2 * p1)
            + (-p0 + p2) * t
            + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
            + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    }
    // END PLANE
}
