import type { Result } from '../../domain/result/Result.js';
import type { AppError } from '../../domain/app-error/AppError.js';
import type { ISaveRepository } from '../../domain/save/ISaveRepository.js';

/** TKT-M3-018: удаление слота (идемпотентно). */
export class DeleteSaveUseCase {
  constructor(private readonly repository: ISaveRepository) {}

  execute(slotId: string): Result<void, AppError> {
    return this.repository.delete(slotId);
  }
}
