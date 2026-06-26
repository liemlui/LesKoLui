// Polyfill IndexedDB for vitest/jsdom environment
// This must run before any Dexie imports
import "fake-indexeddb/auto";