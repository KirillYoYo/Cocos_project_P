import { _decorator, Component, input, Input, EventKeyboard, EventTouch, KeyCode, view } from 'cc';
import { EventBus } from '../../Managers/EventBus';
import { GameEvent } from '../../Utils/Constants';

const { ccclass } = _decorator;

/**
 * Захватывает пользовательский ввод и транслирует его в направление движения корабля.
 * Поддерживает клавиатуру (W/S, ArrowUp/ArrowDown) и тач (верхняя/нижняя половина экрана).
 *
 * Результат — направление: 1 (вверх), -1 (вниз), 0 (нет ввода).
 * Передаётся через EventBus (PLANE_INPUT) каждый кадр.
 *
 * Установка: добавить как компонент на ноду GameController.
 */
@ccclass('InputSystem')
export class InputSystem extends Component {
    /** Текущее направление ввода: 1 = вверх, -1 = вниз, 0 = нет ввода */
    private _inputDirection: number = 0;

    /** Флаги удержания клавиш (для одновременного нажатия) */
    private _upPressed: boolean = false;
    private _downPressed: boolean = false;

    /** Флаг активного тача */
    private _touchActive: boolean = false;
    private _touchDirection: number = 0;

    /** Половина высоты экрана — для определения зоны тача */
    private _halfScreenH: number = 0;

    onLoad(): void {
        this._halfScreenH = view.getVisibleSize().height / 2;

        // Подписка на клавиатуру
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);

        // Подписка на тач
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDestroy(): void {
        // Корректная отписка при уничтожении компонента
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    update(): void {
        // Вычисляем итоговое направление (клавиатура имеет приоритет над тачем)
        this._inputDirection = this.resolveDirection();

        // Транслируем через EventBus каждый кадр
        EventBus.emit(GameEvent.PLANE_INPUT, this._inputDirection);
    }

    /** Текущее направление ввода (для прямого чтения из GameController) */
    getDirection(): number {
        return this._inputDirection;
    }

    // --- Клавиатура ---

    private onKeyDown(event: EventKeyboard): void {
        // W или ArrowUp — вверх
        if (event.keyCode === KeyCode.KEY_W || event.keyCode === KeyCode.ARROW_UP) {
            this._upPressed = true;
        }
        // S или ArrowDown — вниз
        if (event.keyCode === KeyCode.KEY_S || event.keyCode === KeyCode.ARROW_DOWN) {
            this._downPressed = true;
        }
    }

    private onKeyUp(event: EventKeyboard): void {
        if (event.keyCode === KeyCode.KEY_W || event.keyCode === KeyCode.ARROW_UP) {
            this._upPressed = false;
        }
        if (event.keyCode === KeyCode.KEY_S || event.keyCode === KeyCode.ARROW_DOWN) {
            this._downPressed = false;
        }
    }

    // --- Тач ---

    private onTouchStart(event: EventTouch): void {
        this._touchActive = true;
        // Определяем зону тача: верхняя половина = вверх, нижняя = вниз
        this._touchDirection = this.getTouchDirection(event);
    }

    private onTouchMove(event: EventTouch): void {
        if (!this._touchActive) return;
        // Обновляем направление при движении пальца между зонами
        this._touchDirection = this.getTouchDirection(event);
    }

    private onTouchEnd(): void {
        this._touchActive = false;
        this._touchDirection = 0;
    }

    /**
     * Определяет направление по Y-позиции тача.
     * Верхняя половина экрана = 1 (вверх), нижняя = -1 (вниз).
     */
    private getTouchDirection(event: EventTouch): number {
        const touchY = event.getLocationY();
        return touchY > this._halfScreenH ? 1 : -1;
    }

    /**
     * Комбинирует клавиатуру и тач в одно направление.
     * Клавиатура приоритетнее; при одновременном вверх+вниз = 0.
     */
    private resolveDirection(): number {
        // Клавиатура: если обе нажаты — взаимная отмена
        if (this._upPressed && this._downPressed) return 0;
        if (this._upPressed) return 1;
        if (this._downPressed) return -1;

        // Тач как фолбэк
        if (this._touchActive) return this._touchDirection;

        return 0;
    }
}
