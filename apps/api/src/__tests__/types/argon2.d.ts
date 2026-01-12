// Type stub for @node-rs/argon2 (for test compilation)
// This will be replaced with actual types when package is installed during implementation

declare module "@node-rs/argon2" {
  export interface Argon2Options {
    memoryCost?: number;
    timeCost?: number;
    outputLen?: number;
    parallelism?: number;
  }

  export function hash(
    password: string,
    options?: Argon2Options
  ): Promise<string>;

  export function verify(
    hash: string,
    password: string,
    options?: Argon2Options
  ): Promise<boolean>;
}
