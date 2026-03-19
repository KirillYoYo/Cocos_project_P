import { ILevelConfig } from './ILevelConfig';
import { LEVEL_1 } from './Configs/Level1';

/**
 * Реестр всех уровней.
 * Для добавления уровня: создать Configs/LevelN.ts и зарегистрировать здесь.
 */

/** Карта: номер уровня → его конфиг */
const levels: Map<number, ILevelConfig> = new Map([
    [1, LEVEL_1],
    // [2, LEVEL_2],  // TODO: добавить при создании
    // [3, LEVEL_3],
]);

export class LevelRegistry {

    /** Получить конфиг уровня по номеру. Бросает ошибку если не найден. */
    static getConfig(levelNumber: number): ILevelConfig {
        const config = levels.get(levelNumber);
        if (!config) {
            throw new Error(`[LevelRegistry] Level ${levelNumber} not found`);
        }
        return config;
    }

    /** Общее количество зарегистрированных уровней */
    static getLevelCount(): number {
        return levels.size;
    }
}
