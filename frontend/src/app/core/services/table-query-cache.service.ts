import { Injectable } from '@angular/core';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class TableQueryCacheService {
    private readonly store = new Map<string, CacheEntry<unknown>>();

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    set<T>(key: string, value: T, ttlMs: number) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
    }

    clearPrefix(prefix: string) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }

    clearAll() {
        this.store.clear();
    }
}
