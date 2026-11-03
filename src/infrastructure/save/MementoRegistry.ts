import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IMementoProvider } from '../../domain/save/IMementoProvider.js';

/** TKT-M3-011: реестр memento-провайдеров. list() сортирован по domainId. */
export class MementoRegistry {
  private readonly providers = new Map<string, IMementoProvider>();

  register(provider: IMementoProvider): Result<void, AppError> {
    if (this.providers.has(provider.domainId)) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `Duplicate memento domainId: ${provider.domainId}`),
      );
    }
    this.providers.set(provider.domainId, provider);
    return ok(undefined);
  }

  list(): readonly IMementoProvider[] {
    return [...this.providers.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((id) => this.providers.get(id) as IMementoProvider);
  }

  get(domainId: string): Result<IMementoProvider, AppError> {
    const found = this.providers.get(domainId);
    if (!found) {
      return err(
        makeAppError('INFRA_CONTENT_NOT_FOUND', `Memento provider not found: ${domainId}`),
      );
    }
    return ok(found);
  }
}
