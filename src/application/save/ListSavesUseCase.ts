import type { Result } from '../../domain/result/Result.js';
import type { AppError } from '../../domain/app-error/AppError.js';
import type { ISaveRepository, SaveSlotMeta } from '../../domain/save/ISaveRepository.js';

/** TKT-M3-018: список слотов сохранений. */
export class ListSavesUseCase {
  constructor(private readonly repository: ISaveRepository) {}

  execute(): Result<readonly SaveSlotMeta[], AppError> {
    return this.repository.list();
  }
}
