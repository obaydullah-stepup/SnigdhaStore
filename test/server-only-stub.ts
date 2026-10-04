// Stub for the `server-only` package so server modules can be imported in
// unit tests. The real package throws unless imported from a React Server
// Component; under vitest's node environment there is no RSC boundary.
export {};
