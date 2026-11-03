export type Brand<K extends string> = K & { readonly __brand?: K };

export type EntityId<T extends string> = string & { readonly __entityId?: T };
