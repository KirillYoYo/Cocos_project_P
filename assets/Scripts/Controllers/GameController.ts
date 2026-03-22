import {
    _decorator, Component, Node, view, UITransform, Graphics,
    Sprite, SpriteFrame,
    Vec2, Color
} from 'cc';

import { GameState } from '../Core/Models/GameState';
import { LevelRegistry } from '../Core/Levels/LevelRegistry';
import { ILevelConfig } from '../Core/Levels/ILevelConfig';
import { PlaneController } from './PlaneController';
import { generateCurveVertices } from '../Core/Generation/GeneratedPoints';
import { GAME_CONFIG } from './GAME_CONFIG';
import { CurveManager } from '../Core/Curve/CurveManager';

const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {

    @property(SpriteFrame)
    planeSpriteFrame: SpriteFrame | null = null;

    private gameState: GameState = GameState.instance;
    private planeController: PlaneController | null = null;

    private levelConfig: ILevelConfig | null = null;
    private graphics: Graphics | null = null;

    private curve: CurveManager | null = null;

    private scrollSpeed: number = GAME_CONFIG.speed;

    private screenWidth: number = 0;
    private screenHeight: number = 0;

    private readonly CLEANUP_INTERVAL = 2.0;
    private lastCleanupTime = 0;

    start(): void {
        this.createGraphicsNode();

        const visibleSize = view.getVisibleSize();
        this.screenWidth = visibleSize.width;
        this.screenHeight = visibleSize.height;

        this.levelConfig = LevelRegistry.getConfig(1);
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

    update(dt: number): void {
        if (!this.gameState.isRunning || this.gameState.isPaused || !this.curve) return;

        this.curve.update(dt, this.scrollSpeed);

        const now = performance.now() / 1000;
        if (now - this.lastCleanupTime > this.CLEANUP_INTERVAL) {
            this.curve.cleanup();
            this.lastCleanupTime = now;
        }

        this.curve.fillVisiblePointsStep(1.5);

        const targetY = this.curve.getYAtCenter();
        if (targetY !== null && this.planeController) {
            this.planeController.setPositionY(targetY);
        }

        this.drawPoints();
    }

    private drawPoints() {
        if (!this.graphics || !this.curve) return;

        const centerX = this.screenWidth / 2;
        const centerY = this.screenHeight / 2;

        this.graphics.clear();

        this.curve.forEachRenderablePoint((screenX, y) => {
            if (screenX >= -50 && screenX <= this.screenWidth + 50) {
                const localX = screenX - centerX;
                const localY = y - centerY;

                this.graphics!.circle(localX, localY, 8);
            }
        });

        this.graphics.fillColor = new Color(255, 100, 100, 255);
        this.graphics.fill();
    }

    private createGraphicsNode() {
        const node = new Node('GraphicsNode');
        this.node.addChild(node);

        this.graphics = node.addComponent(Graphics);
    }

    //
    // PLANE
    //
    private createPlaneNode(): void {
        if (!this.levelConfig) return;

        const planeNode = new Node('Plane');
        this.node.addChild(planeNode);

        planeNode.addComponent(UITransform);

        const sprite = planeNode.addComponent(Sprite);
        if (this.planeSpriteFrame) {
            sprite.spriteFrame = this.planeSpriteFrame;
        }

        this.planeController = planeNode.addComponent(PlaneController);
        this.planeController.init(this.scrollSpeed);
        this.planeController.setupVisual(this.planeSpriteFrame);

        const initialY = this.curve?.getYAtCenter();
        planeNode.setPosition(0, initialY ?? 0, 0);
    }
}