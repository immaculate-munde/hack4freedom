declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(filename: string);
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    close(): void;
  }

  export interface SqliteStatement {
    run(...params: Array<string | number | null>): void;
    get(...params: Array<string | number | null>): unknown;
    all(...params: Array<string | number | null>): unknown[];
  }
}
