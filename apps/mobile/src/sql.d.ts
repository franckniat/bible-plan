// Drizzle's migrations are .sql files, inlined as strings by Babel.
declare module "*.sql" {
  const sql: string
  export default sql
}
