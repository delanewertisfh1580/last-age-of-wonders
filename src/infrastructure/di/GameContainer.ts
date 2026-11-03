import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { Brand } from '../../domain/brand/Brand.js';

/** TKT-M1-006: типизированный токен DI. */
export type ServiceToken<T> = string & Brand<'ServiceToken'> & { readonly __service?: T };

export function makeToken<T>(name: string): ServiceToken<T> {
  return name as ServiceToken<T>;
}

type Factory<T> = (c: GameContainer) => T;

/** TKT-M1-006: минимальный DI-контейнер (синглтоны, ленивая инициализация). */
export class GameContainer {
  private readonly factories = new Map<string, Factory<unknown>>();
  private readonly instances = new Map<string, unknown>();

  register<T>(token: ServiceToken<T>, factory: Factory<T>): void {
    this.factories.set(token, factory as Factory<unknown>);
  }

  has<T>(token: ServiceToken<T>): boolean {
    return this.factories.has(token);
  }

  resolve<T>(token: ServiceToken<T>): Result<T, AppError> {
    if (this.instances.has(token)) return ok(this.instances.get(token) as T);
    const factory = this.factories.get(token);
    if (!factory) {
      return err(
        makeAppError('INFRA_UNEXPECTED', `Service not registered: ${token}`, { token }),
      );
    }
    const instance = factory(this);
    if (!this.instances.has(token)) this.instances.set(token, instance);
    return ok(instance as T);
  }

  /** Сброс инстансов (для тестов). */
  reset(): void {
    this.instances.clear();
  }
}
